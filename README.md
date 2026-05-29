# Inventario de obras

Aplicación web privada para gestionar la colección (obras, ejemplares, ubicaciones, ventas, archivos y auditoría). Pensada para **lectura clara** y **pocos pasos** en pantallas habituales.

## Stack


| Capa            | Tecnología                                                                  |
| --------------- | --------------------------------------------------------------------------- |
| Frontend        | **Next.js 16** (App Router), **React 19**, **Tailwind CSS 4**               |
| Backend / datos | **Supabase** (Postgres, Auth email/contraseña, Row Level Security, Storage) |
| Tipografía      | **Source Sans 3** (Google Fonts), tamaño base grande                        |


## Cómo está montado

1. **Autenticación**: Supabase Auth con correo y contraseña (el “usuario” de acceso es el correo). La sesión se mantiene con cookies vía `@supabase/ssr` (middleware + servidor).
2. **Autorización**: Políticas **RLS** en Postgres. Los **propietarios** (`profiles.is_owner`) tienen acceso total. El resto recibe permisos por recurso (`permisos_usuario`: sin acceso, solo lectura, o lectura y escritura).
3. **Modelo de datos** (resumen):
  - `obras`: ficha por **nº de catálogo** único; precio neto estimado; **número de ejemplares de la edición** (`unidades_totales` / `unidades_disponibles`), opcional; medidas en texto y, opcionalmente, **alto/ancho/profundo en cm** para filtros (p. ej. «más de 10 m» → 1000 cm en altura mínima). Opcionalmente **`public_ficha_token`**: enlace secreto `/p/[token]` sin login para una vista pública limitada (QR en ficha de obra).
  - `ejemplares`: copias de una obra; fotos propias (hasta 5); **estado** `disponible` | `en_prestamo` | `vendido` (las ventas marcan «vendido»; una anotación de sitio de tipo préstamo o devolución actualiza el estado).
  - `ubicaciones_ejemplar`: historial de **dónde está** cada ejemplar con **fecha** y **tipo de movimiento** (`cambio_sitio`, `prestamo`, `devolucion`, `otro`).
  - `ventas`: registro detallado ligado al ejemplar (comprador, galería, factura, pago, notas…) con **cantidad**; si la obra tiene fijado un número de ejemplares de la edición mayor que cero, los triggers en Postgres comprueban el saldo y actualizan `unidades_disponibles`. El umbral de «quedan pocas unidades» en el listado de obras está en `src/lib/stock-umbral.ts` (`UMBRAL_STOCK_BAJO`, por defecto 5).
  - `archivos`: metadatos de ficheros en el bucket privado `media` (imágenes de obra, de ejemplar o PDF).
  - `audit_log`: **quién**, **cuándo**, **qué tabla** y **valores** antes/después (triggers en servidor).
4. **Alta de usuarios**: solo propietarios. En **Usuarios** pueden crear **otro propietario** (acceso total, incluida esta pantalla) o una cuenta de **equipo** (secretaría, empleados) eligiendo por cada área solo lectura o lectura y escritura; hay plantillas rápidas. La ruta `POST /api/admin/invite` usa la **service role key** en servidor (nunca en el cliente).
5. **Cambio de permisos**: en **Usuarios → Editar** (`/admin/usuarios/[id]`) los propietarios actualizan la matriz; se sustituyen las filas en `permisos_usuario` (cuentas con `is_owner` no usan filas de permisos).
6. **Importación CSV**: acción `importarCsv` (propietarios o permiso “Importación” en **escritura**). Plantilla: `public/plantilla-importacion.csv`.
7. **Dashboard** (`/dashboard`): estado actual de las piezas (disponibles / en préstamo / vendidas), ventas en euros, tablas de **ventas** y **préstamos** por mes y por año, y lista de ventas del año. La ruta antigua `/contabilidad` redirige aquí. Mismo permiso que **Ventas**; el alta de ventas está en **`/ventas/nueva`**.

## Puesta en marcha

1. Cree un proyecto en [Supabase](https://supabase.com) y ejecute las migraciones en `supabase/migrations/` en orden (p. ej. `20250526120000_init.sql`, `20250601120000_obras_unidades_ventas_cantidad_stock.sql`, `20250603120000_ejemplar_estado_ubicacion_tipo.sql`, `20260203120000_obras_public_ficha_token.sql` para token de ficha pública/QR, etc.), vía SQL Editor o CLI `supabase db push`.
2. En **Authentication → Users**, cree al menos una cuenta (p. ej. `test@test.com` en desarrollo, o las cuentas reales en producción).
3. **Obligatorio — primer propietario:** al registrarse, la base crea el perfil con `is_owner = false` y sin permisos; la pantalla «Sin permiso» es esperable hasta que exista **al menos un propietario**, y eso solo se hace con SQL (la app no puede auto-promover a nadie). En **Supabase → SQL Editor**, ejecute sustituyendo el correo (plantillas en `supabase/seed_propietarios.sql`):

   ```sql
   update public.profiles
   set is_owner = true
   where id = (select id from auth.users where email = 'test@test.com' limit 1);
   ```

   Luego cierre sesión en la app y vuelva a entrar (o recargue). Tendrá acceso completo, incluido **Usuarios** para invitar al resto y asignar permisos por recurso.
4. Copie `.env.example` a **`.env.local`** en la **carpeta del proyecto** (junto a `package.json`) y rellene la URL de proyecto y las claves desde Supabase → **Project Settings → API** (o **API Keys**): puede usar la clave **publicable** (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, formato `sb_publishable_…`) o la **anon** legacy (`NEXT_PUBLIC_SUPABASE_ANON_KEY`); en servidor, `SUPABASE_SERVICE_ROLE_KEY` o la **secret** nueva (`SUPABASE_SECRET_KEY`). La **ficha pública por QR** (`/p/[token]`) usa la clave de servidor para leer la obra sin sesión; opcionalmente defina `NEXT_PUBLIC_APP_URL` para que el enlace del QR coincida con el dominio público (Vercel, etc.).
5. `npm install` y `npm run dev` (si cambia `.env.local`, vuelva a arrancar el servidor).

Despliegue recomendado: **Vercel** (frontend) + proyecto Supabase ya enlazado.

### Vercel: variables y redeploy

1. En el proyecto de Vercel → **Settings** → **Environment Variables**, cree al menos:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - Una clave pública: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` **o** `NEXT_PUBLIC_SUPABASE_ANON_KEY` (cualquiera de los dos nombres; el valor lo copia del panel de Supabase).
  - Una clave de servidor: `SUPABASE_SERVICE_ROLE_KEY` **o** `SUPABASE_SECRET_KEY` (la usa el servidor al invitar usuarios; no va al cliente).
2. Marque al menos **Production** (y **Preview** si usa ramas / previews).
3. **Redeploy obligatorio**: las variables `NEXT_PUBLIC_*` se “hornan” en el JavaScript en el momento del **build**. Si las añadió después del último deploy, el sitio publicado sigue sin ellas hasta que haga **Deployments → … → Redeploy** (o un commit nuevo que dispare build).
4. En Supabase → **Authentication** → **URL configuration**, añada su dominio de Vercel (`https://su-app.vercel.app`) en **Site URL** y en **Redirect URLs**.

## Chat con IA y coste

- Un **chat con IA** sobre la colección implica llamadas a un modelo (OpenAI, Anthropic, etc.) y **sí tiene coste** por tokens; además exige diseño cuidadoso (no inventar datos, usar herramientas de consulta SQL/API).
- En esta versión se priorizó **búsqueda y filtros sin coste extra**: texto, años, material y **altura mínima en cm** en la lista de obras, más filtros en ventas.

## Changelog (producto / ingeniería)


| Fecha      | Cambios                                                                                                                                                                                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-29 | Usuarios: Editar/Eliminar, nombre y API delete; historial legible; **historial**: filtro por texto (subcadena), por usuario, tabla con scroll y cabecera fija. |
| 2026-05-27 | Permisos: matriz por recurso en UI, edición tras alta (`/admin/usuarios/[id]`), navegación y rutas según lectura/escritura, página `/sin-acceso`, formularios en solo lectura con `fieldset disabled`, importación solo con permiso de importación en escritura. |
| 2026-05-26 | Versión inicial: esquema Supabase con RLS y auditoría; Next.js (obras, ejemplares, ubicaciones, ventas, archivos, import CSV, usuarios propietarios, historial); README y plantilla CSV.                                                                         |


*(Añada aquí una línea por cada entrega relevante: modelo de datos, pantallas, seguridad, despliegue, etc.)*

## Confidencialidad

- No suba `.env.local` ni la **service role** a repositorios públicos.
- El bucket `media` es **privado**; las miniaturas usan URL firmada de corta duración en el servidor.

## Scripts

- `npm run dev` — desarrollo
- `npm run build` — comprobación de producción
- `npm run start` — servidor tras `build`

## Si el login falla con `placeholder.supabase.co` o ERR_NAME_NOT_RESOLVED

Eso indica que **Next no está leyendo tu proyecto de Supabase**. El archivo **`.env.local`** debe estar en la misma carpeta que **`package.json`** (la raíz del repositorio clonado, no el escritorio ni un padre). Después de crear o editar `.env.local`, **reinicie** `npm run dev`.

Si en Supabase el diagnóstico muestra **sin fila en `profiles`** (columnas de `p` en NULL), ejecute antes `supabase/repair_perfiles_faltantes.sql` y luego el `update` de propietario en `supabase/seed_propietarios.sql`.