-- =============================================================================
-- Reparación: usuario en Auth sin fila en public.profiles
-- =============================================================================
-- Síntoma: en el diagnóstico, `p.is_owner` y `p.nombre_completo` salen NULL
-- (no es que is_owner sea null en la tabla: es que no existe la fila `p`).
--
-- 1) Crear perfiles que falten (todos los usuarios de Auth sin perfil)
-- -----------------------------------------------------------------------------
insert into public.profiles (id, nombre_completo, is_owner)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'nombre_completo', split_part(u.email, '@', 1)),
  false
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
--
-- 2) Luego marque propietarios (sustituya el correo)
-- -----------------------------------------------------------------------------
-- update public.profiles p
-- set is_owner = true
-- from auth.users u
-- where p.id = u.id and lower(u.email) = lower('test@test.com');
--
-- 3) Cerrar sesión en la app y volver a entrar.
