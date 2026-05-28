# Sistema Canogar — Inventario de obras

Aplicación web privada para gestionar la colección (obras, ejemplares, ubicaciones, ventas, archivos y auditoría). Pensada para **lectura clara** y **pocos pasos** en pantallas habituales.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | **Next.js 16** (App Router), **React 19**, **Tailwind CSS 4** |
| Backend / datos | **Supabase** (Postgres, Auth email/contraseña, Row Level Security, Storage) |
| Tipografía | **Source Sans 3** (Google Fonts), tamaño base grande |

## Cómo está montado

1. **Autenticación**: Supabase Auth con correo y contraseña (el “usuario” de acceso es el correo). La sesión se mantiene con cookies vía `@supabase/ssr` (middleware + servidor).
2. **Autorización**: Políticas **RLS** en Postgres. Los **propietarios** (`profiles.is_owner`) tienen acceso total. El resto recibe permisos por recurso (`permisos_usuario`: sin acceso, solo lectura, o lectura y escritura).
3. **Modelo de datos** (resumen):
   - `obras`: ficha por **nº de catálogo** único; precio neto estimado; medidas en texto y, opcionalmente, **alto/ancho/profundo en cm** para filtros (p. ej. “más de 10 m” → 1000 cm en altura mínima).
   - `ejemplares`: copias de una obra; fotos propias (hasta 5).
   - `ubicaciones_ejemplar`: historial de **dónde está** cada ejemplar con **fecha** (préstamo, galería, estudio, etc.).
   - `ventas`: registro detallado ligado al ejemplar (comprador, galería, factura, pago, notas…).
   - `archivos`: metadatos de ficheros en el bucket privado `media` (imágenes de obra, de ejemplar o PDF).
   - `audit_log`: **quién**, **cuándo**, **qué tabla** y **valores** antes/después (triggers en servidor).
4. **Alta de usuarios**: solo propietarios. La ruta `POST /api/admin/invite` usa la **service role key** en servidor para crear el usuario en Auth y filas de permisos (nunca exponga esa clave al navegador).
5. **Cambio de permisos**: en **Usuarios → Editar** (`/admin/usuarios/[id]`) los propietarios actualizan la matriz; se sustituyen las filas en `permisos_usuario` (cuentas con `is_owner` no usan filas de permisos).
6. **Importación CSV**: acción `importarCsv` (propietarios o permiso “Importación” en **escritura**). Plantilla: `public/plantilla-importacion.csv`.

## Puesta en marcha

1. Cree un proyecto en [Supabase](https://supabase.com) y ejecute el SQL de `supabase/migrations/20250526120000_init.sql` (SQL Editor o CLI `supabase db push`).
2. En **Authentication → Users**, cree las cuentas (p. ej. Rafael y Susana) con correo y contraseña.
3. Ejecute el SQL comentado en `supabase/seed_propietarios.sql` para marcar `is_owner = true` a esos correos.
4. Copie `.env.example` a `.env.local` y rellene URL, `anon` y `service_role`.
5. `npm install` y `npm run dev`.

Despliegue recomendado: **Vercel** (frontend) + proyecto Supabase ya enlazado.

## Chat con IA y coste

- Un **chat con IA** sobre la colección implica llamadas a un modelo (OpenAI, Anthropic, etc.) y **sí tiene coste** por tokens; además exige diseño cuidadoso (no inventar datos, usar herramientas de consulta SQL/API).
- En esta versión se priorizó **búsqueda y filtros sin coste extra**: texto, años, material y **altura mínima en cm** en la lista de obras, más filtros en ventas.

## Changelog (producto / ingeniería)

| Fecha | Cambios |
|-------|---------|
| 2026-05-27 | Permisos: matriz por recurso en UI, edición tras alta (`/admin/usuarios/[id]`), navegación y rutas según lectura/escritura, página `/sin-acceso`, formularios en solo lectura con `fieldset disabled`, importación solo con permiso de importación en escritura. |
| 2026-05-26 | Versión inicial: esquema Supabase con RLS y auditoría; Next.js (obras, ejemplares, ubicaciones, ventas, archivos, import CSV, usuarios propietarios, historial); README y plantilla CSV. |

*(Añada aquí una línea por cada entrega relevante: modelo de datos, pantallas, seguridad, despliegue, etc.)*

## Confidencialidad

- No suba `.env.local` ni la **service role** a repositorios públicos.
- El bucket `media` es **privado**; las miniaturas usan URL firmada de corta duración en el servidor.

## Scripts

- `npm run dev` — desarrollo
- `npm run build` — comprobación de producción
- `npm run start` — servidor tras `build`
