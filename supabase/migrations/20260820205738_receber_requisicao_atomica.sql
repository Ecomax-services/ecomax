-- Receber uma requisição é a operação que traz mercadoria para dentro, e era a
-- menos protegida do sistema. Três defeitos, no cliente:
--
--   1. Nenhuma checagem de que a requisição já foi recebida. A tela esconde o
--      botão quando o status é "recebida", mas a função não olhava — e a tela
--      não é a regra.
--
--   2. Soma feita no cliente: lê a quantidade do lote, soma, escreve de volta.
--      Duas recepções ao mesmo tempo leem o mesmo valor e a segunda sobrescreve
--      a primeira. Medido, com duas chamadas simultâneas de 100 mL cada: o lote
--      ficou com 100. A empresa recebeu 200 e o sistema registrou metade.
--
--   3. Só o último passo verificava erro. O insert do lote, o update do lote e
--      a movimentação eram disparados sem olhar o retorno — se qualquer um
--      falhasse, a requisição era marcada como "recebida" mesmo assim. O
--      estoque não entra e o sistema diz que entrou.
--
-- Os três somem quando a operação vira uma transação só, no banco:
--
--   • `for update` na requisição serializa e permite checar o status de verdade;
--   • `on conflict ... do update set quantidade = estoque_lotes.quantidade +
--     excluded.quantidade` soma no banco, sem passar o valor pelo cliente;
--   • qualquer erro derruba a transação inteira, então não existe estado em que
--     o estoque entrou e a requisição não fechou — nem o contrário.

create or replace function public.receber_requisicao(
  p_requisicao_id uuid,
  p_base_id       uuid,
  p_lote          text,
  p_validade      date,
  p_quantidade    numeric,
  p_nota_url      text default null
) returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_req    record;
  v_lote   text := nullif(btrim(coalesce(p_lote, '')), '');
begin
  if not has_module_perm('estoque', 'editar') then
    raise exception 'Sem permissão para receber requisições.' using errcode = '42501';
  end if;

  select id, status, produto_id into v_req
    from requisicoes where id = p_requisicao_id for update;

  if not found then
    raise exception 'Requisição não encontrada.';
  end if;
  if v_req.status = 'recebida' then
    raise exception 'Esta requisição já foi recebida.';
  end if;
  if v_req.status <> 'enviada' then
    raise exception 'Só é possível receber uma requisição que esteja enviada.';
  end if;

  if v_req.produto_id is not null then
    if v_lote is null then
      raise exception 'Informe o lote recebido.';
    end if;
    if coalesce(p_quantidade, 0) <= 0 then
      raise exception 'A quantidade recebida precisa ser maior que zero.';
    end if;

    -- A soma acontece aqui dentro, sobre o valor que estiver gravado no
    -- instante da escrita. É o que impede duas recepções de se sobrescreverem.
    insert into estoque_lotes (produto_id, base_id, lote, validade, quantidade)
    values (v_req.produto_id, p_base_id, v_lote, p_validade, p_quantidade)
    on conflict (produto_id, base_id, lote) do update
      set quantidade = estoque_lotes.quantidade + excluded.quantidade,
          validade   = coalesce(excluded.validade, estoque_lotes.validade),
          updated_at = now();

    insert into movimentacoes (tipo, produto_id, quantidade, base_destino_id, lote, descricao, ator_id)
    values ('entrada', v_req.produto_id, p_quantidade, p_base_id, v_lote,
            'Entrada por recebimento de requisição', auth.uid());
  end if;

  update requisicoes
     set status = 'recebida', nota_fiscal_url = coalesce(p_nota_url, nota_fiscal_url)
   where id = p_requisicao_id;
end $$;

revoke execute on function public.receber_requisicao(uuid, uuid, text, date, numeric, text)
  from public, anon;
