-- Quien puede leer una obra debe poder listar sus ejemplares en la ficha,
-- aunque no tenga fila explícita de permiso en el recurso «ejemplares».
-- La subconsulta a `obras` sigue aplicando la política RLS de obras.

drop policy if exists "ejemplares_select" on public.ejemplares;

create policy "ejemplares_select" on public.ejemplares for select using (
  public.user_has_perm (auth.uid (), 'ejemplares'::public.recurso_sistema, 'read')
  or exists (
    select 1
    from public.obras o
    where o.id = obra_id
  )
);
