-- Estado del ejemplar (incl. en préstamo) y tipo de cada anotación de sitio

alter table public.ejemplares
  add column if not exists estado text not null default 'disponible';

alter table public.ejemplares drop constraint if exists ejemplares_estado_chk;
alter table public.ejemplares add constraint ejemplares_estado_chk check (
  estado in ('disponible', 'en_prestamo', 'vendido')
);

comment on column public.ejemplares.estado is 'disponible | en_prestamo | vendido. «en_prestamo» = pieza prestada; «vendido» se actualiza con la venta.';

alter table public.ubicaciones_ejemplar
  add column if not exists tipo_movimiento text not null default 'cambio_sitio';

alter table public.ubicaciones_ejemplar drop constraint if exists ubicaciones_ejemplar_tipo_movimiento_chk;
alter table public.ubicaciones_ejemplar add constraint ubicaciones_ejemplar_tipo_movimiento_chk check (
  tipo_movimiento in ('cambio_sitio', 'prestamo', 'devolucion', 'otro')
);

comment on column public.ubicaciones_ejemplar.tipo_movimiento is 'prestamo = préstamo; devolucion = vuelta a la colección; cambio_sitio = otro traslado.';

-- Piezas con venta registrada → vendido
update public.ejemplares e
set estado = 'vendido'
where exists (select 1 from public.ventas v where v.ejemplar_id = e.id);

-- Antiguas anotaciones que parecen préstamo por texto
update public.ubicaciones_ejemplar u
set tipo_movimiento = 'prestamo'
where u.tipo_movimiento = 'cambio_sitio'
  and (
    lower(u.ubicacion) like '%prestamo%'
    or lower(u.ubicacion) like '%préstamo%'
    or lower(u.ubicacion) like '%prestado%'
    or lower(u.ubicacion) like '%prestada%'
    or lower(u.ubicacion) like '%loan%'
  );

-- Ventas: marcar ejemplar como vendido al insertar/actualizar; revertir al borrar o al quitar venta
create or replace function public.ventas_sync_ejemplar_estado ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.ejemplar_id is not null then
      update public.ejemplares set estado = 'vendido' where id = new.ejemplar_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.ejemplar_id is not null then
      if not exists (select 1 from public.ventas v where v.ejemplar_id = old.ejemplar_id) then
        update public.ejemplares set estado = 'disponible' where id = old.ejemplar_id;
      end if;
    end if;
    return old;
  elsif tg_op = 'UPDATE' then
    if old.ejemplar_id is distinct from new.ejemplar_id then
      if old.ejemplar_id is not null then
        if not exists (select 1 from public.ventas v where v.ejemplar_id = old.ejemplar_id and v.id <> old.id) then
          update public.ejemplares set estado = 'disponible' where id = old.ejemplar_id;
        end if;
      end if;
    end if;
    if new.ejemplar_id is not null then
      update public.ejemplares set estado = 'vendido' where id = new.ejemplar_id;
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_ventas_ejemplar_estado on public.ventas;
create trigger trg_ventas_ejemplar_estado
after insert or update or delete on public.ventas for each row
execute function public.ventas_sync_ejemplar_estado ();

-- Nueva anotación de sitio: préstamo o devolución actualiza estado del ejemplar
create or replace function public.ubicaciones_sync_ejemplar_estado ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.tipo_movimiento = 'prestamo' then
      update public.ejemplares set estado = 'en_prestamo' where id = new.ejemplar_id and estado <> 'vendido';
    elsif new.tipo_movimiento = 'devolucion' then
      update public.ejemplares set estado = 'disponible' where id = new.ejemplar_id and estado <> 'vendido';
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_ubicaciones_ejemplar_estado on public.ubicaciones_ejemplar;
create trigger trg_ubicaciones_ejemplar_estado
after insert on public.ubicaciones_ejemplar for each row
execute function public.ubicaciones_sync_ejemplar_estado ();
