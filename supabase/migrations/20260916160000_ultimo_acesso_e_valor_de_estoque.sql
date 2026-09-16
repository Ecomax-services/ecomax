-- ============================================================================
-- Duas colunas do protótipo que precisavam de dado que a API não expunha
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Última atividade na lista de Gestão de Usuários
-- ----------------------------------------------------------------------------
-- O protótipo mostra "Hoje, 08:12" / "Ontem, 17:02" por funcionário. O dado é
-- `auth.users.last_sign_in_at`, que o cliente não lê direto.
--
-- Já existia `acesso_status(uuid)`, mas é de um perfil por chamada — numa
-- página de 25 funcionários seriam 25 idas ao servidor para desenhar 25 datas.
-- Esta recebe o lote da página inteira e responde de uma vez.
--
-- A guarda é a mesma de `acesso_status`: quem não lê Gestão de Usuários não
-- descobre por aqui quando alguém entrou pela última vez.
create or replace function public.ultimo_acesso(_ids uuid[])
returns table (profile_id uuid, ultimo_login timestamptz)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not has_module_perm('gestao_usuarios', 'ler') then
    raise exception 'Sem permissão para consultar acessos.' using errcode = '42501';
  end if;
  return query
    select u.id, u.last_sign_in_at
      from auth.users u
     where u.id = any(_ids);
end;
$$;

revoke all on function public.ultimo_acesso(uuid[]) from public, anon;
grant execute on function public.ultimo_acesso(uuid[]) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Valor do estoque por base
-- ----------------------------------------------------------------------------
-- A lista de Bases mostrava "Itens"; o protótipo mostra "Valor estoque".
--
-- Não existe preço em `produtos` — e inventar uma coluna de preço é decisão de
-- produto, não de tela: alguém teria que mantê-la. O que existe é o valor real
-- pago: `requisicoes.valor` com a quantidade comprada. Daí sai o último custo
-- unitário por produto, que é o que um almoxarifado costuma usar.
--
-- `quantidade` é texto livre ("60 L"), então o número é extraído por regex e a
-- vírgula decimal normalizada. Produto sem compra registrada entra como zero —
-- some do total em vez de derrubar a soma inteira para nulo.
--
-- SECURITY INVOKER de propósito: a soma respeita o RLS de quem pergunta.
create or replace function public.valor_estoque_por_base()
returns table (base_id uuid, valor numeric)
language sql
stable
security invoker
set search_path to 'public'
as $$
  with custo as (
    select distinct on (r.produto_id)
           r.produto_id,
           r.valor / nullif(
             replace(regexp_replace(coalesce(r.quantidade, ''), '[^0-9.,]', '', 'g'), ',', '.')::numeric,
             0
           ) as unitario
      from requisicoes r
     where r.valor is not null
       and nullif(regexp_replace(coalesce(r.quantidade, ''), '[^0-9.,]', '', 'g'), '') is not null
     order by r.produto_id, r.created_at desc
  )
  select l.base_id, coalesce(sum(l.quantidade * coalesce(c.unitario, 0)), 0)
    from estoque_lotes l
    left join custo c on c.produto_id = l.produto_id
   where l.quantidade > 0
   group by l.base_id;
$$;

revoke all on function public.valor_estoque_por_base() from public, anon;
grant execute on function public.valor_estoque_por_base() to authenticated;
