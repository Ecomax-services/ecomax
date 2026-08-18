-- Libera a LEITURA dos catálogos para qualquer autenticado.
--
-- catalogo_itens é dado de referência consumido em selects e badges de vários
-- módulos (Estoque, Usuários, Operacional). Se a leitura exigir
-- has_module_perm('configuracoes','ler'), o formulário de produto quebra para
-- quem tem Estoque mas não tem Configurações. A ESCRITA continua restrita.

drop policy if exists catalogo_itens_select on public.catalogo_itens;
create policy catalogo_itens_select on public.catalogo_itens
  for select to authenticated using (true);
