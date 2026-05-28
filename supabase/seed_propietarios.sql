-- Tras crear las cuentas en Authentication (correo + contraseña), ejecute sustituyendo los correos reales:

-- update public.profiles
-- set is_owner = true
-- where id in (
--   select id from auth.users where email in (
--     'rafael@su-dominio.com',
--     'susana@su-dominio.com'
--   )
-- );

-- Opcional: asigne a Rafael y Susana todos los permisos explícitos (no es necesario si is_owner = true).
