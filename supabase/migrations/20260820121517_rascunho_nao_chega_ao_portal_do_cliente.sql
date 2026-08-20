-- Rascunho de OS aparecia no Portal do Cliente.
--
-- A correção anterior (20260820002229) barrou rascunho para o operador, mexendo
-- em `os_is_mine`. O cliente entra por outro caminho — `my_portal_cliente_ids()`
-- na policy `os_cliente_select` — e esse ficou aberto.
--
-- É a mesma regra, e aqui pesa mais: o operador é da casa, o cliente é de fora.
-- Uma OS que o Backoffice ainda está montando não deve chegar a quem contratou o
-- serviço — ela muda de escopo, de data e de preço antes de estar pronta.
--
-- Verificado no ambiente: o cliente via OS-1011 e OS-1012, ambas rascunho.

drop policy if exists os_cliente_select on ordens_servico;

create policy os_cliente_select on ordens_servico
  for select
  using (
    not rascunho
    and cliente_id in (select my_portal_cliente_ids())
  );
