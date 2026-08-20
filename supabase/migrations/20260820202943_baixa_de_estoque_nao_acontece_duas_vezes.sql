-- `baixar_estoque_os` se protegia de repetição assim:
--
--   if exists (select 1 from os_historico
--               where os_id = p_os_id and campo = 'Baixa de estoque')
--     then raise exception 'O estoque desta OS já foi baixado.'; end if;
--
-- Funciona para dois cliques em sequência e não funciona para dois ao mesmo
-- tempo: as duas transações leem o histórico antes de qualquer uma escrever, as
-- duas passam, e as duas debitam. O `for update` nos lotes, que já existia, não
-- resolve — ele serializa o consumo, mas a segunda transação já tinha passado
-- pela checagem antes de pedir o lock.
--
-- Medido com duas chamadas simultâneas ao RPC na OS-1002: as duas devolveram
-- 200, o saldo do Raticida Brodifacoum caiu de 19 para 17 em vez de 18, e o
-- histórico da OS ficou com dois registros de "Baixa de estoque".
--
-- Não é caso de laboratório: é a OS aberta em duas abas, o clique duplo no
-- botão, ou o operador e o escritório agindo no mesmo minuto — tudo o que o
-- cenário X-E do roteiro de QA manda tentar.
--
-- Duas defesas, porque uma sozinha depende de eu ter raciocinado certo sobre
-- concorrência:
--
--   1. `for update` na própria OS serializa as chamadas: a segunda espera a
--      primeira terminar e aí enxerga o registro no histórico;
--   2. o índice único torna o segundo registro impossível, mesmo que o lock
--      falhe ou alguém escreva por outro caminho.
--
-- Fora isso a função é a mesma, linha por linha.

delete from public.os_historico h
 where h.campo = 'Baixa de estoque'
   and h.id <> (
     select h2.id from public.os_historico h2
      where h2.os_id = h.os_id and h2.campo = 'Baixa de estoque'
      order by h2.created_at, h2.id
      limit 1
   );

create unique index if not exists os_historico_uma_baixa_por_os
  on public.os_historico (os_id)
  where campo = 'Baixa de estoque';

create or replace function public.baixar_estoque_os(p_os_id uuid)
returns integer language plpgsql security definer set search_path to 'public'
as $function$
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

  -- Serializa por OS. Precisa vir antes da checagem do histórico: é justamente
  -- entre ler e escrever que a segunda chamada se enfiava.
  if not exists (select 1 from ordens_servico o where o.id = p_os_id for update) then
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

    -- FEFO: vence primeiro, sai primeiro.
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
$function$;
