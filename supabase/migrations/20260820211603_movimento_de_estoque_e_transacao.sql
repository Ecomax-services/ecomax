-- Todo movimento de estoque somava no cliente: ler a quantidade do lote, somar
-- ou subtrair em JavaScript, escrever o resultado. Quatro operações faziam isso
-- — ajuste manual, envio, recebimento e cancelamento de transferência — e todas
-- perdem escrita quando acontecem ao mesmo tempo: as duas leem o mesmo valor e a
-- segunda apaga a primeira.
--
-- É o mesmo defeito já corrigido em `receber_requisicao`, onde ele foi medido:
-- duas entradas de 100 deixaram o lote com 100.
--
-- Havia um agravante em `criarTransferencia`: o saldo saía da origem **antes**
-- do insert da transferência. Falhando o insert, o estoque simplesmente
-- desaparecia — sem transferência e sem saldo.
--
-- A primitiva abaixo soma dentro do banco, sobre o valor gravado no instante da
-- escrita, e as quatro operações passam a ser transações inteiras.

-- Soma `p_delta` ao lote, criando-o se não existir. Devolve o saldo final.
create or replace function public.estoque_somar(
  p_produto_id uuid, p_base_id uuid, p_lote text, p_delta numeric, p_validade date default null
) returns numeric language plpgsql security definer set search_path to 'public' as $$
declare v_saldo numeric;
begin
  insert into estoque_lotes (produto_id, base_id, lote, validade, quantidade)
  values (p_produto_id, p_base_id, coalesce(nullif(btrim(p_lote), ''), 'AJUSTE'), p_validade, greatest(p_delta, 0))
  on conflict (produto_id, base_id, lote) do update
    set quantidade = estoque_lotes.quantidade + p_delta,
        validade   = coalesce(excluded.validade, estoque_lotes.validade),
        updated_at = now()
  returning quantidade into v_saldo;

  if v_saldo < 0 then
    raise exception 'Saldo insuficiente: a operação deixaria o lote % com %.', p_lote, v_saldo;
  end if;
  return v_saldo;
end $$;

revoke execute on function public.estoque_somar(uuid, uuid, text, numeric, date) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
create or replace function public.ajuste_estoque(
  p_produto_id uuid, p_base_id uuid, p_delta numeric,
  p_motivo text, p_observacao text default null, p_lote text default null
) returns numeric language plpgsql security definer set search_path to 'public' as $$
declare v_lote text := coalesce(nullif(btrim(coalesce(p_lote, '')), ''), 'AJUSTE'); v_saldo numeric;
begin
  if not has_module_perm('estoque', 'editar') then
    raise exception 'Sem permissão para ajustar estoque.' using errcode = '42501';
  end if;
  if coalesce(p_delta, 0) = 0 then
    raise exception 'Informe uma quantidade diferente de zero.';
  end if;
  if coalesce(btrim(p_motivo), '') = '' then
    raise exception 'Informe o motivo do ajuste.';
  end if;

  v_saldo := estoque_somar(p_produto_id, p_base_id, v_lote, p_delta);

  insert into movimentacoes (tipo, produto_id, quantidade, base_origem_id, base_destino_id, lote, descricao, ator_id)
  values ('ajuste', p_produto_id, p_delta, p_base_id, p_base_id, v_lote,
          'Ajuste manual · ' || p_motivo || coalesce(' · ' || nullif(btrim(coalesce(p_observacao, '')), ''), ''),
          auth.uid());
  return v_saldo;
end $$;

revoke execute on function public.ajuste_estoque(uuid, uuid, numeric, text, text, text) from public, anon;

-- ---------------------------------------------------------------------------
create or replace function public.criar_transferencia(
  p_produto_id uuid, p_base_origem_id uuid, p_base_destino_id uuid,
  p_lote text, p_quantidade numeric, p_motivo text default null
) returns text language plpgsql security definer set search_path to 'public' as $$
declare v_validade date; v_codigo text; v_id uuid;
begin
  if not has_module_perm('estoque', 'editar') then
    raise exception 'Sem permissão para transferir estoque.' using errcode = '42501';
  end if;
  if p_base_origem_id = p_base_destino_id then
    raise exception 'Origem e destino devem ser diferentes.';
  end if;
  if coalesce(p_quantidade, 0) <= 0 then
    raise exception 'Informe a quantidade a transferir.';
  end if;

  select validade into v_validade from estoque_lotes
   where produto_id = p_produto_id and base_id = p_base_origem_id and lote = p_lote;

  -- Sai da origem primeiro, e a exceção de saldo negativo derruba tudo — antes,
  -- o saldo saía e a transferência podia não nascer.
  perform estoque_somar(p_produto_id, p_base_origem_id, p_lote, -p_quantidade);

  insert into transferencias (produto_id, base_origem_id, base_destino_id, lote, validade,
                              quantidade_enviada, motivo, ator_envio_id)
  values (p_produto_id, p_base_origem_id, p_base_destino_id, p_lote, v_validade,
          p_quantidade, p_motivo, auth.uid())
  returning id, codigo into v_id, v_codigo;

  insert into movimentacoes (tipo, produto_id, quantidade, base_origem_id, base_destino_id, lote, descricao, ator_id)
  values ('transferencia', p_produto_id, p_quantidade, p_base_origem_id, p_base_destino_id, p_lote,
          'Transferência ' || v_codigo || ' enviada (em trânsito)' || coalesce(' · ' || p_motivo, ''), auth.uid());

  return v_codigo;
end $$;

revoke execute on function public.criar_transferencia(uuid, uuid, uuid, text, numeric, text) from public, anon;

-- ---------------------------------------------------------------------------
create or replace function public.receber_transferencia(
  p_id uuid, p_quantidade_recebida numeric, p_justificativa text default null
) returns void language plpgsql security definer set search_path to 'public' as $$
declare tr record; v_divergente boolean;
begin
  if not has_module_perm('estoque', 'editar') then
    raise exception 'Sem permissão para receber transferências.' using errcode = '42501';
  end if;

  select * into tr from transferencias where id = p_id for update;
  if not found then raise exception 'Transferência não encontrada.'; end if;
  if tr.status <> 'em_transito' then raise exception 'Transferência não está em trânsito.'; end if;
  if coalesce(p_quantidade_recebida, 0) <= 0 then raise exception 'Informe a quantidade recebida.'; end if;

  v_divergente := p_quantidade_recebida <> tr.quantidade_enviada;
  if v_divergente and coalesce(btrim(coalesce(p_justificativa, '')), '') = '' then
    raise exception 'Quantidade diverge da enviada: justificativa obrigatória.';
  end if;

  perform estoque_somar(tr.produto_id, tr.base_destino_id, tr.lote, p_quantidade_recebida, tr.validade);

  update transferencias
     set status = 'recebida', quantidade_recebida = p_quantidade_recebida,
         justificativa_divergencia = case when v_divergente then btrim(p_justificativa) end,
         ator_recebimento_id = auth.uid(), recebida_at = now()
   where id = p_id;

  insert into movimentacoes (tipo, produto_id, quantidade, base_destino_id, lote, descricao, ator_id)
  values ('entrada', tr.produto_id, p_quantidade_recebida, tr.base_destino_id, tr.lote,
          'Recebimento de transferência' ||
          case when v_divergente
               then ' · divergência (' || p_quantidade_recebida || '/' || tr.quantidade_enviada || ')'
               else '' end,
          auth.uid());
end $$;

revoke execute on function public.receber_transferencia(uuid, numeric, text) from public, anon;

-- ---------------------------------------------------------------------------
create or replace function public.cancelar_transferencia(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare tr record;
begin
  if not has_module_perm('estoque', 'editar') then
    raise exception 'Sem permissão para cancelar transferências.' using errcode = '42501';
  end if;

  -- `for update` porque cancelar duas vezes devolveria o saldo duas vezes.
  select * into tr from transferencias where id = p_id for update;
  if not found then raise exception 'Transferência não encontrada.'; end if;
  if tr.status <> 'em_transito' then
    raise exception 'Só transferências em trânsito podem ser canceladas.';
  end if;

  perform estoque_somar(tr.produto_id, tr.base_origem_id, tr.lote, tr.quantidade_enviada, tr.validade);
  update transferencias set status = 'cancelada' where id = p_id;

  insert into movimentacoes (tipo, produto_id, quantidade, base_destino_id, lote, descricao, ator_id)
  values ('entrada', tr.produto_id, tr.quantidade_enviada, tr.base_origem_id, tr.lote,
          'Transferência ' || tr.codigo || ' cancelada · saldo devolvido', auth.uid());
end $$;

revoke execute on function public.cancelar_transferencia(uuid) from public, anon;
