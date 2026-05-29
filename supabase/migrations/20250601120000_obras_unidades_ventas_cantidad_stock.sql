-- Unidades por obra (edición / saldo de ejemplares) y cantidad por venta; ajuste automático del saldo

alter table public.obras
  add column if not exists unidades_totales integer not null default 0,
  add column if not exists unidades_disponibles integer not null default 0;

alter table public.obras drop constraint if exists obras_unidades_chk;
alter table public.obras add constraint obras_unidades_chk check (
  unidades_totales >= 0
  and unidades_disponibles >= 0
  and unidades_disponibles <= unidades_totales
);

alter table public.ventas add column if not exists cantidad integer not null default 1;
alter table public.ventas drop constraint if exists ventas_cantidad_chk;
alter table public.ventas add constraint ventas_cantidad_chk check (cantidad > 0);

-- Orden de triggers BEFORE en ventas: trg_ventas_obra, luego trg_ventas_stock_bf, luego trg_ventas_updated (orden alfabético por nombre)
create or replace function public.ventas_before_stock_check ()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  oid uuid;
  t int;
  d int;
  c_new int;
  c_old int;
  o_old uuid;
  o_new uuid;
  d_new int;
begin
  if new.ejemplar_id is null then
    raise exception 'La venta debe indicar un ejemplar.';
  end if;

  if new.obra_id is null then
    select e.obra_id into new.obra_id from public.ejemplares e where e.id = new.ejemplar_id;
  end if;
  oid := new.obra_id;
  if oid is null then
    return new;
  end if;

  c_new := coalesce(new.cantidad, 1);
  if c_new < 1 then
    raise exception 'La cantidad debe ser al menos 1.';
  end if;

  select o.unidades_totales, o.unidades_disponibles into t, d from public.obras o where o.id = oid for update;
  if t <= 0 then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if d < c_new then
      raise exception 'No hay unidades disponibles para esta obra (quedan %).', d;
    end if;
    return new;
  end if;

  -- UPDATE
  c_old := coalesce(old.cantidad, 1);
  o_old := old.obra_id;
  if o_old is null and old.ejemplar_id is not null then
    select e.obra_id into o_old from public.ejemplares e where e.id = old.ejemplar_id;
  end if;

  o_new := new.obra_id;
  if o_new is null and new.ejemplar_id is not null then
    select e.obra_id into o_new from public.ejemplares e where e.id = new.ejemplar_id;
  end if;

  if o_old is not distinct from o_new and o_new is not null then
    select unidades_disponibles into d_new from public.obras where id = o_new for update;
    if d_new + c_old < c_new then
      raise exception 'No hay unidades disponibles para aumentar la cantidad de la venta (disponibles tras devolver la venta anterior: %).', d_new + c_old;
    end if;
  elsif o_new is not null then
    select unidades_disponibles into d_new from public.obras where id = o_new for update;
    if d_new < c_new then
      raise exception 'No hay unidades disponibles en la obra destino (quedan %).', d_new;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ventas_stock_bf on public.ventas;
create trigger trg_ventas_stock_bf before insert or update on public.ventas for each row execute function public.ventas_before_stock_check ();

create or replace function public.ventas_after_stock_adjust ()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  oid uuid;
  c int;
  o_old uuid;
  o_new uuid;
  c_old int;
  c_new int;
  t int;
begin
  if tg_op = 'INSERT' then
    c := coalesce(new.cantidad, 1);
    oid := new.obra_id;
    if oid is null and new.ejemplar_id is not null then
      select e.obra_id into oid from public.ejemplares e where e.id = new.ejemplar_id;
    end if;
    if oid is not null then
      select unidades_totales into t from public.obras where id = oid;
      if t > 0 then
        update public.obras set unidades_disponibles = unidades_disponibles - c where id = oid;
      end if;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    c := coalesce(old.cantidad, 1);
    oid := old.obra_id;
    if oid is null and old.ejemplar_id is not null then
      select e.obra_id into oid from public.ejemplares e where e.id = old.ejemplar_id;
    end if;
    if oid is not null then
      select unidades_totales into t from public.obras where id = oid;
      if t > 0 then
        update public.obras set unidades_disponibles = least(unidades_totales, unidades_disponibles + c) where id = oid;
      end if;
    end if;
    return old;
  elsif tg_op = 'UPDATE' then
    c_old := coalesce(old.cantidad, 1);
    c_new := coalesce(new.cantidad, 1);
    o_old := old.obra_id;
    if o_old is null and old.ejemplar_id is not null then
      select e.obra_id into o_old from public.ejemplares e where e.id = old.ejemplar_id;
    end if;
    o_new := new.obra_id;
    if o_new is null and new.ejemplar_id is not null then
      select e.obra_id into o_new from public.ejemplares e where e.id = new.ejemplar_id;
    end if;

    if o_old is not distinct from o_new then
      if o_old is null then
        return new;
      end if;
      select unidades_totales into t from public.obras where id = o_old;
      if t <= 0 then
        return new;
      end if;
      update public.obras set unidades_disponibles = least(unidades_totales, unidades_disponibles + c_old - c_new) where id = o_old;
    else
      if o_old is not null and (select unidades_totales from public.obras where id = o_old) > 0 then
        update public.obras set unidades_disponibles = least(unidades_totales, unidades_disponibles + c_old) where id = o_old;
      end if;
      if o_new is not null and (select unidades_totales from public.obras where id = o_new) > 0 then
        update public.obras set unidades_disponibles = unidades_disponibles - c_new where id = o_new;
      end if;
    end if;
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ventas_stock_af on public.ventas;
create trigger trg_ventas_stock_af after insert or update or delete on public.ventas for each row execute function public.ventas_after_stock_adjust ();
