-- Duas funções respondiam à mesma pergunta — "de quais clientes este usuário do
-- portal é?" — com regras diferentes:
--
--   my_portal_cliente_ids()  →  status <> 'inativo'   (usada pela lista de OS)
--   os_is_my_cliente()       →  status =  'ativo'     (usada por colaboradores,
--                                                      cronograma, relatórios e
--                                                      os arquivos no storage)
--
-- Quem está como 'convidado' cai no meio: vê as ordens de serviço e não vê nada
-- que dependa delas. Abre a OS e não consegue abrir o relatório dela, sem
-- nenhuma explicação na tela.
--
-- Encontrado testando o ciclo entre as três plataformas: OS-1007 concluída
-- aparecia para o cliente, e a tela Colaboradores seguia vazia com o técnico
-- vinculado.
--
-- A correção é ter uma definição só. `os_is_my_cliente` passa a perguntar a
-- `my_portal_cliente_ids()` em vez de repetir a regra — assim elas não voltam a
-- divergir na próxima mudança.
create or replace function os_is_my_cliente(_os_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.ordens_servico o
     where o.id = _os_id
       and o.cliente_id in (select public.my_portal_cliente_ids())
  );
$$;
