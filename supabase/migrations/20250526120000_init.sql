-- Inventario obras: esquema inicial, RLS, auditoría y almacenamiento
-- Ejecutar en Supabase SQL Editor o con: supabase db push

-- Tipos
create type public.nivel_permiso as enum ('ninguno', 'lectura', 'lectura_escritura');
create type public.recurso_sistema as enum (
  'obras',
  'ejemplares',
  'ventas',
  'ubicaciones_historial',
  'archivos',
  'importacion',
  'usuarios',
  'auditoria'
);
create type public.archivo_tipo as enum ('imagen_obra', 'imagen_ejemplar', 'pdf');

-- Perfiles (1:1 con auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre_completo text,
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permisos_usuario (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  recurso public.recurso_sistema not null,
  nivel public.nivel_permiso not null default 'ninguno',
  created_at timestamptz not null default now (),
  unique (user_id, recurso)
);

create table public.obras (
  id uuid primary key default gen_random_uuid (),
  numero_catalogo text not null unique,
  nombre text not null,
  anio integer,
  material text,
  tamano_text text,
  alto_cm numeric,
  ancho_cm numeric,
  profundo_cm numeric,
  edicion_text text,
  fundicion text,
  precio_neto_estimado numeric(14, 2),
  comentarios text,
  descripcion text,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create table public.ejemplares (
  id uuid primary key default gen_random_uuid (),
  obra_id uuid not null references public.obras (id) on delete cascade,
  etiqueta text,
  notas text,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create table public.ubicaciones_ejemplar (
  id uuid primary key default gen_random_uuid (),
  ejemplar_id uuid not null references public.ejemplares (id) on delete cascade,
  ubicacion text not null,
  fecha date not null,
  created_at timestamptz not null default now ()
);

create table public.ventas (
  id uuid primary key default gen_random_uuid (),
  ejemplar_id uuid references public.ejemplares (id) on delete set null,
  obra_id uuid references public.obras (id) on delete set null,
  fecha_venta date not null,
  importe numeric(14, 2),
  moneda text not null default 'EUR',
  comprador_nombre text,
  comprador_documento text,
  comprador_email text,
  comprador_telefono text,
  comprador_direccion text,
  galeria_intermediario text,
  numero_factura text,
  forma_pago text,
  notas_fiscales text,
  detalle text,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create table public.archivos (
  id uuid primary key default gen_random_uuid (),
  tipo public.archivo_tipo not null,
  obra_id uuid references public.obras (id) on delete cascade,
  ejemplar_id uuid references public.ejemplares (id) on delete cascade,
  ruta_storage text not null,
  nombre_original text,
  mime_type text,
  orden smallint not null default 0,
  created_at timestamptz not null default now (),
  constraint archivos_obra_ejemplar_chk check (
    (
      tipo in ('imagen_obra', 'pdf')
      and obra_id is not null
    )
    or (
      tipo = 'imagen_ejemplar'
      and obra_id is not null
      and ejemplar_id is not null
    )
  )
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid (),
  occurred_at timestamptz not null default now (),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  schema_name text not null default 'public',
  table_name text not null,
  record_id uuid,
  old_row jsonb,
  new_row jsonb
);

-- Índices útiles para filtros y búsqueda
create index idx_obras_nombre_lower on public.obras (lower(nombre));
create index idx_obras_anio on public.obras (anio);
create index idx_obras_material on public.obras (material);
create index idx_ejemplares_obra on public.ejemplares (obra_id);
create index idx_ubicaciones_ejemplar on public.ubicaciones_ejemplar (ejemplar_id, fecha desc);
create index idx_ventas_fecha on public.ventas (fecha_venta desc);
create index idx_ventas_obra on public.ventas (obra_id);
create index idx_audit_occurred on public.audit_log (occurred_at desc);

-- updated_at automático
create or replace function public.set_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at ();

create trigger trg_obras_updated before update on public.obras
for each row execute function public.set_updated_at ();

create trigger trg_ejemplares_updated before update on public.ejemplares
for each row execute function public.set_updated_at ();

create trigger trg_ventas_updated before update on public.ventas
for each row execute function public.set_updated_at ();

-- Propagar obra_id en ventas desde ejemplar
create or replace function public.ventas_set_obra_id ()
returns trigger
language plpgsql
as $$
begin
  if new.ejemplar_id is not null then
    select e.obra_id into new.obra_id from public.ejemplares e where e.id = new.ejemplar_id;
  end if;
  return new;
end;
$$;

create trigger trg_ventas_obra before insert or update on public.ventas
for each row execute function public.ventas_set_obra_id ();

-- Perfil al registrarse (propietarios se marcan a mano con SQL)
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre_completo, is_owner)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre_completo', split_part(new.email, '@', 1)),
    false
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users for each row
execute function public.handle_new_user ();

-- Permisos RLS helpers
create or replace function public.is_owner (uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.is_owner
      from public.profiles p
      where p.id = uid
    ),
    false
  );
$$;

create or replace function public.user_has_perm (p_uid uuid, p_recurso public.recurso_sistema, p_need text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner boolean;
  v_level public.nivel_permiso;
begin
  if p_uid is null then
    return false;
  end if;
  select public.is_owner (p_uid) into v_owner;
  if v_owner then
    return true;
  end if;
  select pu.nivel into v_level
  from public.permisos_usuario pu
  where pu.user_id = p_uid and pu.recurso = p_recurso;
  if v_level is null or v_level = 'ninguno' then
    return false;
  end if;
  if p_need = 'write' then
    return v_level = 'lectura_escritura';
  end if;
  return v_level in ('lectura', 'lectura_escritura');
end;
$$;

-- Auditoría
create or replace function public.audit_row ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  aid uuid := auth.uid ();
begin
  if TG_OP = 'DELETE' then
    insert into public.audit_log (actor_id, action, table_name, record_id, old_row)
    values (aid, 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb (OLD));
    return OLD;
  elsif TG_OP = 'UPDATE' then
    insert into public.audit_log (actor_id, action, table_name, record_id, old_row, new_row)
    values (aid, 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb (OLD), to_jsonb (NEW));
    return NEW;
  else
    insert into public.audit_log (actor_id, action, table_name, record_id, new_row)
    values (aid, 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb (NEW));
    return NEW;
  end if;
end;
$$;

create trigger trg_audit_obras after insert or update or delete on public.obras
for each row execute function public.audit_row ();

create trigger trg_audit_ejemplares after insert or update or delete on public.ejemplares
for each row execute function public.audit_row ();

create trigger trg_audit_ubicaciones after insert or update or delete on public.ubicaciones_ejemplar
for each row execute function public.audit_row ();

create trigger trg_audit_ventas after insert or update or delete on public.ventas
for each row execute function public.audit_row ();

create trigger trg_audit_archivos after insert or update or delete on public.archivos
for each row execute function public.audit_row ();

create trigger trg_audit_permisos after insert or update or delete on public.permisos_usuario
for each row execute function public.audit_row ();

create trigger trg_audit_profiles after insert or update or delete on public.profiles
for each row execute function public.audit_row ();

-- Habilitar RLS
alter table public.profiles enable row level security;
alter table public.permisos_usuario enable row level security;
alter table public.obras enable row level security;
alter table public.ejemplares enable row level security;
alter table public.ubicaciones_ejemplar enable row level security;
alter table public.ventas enable row level security;
alter table public.archivos enable row level security;
alter table public.audit_log enable row level security;

-- profiles
create policy "profiles_select" on public.profiles for select using (
  id = auth.uid ()
  or public.is_owner (auth.uid ())
);

create policy "profiles_update_self" on public.profiles for update using (id = auth.uid ()) with check (id = auth.uid ());

create policy "profiles_update_owner" on public.profiles for update using (public.is_owner (auth.uid ())) with check (true);

-- permisos_usuario: cada usuario lee los suyos; solo propietarios gestionan todo
create policy "permisos_select" on public.permisos_usuario for select using (
  public.is_owner (auth.uid ())
  or user_id = auth.uid ()
);

create policy "permisos_insert" on public.permisos_usuario for insert with check (public.is_owner (auth.uid ()));

create policy "permisos_update" on public.permisos_usuario for update using (public.is_owner (auth.uid ())) with check (public.is_owner (auth.uid ()));

create policy "permisos_delete" on public.permisos_usuario for delete using (public.is_owner (auth.uid ()));

-- obras
create policy "obras_select" on public.obras for select using (
  public.user_has_perm (auth.uid (), 'obras'::public.recurso_sistema, 'read')
);

create policy "obras_write" on public.obras for insert with check (
  public.user_has_perm (auth.uid (), 'obras'::public.recurso_sistema, 'write')
);

create policy "obras_update" on public.obras for update using (
  public.user_has_perm (auth.uid (), 'obras'::public.recurso_sistema, 'write')
) with check (
  public.user_has_perm (auth.uid (), 'obras'::public.recurso_sistema, 'write')
);

create policy "obras_delete" on public.obras for delete using (
  public.user_has_perm (auth.uid (), 'obras'::public.recurso_sistema, 'write')
);

-- ejemplares
create policy "ejemplares_select" on public.ejemplares for select using (
  public.user_has_perm (auth.uid (), 'ejemplares'::public.recurso_sistema, 'read')
);

create policy "ejemplares_write" on public.ejemplares for insert with check (
  public.user_has_perm (auth.uid (), 'ejemplares'::public.recurso_sistema, 'write')
);

create policy "ejemplares_update" on public.ejemplares for update using (
  public.user_has_perm (auth.uid (), 'ejemplares'::public.recurso_sistema, 'write')
) with check (
  public.user_has_perm (auth.uid (), 'ejemplares'::public.recurso_sistema, 'write')
);

create policy "ejemplares_delete" on public.ejemplares for delete using (
  public.user_has_perm (auth.uid (), 'ejemplares'::public.recurso_sistema, 'write')
);

-- ubicaciones
create policy "ubicaciones_select" on public.ubicaciones_ejemplar for select using (
  public.user_has_perm (auth.uid (), 'ubicaciones_historial'::public.recurso_sistema, 'read')
);

create policy "ubicaciones_write" on public.ubicaciones_ejemplar for insert with check (
  public.user_has_perm (auth.uid (), 'ubicaciones_historial'::public.recurso_sistema, 'write')
);

create policy "ubicaciones_update" on public.ubicaciones_ejemplar for update using (
  public.user_has_perm (auth.uid (), 'ubicaciones_historial'::public.recurso_sistema, 'write')
) with check (
  public.user_has_perm (auth.uid (), 'ubicaciones_historial'::public.recurso_sistema, 'write')
);

create policy "ubicaciones_delete" on public.ubicaciones_ejemplar for delete using (
  public.user_has_perm (auth.uid (), 'ubicaciones_historial'::public.recurso_sistema, 'write')
);

-- ventas
create policy "ventas_select" on public.ventas for select using (
  public.user_has_perm (auth.uid (), 'ventas'::public.recurso_sistema, 'read')
);

create policy "ventas_write" on public.ventas for insert with check (
  public.user_has_perm (auth.uid (), 'ventas'::public.recurso_sistema, 'write')
);

create policy "ventas_update" on public.ventas for update using (
  public.user_has_perm (auth.uid (), 'ventas'::public.recurso_sistema, 'write')
) with check (
  public.user_has_perm (auth.uid (), 'ventas'::public.recurso_sistema, 'write')
);

create policy "ventas_delete" on public.ventas for delete using (
  public.user_has_perm (auth.uid (), 'ventas'::public.recurso_sistema, 'write')
);

-- archivos
create policy "archivos_select" on public.archivos for select using (
  public.user_has_perm (auth.uid (), 'archivos'::public.recurso_sistema, 'read')
);

create policy "archivos_write" on public.archivos for insert with check (
  public.user_has_perm (auth.uid (), 'archivos'::public.recurso_sistema, 'write')
);

create policy "archivos_update" on public.archivos for update using (
  public.user_has_perm (auth.uid (), 'archivos'::public.recurso_sistema, 'write')
) with check (
  public.user_has_perm (auth.uid (), 'archivos'::public.recurso_sistema, 'write')
);

create policy "archivos_delete" on public.archivos for delete using (
  public.user_has_perm (auth.uid (), 'archivos'::public.recurso_sistema, 'write')
);

-- auditoría
create policy "audit_select" on public.audit_log for select using (
  public.user_has_perm (auth.uid (), 'auditoria'::public.recurso_sistema, 'read')
);

-- Bucket de almacenamiento (privado)
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

create policy "media_select" on storage.objects for select to authenticated using (
  bucket_id = 'media'
  and public.user_has_perm (auth.uid (), 'archivos'::public.recurso_sistema, 'read')
);

create policy "media_insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'media'
  and public.user_has_perm (auth.uid (), 'archivos'::public.recurso_sistema, 'write')
);

create policy "media_update" on storage.objects for update to authenticated using (
  bucket_id = 'media'
  and public.user_has_perm (auth.uid (), 'archivos'::public.recurso_sistema, 'write')
) with check (
  bucket_id = 'media'
  and public.user_has_perm (auth.uid (), 'archivos'::public.recurso_sistema, 'write')
);

create policy "media_delete" on storage.objects for delete to authenticated using (
  bucket_id = 'media'
  and public.user_has_perm (auth.uid (), 'archivos'::public.recurso_sistema, 'write')
);

-- Permisos de API (roles de Supabase)
grant usage on schema public to postgres, anon, authenticated, service_role;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.permisos_usuario to authenticated;
grant select, insert, update, delete on table public.obras to authenticated;
grant select, insert, update, delete on table public.ejemplares to authenticated;
grant select, insert, update, delete on table public.ubicaciones_ejemplar to authenticated;
grant select, insert, update, delete on table public.ventas to authenticated;
grant select, insert, update, delete on table public.archivos to authenticated;
grant select on table public.audit_log to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
