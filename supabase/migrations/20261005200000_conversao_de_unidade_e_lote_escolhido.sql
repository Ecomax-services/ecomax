-- ============================================================================
-- Conversão de unidade e lote escolhido — Release 4, Fase 1, PR 5
-- ============================================================================
-- Dois problemas da baixa de estoque, que o App aprovado torna inevitáveis:
--
-- 1. Unidade. O estoque guarda o produto na unidade de compra (L, kg); o
--    técnico registra o que aplicou na unidade de campo (mL, g). Hoje a baixa
--    debita o número cru: 300 mL aplicados de um produto em litros tirariam
--    300 L do estoque.
--    Decisão do cliente: fator de conversão POR PRODUTO (1 L = 1000 mL). Não
--    é uma tabela global de conversões porque "un" de um produto não tem
--    relação com "un" de outro.
--
-- 2. Lote. A baixa escolhia o lote sozinha (vence primeiro, sai primeiro) ou
--    casava pelo texto digitado. Decisão do cliente: o técnico escolhe o lote
--    de uma lista. A OS passa a guardar QUAL lote, e a baixa debita
--    exatamente ele — se não houver saldo nele, é erro, não troca de lote:
--    o que saiu fisicamente foi aquele lote.
--
-- [A DEFINIR — o que é "a base do técnico"?] Não existe vínculo entre técnico
-- e base no cadastro. A lista de lotes que o App oferece é decidida no PR 12;
-- aqui só se garante que o lote escolhido é do mesmo produto.
--
-- OS antiga, sem unidade de campo nem lote escolhido, continua baixando como
-- hoje, linha por linha.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Produto: unidade de aplicação e fator
-- ----------------------------------------------------------------------------

alter table public.produtos
  add column unidade_aplicacao text,
  add column fator_aplicacao   numeric;

alter table public.produtos
  add constraint produtos_fator_aplicacao_positivo check (fator_aplicacao is null or fator_aplicacao > 0),
  add constraint produtos_unidade_aplicacao_par
    check ((unidade_aplicacao is null) = (fator_aplicacao is null));

comment on column public.produtos.unidade_aplicacao is
  'Unidade em que o técnico registra a aplicação em campo (ex.: mL). Nulo = a mesma do estoque.';
comment on column public.produtos.fator_aplicacao is
  'Quantas unidades de aplicação cabem em uma unidade de estoque (ex.: 1000 para L → mL).';


-- ----------------------------------------------------------------------------
-- 2. Conversão, num lugar só
-- ----------------------------------------------------------------------------
-- A baixa usa, e o App e o relatório vão usar. Comparação sem caixa: o
-- catálogo tem "kg" e há produto cadastrado com "KG".

create or replace function public.qtd_em_unidade_de_estoque(_produto_id uuid, _qtd numeric, _unidade text)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  p record;
begin
  select unidade, unidade_aplicacao, fator_aplicacao into p from produtos where id = _produto_id;
  if not found then
    raise exception 'Produto não encontrado.' using errcode = 'P0002';
  end if;

  if _unidade is null or lower(btrim(_unidade)) = lower(btrim(p.unidade)) then
    return _qtd;
  end if;
  if p.unidade_aplicacao is not null and lower(btrim(_unidade)) = lower(btrim(p.unidade_aplicacao)) then
    -- trim_scale: a divisão de numeric devolve 0.30000000000000000000, e isso
    -- iria para o saldo do lote e para a descrição da movimentação.
    return trim_scale(_qtd / p.fator_aplicacao);
  end if;

  raise exception 'A unidade "%" não converte para "%" neste produto.', _unidade, p.unidade
    using errcode = '23514';
end;
$$;

grant execute on function public.qtd_em_unidade_de_estoque(uuid, numeric, text) to authenticated;


-- ----------------------------------------------------------------------------
-- 3. Produto da OS: unidade do consumo e lote escolhido
-- ----------------------------------------------------------------------------
-- `unidade` continua sendo a do previsto (o Backoffice planeja assim).
-- `unidade_utilizada` é a do consumo registrado; nula = unidade de estoque,
-- que é como toda OS antiga foi registrada.

alter table public.os_produtos
  add column unidade_utilizada text,
  add column estoque_lote_id   uuid references public.estoque_lotes (id) on delete set null;

create index os_produtos_estoque_lote_idx on public.os_produtos (estoque_lote_id) where estoque_lote_id is not null;

-- Confere na gravação, não só na baixa: o técnico descobre no campo que a
-- unidade não converte, e não dias depois, quando o escritório baixar.
-- O texto do lote e a base passam a vir do lote escolhido, para as telas que
-- já mostram `lote` continuarem certas.
create or replace function public.os_produto_confere_unidade_e_lote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lote record;
begin
  if new.unidade_utilizada is not null then
    perform qtd_em_unidade_de_estoque(new.produto_id, 1, new.unidade_utilizada);
  end if;

  if new.estoque_lote_id is not null then
    select produto_id, lote, base_id into v_lote from estoque_lotes where id = new.estoque_lote_id;
    if v_lote.produto_id is distinct from new.produto_id then
      raise exception 'O lote escolhido é de outro produto.' using errcode = '23514';
    end if;
    new.lote := v_lote.lote;
    new.base_id := v_lote.base_id;
  end if;

  return new;
end;
$$;

create trigger os_produto_confere_unidade_e_lote
  before insert or update of produto_id, unidade_utilizada, estoque_lote_id on public.os_produtos
  for each row execute function public.os_produto_confere_unidade_e_lote();


-- ----------------------------------------------------------------------------
-- 4. A baixa
-- ----------------------------------------------------------------------------
-- Igual à anterior em tudo que já valia — permissão, trava por OS, uma baixa
-- só, erro em saldo insuficiente — com duas mudanças: converte para a unidade
-- de estoque e, havendo lote escolhido, debita exatamente ele.

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
  v_descr    text;
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
    select op.produto_id, op.qtd_utilizada, op.unidade_utilizada, op.estoque_lote_id,
           nullif(btrim(coalesce(op.lote, '')), '') as lote,
           op.base_id, p.nome as produto_nome, p.unidade,
           qtd_em_unidade_de_estoque(op.produto_id, op.qtd_utilizada, op.unidade_utilizada) as qtd_estoque
      from os_produtos op
      join produtos p on p.id = op.produto_id
     where op.os_id = p_os_id
       and coalesce(op.qtd_utilizada, 0) > 0
     order by p.nome, op.created_at
  loop
    v_restante := r.qtd_estoque;

    -- O registro guarda o que o técnico informou; a movimentação, o que saiu
    -- do estoque. Quando diferem, a descrição mostra as duas pontas.
    v_descr := 'Consumo na OS (baixa automática)';
    if r.unidade_utilizada is not null and lower(btrim(r.unidade_utilizada)) <> lower(btrim(r.unidade)) then
      v_descr := format('Consumo na OS (baixa automática) · %s %s = %s %s',
                        trim_scale(r.qtd_utilizada), r.unidade_utilizada, r.qtd_estoque, r.unidade);
    end if;

    if r.estoque_lote_id is not null then
      -- Lote escolhido em campo: sai dele ou não sai.
      select l.id, l.quantidade, l.lote, l.base_id into v_lote
        from estoque_lotes l where l.id = r.estoque_lote_id
         for update;

      if v_lote.quantidade < v_restante then
        raise exception 'Estoque insuficiente no lote % de %: há % %, a OS consumiu % %.',
          v_lote.lote, r.produto_nome, v_lote.quantidade, coalesce(r.unidade, 'un'),
          v_restante, coalesce(r.unidade, 'un');
      end if;

      update estoque_lotes
         set quantidade = quantidade - v_restante, updated_at = now()
       where id = v_lote.id;

      insert into movimentacoes (tipo, produto_id, quantidade, base_origem_id, lote, descricao, ator_id)
      values ('saida', r.produto_id, v_restante, v_lote.base_id, v_lote.lote, v_descr, v_actor);

      v_restante := 0;
    else
      -- OS sem lote escolhido: como sempre foi. FEFO, vence primeiro, sai
      -- primeiro.
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
        values ('saida', r.produto_id, v_consumir, v_lote.base_id, v_lote.lote, v_descr, v_actor);

        v_restante := v_restante - v_consumir;
      end loop;
    end if;

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
