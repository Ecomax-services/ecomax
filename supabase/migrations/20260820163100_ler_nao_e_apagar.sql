-- Três tabelas tinham uma policy só, `FOR ALL`, com o mesmo desenho:
--
--   using      → has_module_perm(<modulo>, 'ler')
--   with check → has_module_perm(<modulo>, 'editar')
--
-- Parece equilibrado, e não é. `WITH CHECK` só vale para INSERT e UPDATE; em
-- DELETE o Postgres avalia apenas o `USING`. Quem tinha permissão de **leitura**
-- podia **apagar**.
--
-- Com os perfis que já existem no sistema:
--
--   Operacional  lê Gestão de Clientes sem editar → apagava itens de orçamento
--                (e o trigger `recalcular_total_orcamento` mudava o valor junto)
--                e documentos de cliente;
--   Gestor       lê Gestão de Usuários sem editar → apagava ASO e CNH de
--                qualquer colaborador. Depois da regra de bloqueio por
--                documento, isso tira o técnico das novas OS sem que ninguém
--                entenda o motivo.
--
-- As demais tabelas dos mesmos módulos já separam leitura de escrita. Estas
-- três passam a seguir o mesmo desenho.

drop policy if exists orcamento_itens_all on public.orcamento_itens;

create policy orcamento_itens_select on public.orcamento_itens
  for select using (has_module_perm('gestao_clientes','ler'));
create policy orcamento_itens_insert on public.orcamento_itens
  for insert with check (has_module_perm('gestao_clientes','editar'));
create policy orcamento_itens_update on public.orcamento_itens
  for update using (has_module_perm('gestao_clientes','editar'))
           with check (has_module_perm('gestao_clientes','editar'));
create policy orcamento_itens_delete on public.orcamento_itens
  for delete using (has_module_perm('gestao_clientes','editar'));

drop policy if exists cliente_docs_admin_all on public.cliente_documentos;

create policy cliente_docs_select on public.cliente_documentos
  for select using (has_module_perm('gestao_clientes','ler'));
create policy cliente_docs_insert on public.cliente_documentos
  for insert with check (has_module_perm('gestao_clientes','editar'));
create policy cliente_docs_update on public.cliente_documentos
  for update using (has_module_perm('gestao_clientes','editar'))
           with check (has_module_perm('gestao_clientes','editar'));
create policy cliente_docs_delete on public.cliente_documentos
  for delete using (has_module_perm('gestao_clientes','editar'));

drop policy if exists func_docs_admin_all on public.funcionario_documentos;

create policy func_docs_select on public.funcionario_documentos
  for select using (has_module_perm('gestao_usuarios','ler'));
create policy func_docs_insert on public.funcionario_documentos
  for insert with check (has_module_perm('gestao_usuarios','editar'));
create policy func_docs_update on public.funcionario_documentos
  for update using (has_module_perm('gestao_usuarios','editar'))
           with check (has_module_perm('gestao_usuarios','editar'));
create policy func_docs_delete on public.funcionario_documentos
  for delete using (has_module_perm('gestao_usuarios','editar'));
