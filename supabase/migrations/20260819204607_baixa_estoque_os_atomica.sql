-- Baixa de estoque da OS: debita o lote, registra a movimentação e marca o
-- histórico numa única transação.
--
-- Antes disso a baixa vivia no cliente e só inseria em `movimentacoes`. Como o
-- saldo exibido vem de `estoque_lotes` (vw_produtos), a OS registrava consumo
-- sem que o estoque caísse — e uma falha no meio deixava movimentação órfã.
--
-- `base_id` em os_produtos porque não há como derivar a base a partir da OS:
-- `funcionarios` não tem base e o mesmo produto vive em lotes de bases
-- diferentes. Sem essa coluna a baixa teria que adivinhar de onde tirar.

alter table os_produtos
  add column if not exists base_id uuid references bases(id) on delete set null;

comment on column os_produtos.base_id is
  'Base de onde o consumo é debitado. Nulo = qualquer base, consumindo por validade (FEFO).';

-- SECURITY DEFINER com checagem explícita: quem emite a OS tem permissão de
-- Operacional, não necessariamente de Estoque. A baixa é consequência da
-- execução da OS, não um ato de gestão de estoque — por isso a função concede o
-- efeito sem exigir que o usuário possa mexer no módulo Estoque por fora.
create or replace function baixar_estoque_os(p_os_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := auth.uid();
  v_count    int  := 0;
  r          record;
  v_lote     record;
  v_restante numeric;
  v_consumir numeric;
begin
  -- Espelha as policies de UPDATE de ordens_servico: módulo Operacional ou a
  -- própria OS do operador.
  if not (has_module_perm('operacional', 'editar') or os_is_mine(p_os_id)) then
    raise exception 'Sem permissão para baixar o estoque desta OS.' using errcode = '42501';
  end if;

  if not exists (select 1 from ordens_servico o where o.id = p_os_id) then
    raise exception 'OS não encontrada.';
  end if;

  if exists (
    select 1 from os_historico h
     where h.os_id = p_os_id and h.campo = 'Baixa de estoque'
  ) then
    raise exception 'O estoque desta OS já foi baixado.';
  end if;

  for r in
    select op.produto_id, op.qtd_utilizada, nullif(btrim(coalesce(op.lote, '')), '') as lote,
           op.base_id, p.nome as produto_nome, p.unidade
      from os_produtos op
      join produtos p on p.id = op.produto_id
     where op.os_id = p_os_id
       and coalesce(op.qtd_utilizada, 0) > 0
     order by p.nome
  loop
    v_restante := r.qtd_utilizada;

    -- FEFO: vence primeiro, sai primeiro. `for update` evita que duas baixas
    -- simultâneas leiam o mesmo saldo e debitem em dobro.
    for v_lote in
      select l.id, l.quantidade, l.lote, l.base_id
        from estoque_lotes l
       where l.produto_id = r.produto_id
         and l.quantidade > 0
         and (r.base_id is null or l.base_id = r.base_id)
         and (r.lote is null or l.lote = r.lote)
       order by l.validade nulls last, l.created_at
       for update
    loop
      exit when v_restante <= 0;
      v_consumir := least(v_restante, v_lote.quantidade);

      update estoque_lotes
         set quantidade = quantidade - v_consumir, updated_at = now()
       where id = v_lote.id;

      insert into movimentacoes (tipo, produto_id, quantidade, base_origem_id, lote, descricao, ator_id)
      values ('saida', r.produto_id, v_consumir, v_lote.base_id, v_lote.lote,
              'Consumo na OS (baixa automática)', v_actor);

      v_restante := v_restante - v_consumir;
    end loop;

    if v_restante > 0 then
      raise exception 'Estoque insuficiente para %: faltam % %.',
        r.produto_nome, v_restante, coalesce(r.unidade, 'un');
    end if;

    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'Nenhum produto teve consumo informado nesta OS.';
  end if;

  insert into os_historico (os_id, campo, valor_anterior, valor_novo, actor_id)
  values (p_os_id, 'Baixa de estoque', null, v_count || ' produto(s)', v_actor);

  return v_count;
end;
$$;

revoke all on function baixar_estoque_os(uuid) from public;
grant execute on function baixar_estoque_os(uuid) to authenticated;
