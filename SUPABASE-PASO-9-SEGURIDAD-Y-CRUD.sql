-- ============================================================
-- BARBER BLACKYWHITE - PASO 9
-- SEGURIDAD REAL DEL PANEL + EDICIÓN DE BARBEROS/SERVICIOS
-- ============================================================
-- 1) Cambia TU_CORREO_ADMIN por el correo que creaste en
--    Authentication > Users.
-- 2) Ejecuta este archivo completo.
-- 3) El panel comprobará que el usuario realmente pertenece
--    a admin_users antes de mostrar el contenido.
-- ============================================================

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Registra al usuario administrador.
insert into public.admin_users(user_id)
select id from auth.users
where lower(email)=lower('TU_CORREO_ADMIN')
on conflict (user_id) do nothing;

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_self_read" on public.admin_users;
create policy "admin_users_self_read"
on public.admin_users for select to authenticated
using (user_id = auth.uid());

grant usage on schema public to anon, authenticated;
grant select on public.admin_users to authenticated;

-- Tablas protegidas: solo usuarios registrados en admin_users.
alter table public.appointments enable row level security;
alter table public.clients enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;

drop policy if exists "admin_select_appointments" on public.appointments;
drop policy if exists "admin_update_appointments" on public.appointments;
drop policy if exists "admin_delete_appointments" on public.appointments;
drop policy if exists "admin_select_clients" on public.clients;
drop policy if exists "admin_select_barbers" on public.barbers;
drop policy if exists "admin_select_services" on public.services;
drop policy if exists "admin_barbers_insert" on public.barbers;
drop policy if exists "admin_barbers_update" on public.barbers;
drop policy if exists "admin_services_insert" on public.services;
drop policy if exists "admin_services_update" on public.services;
drop policy if exists "public_active_barbers" on public.barbers;
drop policy if exists "public_active_services" on public.services;

create policy "admin_select_appointments" on public.appointments for select to authenticated
using (exists(select 1 from public.admin_users x where x.user_id=auth.uid()));
create policy "admin_update_appointments" on public.appointments for update to authenticated
using (exists(select 1 from public.admin_users x where x.user_id=auth.uid()))
with check (exists(select 1 from public.admin_users x where x.user_id=auth.uid()));
create policy "admin_delete_appointments" on public.appointments for delete to authenticated
using (exists(select 1 from public.admin_users x where x.user_id=auth.uid()));

create policy "admin_select_clients" on public.clients for select to authenticated
using (exists(select 1 from public.admin_users x where x.user_id=auth.uid()));

-- La web pública necesita leer únicamente barberos y servicios activos.
create policy "public_active_barbers" on public.barbers for select to anon, authenticated
using (active=true or exists(select 1 from public.admin_users x where x.user_id=auth.uid()));
create policy "public_active_services" on public.services for select to anon, authenticated
using (active=true or exists(select 1 from public.admin_users x where x.user_id=auth.uid()));

create policy "admin_select_barbers" on public.barbers for select to authenticated
using (exists(select 1 from public.admin_users x where x.user_id=auth.uid()));
create policy "admin_select_services" on public.services for select to authenticated
using (exists(select 1 from public.admin_users x where x.user_id=auth.uid()));

create policy "admin_barbers_insert" on public.barbers for insert to authenticated
with check (exists(select 1 from public.admin_users x where x.user_id=auth.uid()));
create policy "admin_barbers_update" on public.barbers for update to authenticated
using (exists(select 1 from public.admin_users x where x.user_id=auth.uid()))
with check (exists(select 1 from public.admin_users x where x.user_id=auth.uid()));

create policy "admin_services_insert" on public.services for insert to authenticated
with check (exists(select 1 from public.admin_users x where x.user_id=auth.uid()));
create policy "admin_services_update" on public.services for update to authenticated
using (exists(select 1 from public.admin_users x where x.user_id=auth.uid()))
with check (exists(select 1 from public.admin_users x where x.user_id=auth.uid()));

grant select on public.appointments, public.clients to authenticated;
grant update, delete on public.appointments to authenticated;
grant select, insert, update on public.barbers, public.services to authenticated;
grant select on public.barbers, public.services to anon;

-- No se concede INSERT público para citas: las reservas continúan
-- pasando por book_appointment() del PASO 7.
