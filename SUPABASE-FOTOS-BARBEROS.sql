-- ============================================================
-- BARBER BLACKYWHITE - FOTOS DE PERFIL DE BARBEROS
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- 1) Guardar la URL de la foto en la tabla de barberos.
alter table public.barbers
add column if not exists photo_url text;

-- 2) Crear el bucket privado para las operaciones del panel,
--    pero con archivos públicos para que las fotos se puedan
--    mostrar en la web mediante su URL.
insert into storage.buckets (id, name, public)
values ('barber-profiles', 'barber-profiles', true)
on conflict (id) do update set public = true;

-- 3) Solo administradores pueden subir, reemplazar y borrar fotos.
drop policy if exists "admin_barber_photos_insert" on storage.objects;
drop policy if exists "admin_barber_photos_update" on storage.objects;
drop policy if exists "admin_barber_photos_delete" on storage.objects;

create policy "admin_barber_photos_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'barber-profiles'
  and exists (
    select 1 from public.admin_users x
    where x.user_id = auth.uid()
  )
);

create policy "admin_barber_photos_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'barber-profiles'
  and exists (
    select 1 from public.admin_users x
    where x.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'barber-profiles'
  and exists (
    select 1 from public.admin_users x
    where x.user_id = auth.uid()
  )
);

create policy "admin_barber_photos_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'barber-profiles'
  and exists (
    select 1 from public.admin_users x
    where x.user_id = auth.uid()
  )
);

-- 4) Permisos para actualizar photo_url desde el panel.
grant update on public.barbers to authenticated;
