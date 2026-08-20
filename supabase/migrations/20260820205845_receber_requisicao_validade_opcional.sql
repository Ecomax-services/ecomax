-- `p_validade` tinha ficado obrigatória por acidente de ordem: parâmetro com
-- default não pode vir antes de parâmetro sem default, e `p_quantidade` estava
-- depois dela. Os tipos gerados expuseram isso como `p_validade: string`, e
-- lote sem validade é caso comum — produto que não vence.
--
-- A quantidade sobe para antes, e validade e nota ficam opcionais. Trocar a
-- ordem dos parâmetros muda a identidade da função, então a anterior sai.

drop function if exists public.receber_requisicao(uuid, uuid, text, date, numeric, text);

create or replace function public.receber_requisicao(
  p_requisicao_id uuid,
  p_base_id       uuid,
  p_lote          text,
  p_quantidade    numeric,
  p_validade      date default null,
  p_nota_url      text default null
) returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_req  record;
  v_lote text := nullif(btrim(coalesce(p_lote, '')), '');
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

    -- A soma acontece aqui dentro, sobre o valor gravado no instante da
    -- escrita. É o que impede duas recepções de se sobrescreverem.
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

revoke execute on function public.receber_requisicao(uuid, uuid, text, numeric, date, text)
  from public, anon;
