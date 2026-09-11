-- ============================================================
-- BARBER BLACKYWHITE - PASO 7
-- RESERVAS ONLINE + HORARIOS POR MINUTO
-- Ejecutar en Supabase > SQL Editor > New Query
-- ============================================================

-- Esta función devuelve únicamente las horas disponibles para un barbero.
create or replace function public.get_available_slots(
  p_barber_id uuid,
  p_date date,
  p_duration integer
)
returns table(slot time)
language sql
security definer
set search_path = public
as $$
  with minutes as (
    select make_time(h, m, 0) as slot
    from generate_series(9, 17) h
    cross join generate_series(0, 59) m
  ), valid_ranges as (
    select slot
    from minutes
    where (slot >= time '09:00' and slot + make_interval(mins => p_duration) <= time '12:00')
       or (slot >= time '13:00' and slot + make_interval(mins => p_duration) <= time '18:00')
  )
  select slot
  from valid_ranges v
  where not exists (
    select 1
    from public.appointments a
    join public.services s on s.id = a.service_id
    where a.barber_id = p_barber_id
      and a.appointment_date = p_date
      and coalesce(a.status, 'pending') <> 'cancelled'
      and v.slot < a.appointment_time + make_interval(mins => coalesce(s.duration, 30))
      and a.appointment_time < v.slot + make_interval(mins => p_duration)
  )
  order by slot;
$$;

-- Esta función crea o reutiliza el cliente y guarda la cita de forma segura.
create or replace function public.book_appointment(
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_barber_id uuid,
  p_service_id uuid,
  p_date date,
  p_time time,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_duration integer;
  v_new_id uuid;
  v_end time;
  v_conflict boolean;
begin
  if trim(coalesce(p_client_name,'')) = '' or trim(coalesce(p_client_phone,'')) = '' then
    raise exception 'DATOS_CLIENTE_INVALIDOS';
  end if;

  select coalesce(duration,30) into v_duration
  from public.services
  where id=p_service_id and active=true;

  if v_duration is null then raise exception 'SERVICIO_INVALIDO'; end if;

  if not exists(select 1 from public.barbers where id=p_barber_id and active=true) then
    raise exception 'BARBERO_INVALIDO';
  end if;

  v_end := p_time + make_interval(mins => v_duration);
  if not ((p_time >= time '09:00' and v_end <= time '12:00') or (p_time >= time '13:00' and v_end <= time '18:00')) then
    raise exception 'FUERA_DE_HORARIO';
  end if;

  -- Bloquea las citas del mismo barbero/día durante la comprobación.
  perform pg_advisory_xact_lock(hashtext(p_barber_id::text || p_date::text));

  select exists(
    select 1
    from public.appointments a
    join public.services s on s.id=a.service_id
    where a.barber_id=p_barber_id
      and a.appointment_date=p_date
      and coalesce(a.status,'pending') <> 'cancelled'
      and p_time < a.appointment_time + make_interval(mins => coalesce(s.duration,30))
      and a.appointment_time < v_end
  ) into v_conflict;

  if v_conflict then raise exception 'HORARIO_OCUPADO'; end if;

  insert into public.clients(name,phone,email)
  values(trim(p_client_name),trim(p_client_phone),nullif(trim(coalesce(p_client_email,'')),''))
  on conflict(phone) do update
    set name=excluded.name,
        email=coalesce(excluded.email, public.clients.email)
  returning id into v_client_id;

  insert into public.appointments(
    client_id,barber_id,service_id,appointment_date,appointment_time,status,notes
  ) values (
    v_client_id,p_barber_id,p_service_id,p_date,p_time,'pending',p_notes
  ) returning id into v_new_id;

  return v_new_id;
end;
$$;

-- Permitir ejecutar las funciones desde la página pública.
grant execute on function public.get_available_slots(uuid,date,integer) to anon, authenticated;
grant execute on function public.book_appointment(text,text,text,uuid,uuid,date,time,text) to anon, authenticated;


-- PERMISOS ADICIONALES PARA LA API
grant usage on schema public to anon, authenticated;
