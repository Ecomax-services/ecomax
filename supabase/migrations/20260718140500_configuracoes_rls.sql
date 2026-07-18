-- RLS de catalogo_itens.
-- Leitura: liberada a qualquer autenticado (catálogos são dados de referência
-- consumidos por vários módulos em selects/badges).
-- Escrita (insert/update/delete): restrita a quem tem permissão em 'configuracoes'.
create policy catalogo_itens_select on public.catalogo_itens
  for select to authenticated using (true);
create policy catalogo_itens_insert on public.catalogo_itens
  for insert to authenticated with check (public.has_module_perm('configuracoes', 'criar'));
create policy catalogo_itens_update on public.catalogo_itens
  for update to authenticated
  using (public.has_module_perm('configuracoes', 'editar'))
  with check (public.has_module_perm('configuracoes', 'editar'));
create policy catalogo_itens_delete on public.catalogo_itens
  for delete to authenticated using (public.has_module_perm('configuracoes', 'excluir'));
