-- ============================================================
-- BARBER BLACKYWHITE - PASO 8
-- ACCESO SEGURO AL PANEL ADMINISTRATIVO
-- ============================================================
-- IMPORTANTE:
-- 1) Primero crea el usuario administrador en Supabase:
--    Authentication > Users > Add user > Create new user.
-- 2) Usa el mismo correo y contraseña para entrar en admin.html.
-- 3) Ejecuta este SQL después de crear el usuario.
--
-- Estas políticas permiten que SOLO usuarios autenticados
-- puedan consultar/modificar los datos desde el panel.
-- La página pública sigue usando las funciones RPC del PASO 7
-- para registrar reservas.

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

create policy "admin_select_appointments"
on public.appointments for select to authenticated
using (true);

create policy "admin_update_appointments"
on public.appointments for update to authenticated
using (true) with check (true);

create policy "admin_delete_appointments"
on public.appointments for delete to authenticated
using (true);

create policy "admin_select_clients"
on public.clients for select to authenticated
using (true);

create policy "admin_select_barbers"
on public.barbers for select to authenticated
using (true);

create policy "admin_select_services"
on public.services for select to authenticated
using (true);

-- El panel no necesita INSERT directo para las citas de clientes.
-- Las reservas públicas continúan entrando mediante book_appointment().
