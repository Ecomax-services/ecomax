-- ============================================================================
-- Visitas viram OS — Release 4, Fase 1, PR 4
-- ============================================================================
-- Hoje uma OS recorrente é UMA linha em `ordens_servico` com uma lista de
-- datas futuras em `os_cronograma`. Funciona para mostrar a agenda, mas não
-- para executar: o registro de campo aprovado (pontos, assinaturas,
-- certificado) é por visita, e uma OS só tem lugar para uma execução.
--
-- Decisão do cliente: cada data do cronograma vira uma OS própria.
--
-- O desenho mantém o que as telas já leem:
--   - A OS de origem continua com o seu `os_cronograma`. A aba Cronograma do
--     Portal e a do App seguem listando as mesmas datas.
--   - Cada linha do cronograma passa a apontar para a OS da visita
--     (`visita_os_id`), e a OS da visita aponta de volta para a de origem
--     (`recorrencia_origem_id`).
--   - O que acontece na OS da visita (concluir, cancelar, remarcar) se reflete
--     na linha do cronograma, para a agenda não mentir.
--
-- Quando: na EMISSÃO da OS de origem. Antes disso ela pode ser rascunho e o
-- cronograma ainda está sendo ajustado; gerar seis OS a partir de um rascunho
-- deixaria seis OS órfãs a cada mudança de data.
-- ============================================================================


alter table public.ordens_servico
  add column recorrencia_origem_id uuid references public.ordens_servico (id) on delete set null;

comment on column public.ordens_servico.recorrencia_origem_id is
  'OS que originou esta visita recorrente. Nulo na OS de origem e na OS avulsa.';

create index ordens_servico_recorrencia_origem_idx
  on public.ordens_servico (recorrencia_origem_id) where recorrencia_origem_id is not null;

alter table public.os_cronograma
  add column visita_os_id uuid unique references public.ordens_servico (id) on delete set null;

comment on column public.os_cronograma.visita_os_id is
  'OS gerada para esta data na emissão da OS de origem.';


-- ----------------------------------------------------------------------------
-- Gerar as visitas
-- ----------------------------------------------------------------------------
-- Roda com os privilégios de quem chama: criar OS, vincular técnico e montar
-- plano continuam exigindo o que a RLS já exige.
--
-- Pode ser chamada de novo: data que já tem OS não ganha outra, e data
-- cancelada não gera nada. A OS de origem é travada durante a geração, então
-- dois cliques em "Emitir" não duplicam visitas.
--
-- O que a visita herda da origem: cliente, orçamento, serviços, descrição,
-- horário, endereço, responsáveis, observações, pragas, EPIs, documentos,
-- croqui, equipe, produtos previstos, equipamentos e planos de controle.
-- O que NÃO herda: execução, check-in, assinaturas, anexos, relatórios e
-- histórico — cada visita tem os seus.

create or replace function public.gerar_visitas_da_os(_os_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_origem ordens_servico%rowtype;
  v_data record;
  v_visita uuid;
  v_plano record;
  v_novo_plano uuid;
  v_criadas integer := 0;
begin
  select * into v_origem from ordens_servico where id = _os_id for update;
  if not found then
    raise exception 'OS não encontrada.' using errcode = 'P0002';
  end if;
  if v_origem.recorrencia_origem_id is not null then
    raise exception 'Esta OS já é uma visita de outra; as visitas saem da OS de origem.' using errcode = '23514';
  end if;
  if v_origem.rascunho then
    raise exception 'Emita a OS antes de gerar as visitas.' using errcode = '23514';
  end if;

  for v_data in
    select c.id, c.data_prevista
      from os_cronograma c
     where c.os_id = _os_id and c.visita_os_id is null and c.status <> 'cancelada'
     order by c.data_prevista, c.ordem
  loop
    insert into ordens_servico (
      cliente_id, orcamento_id, status, rascunho, etapa, tipos_servico, descricao,
      data_programada, hora_prevista, duracao_estimada, recorrencia, endereco_execucao,
      responsavel_admin_id, funcionario_integrado_id, observacoes, pragas, epis,
      necessita_relatorio, outros_documentos, mapa_pontos_url, contato,
      recorrencia_origem_id, created_by
    ) values (
      v_origem.cliente_id, v_origem.orcamento_id, 'emitida', false, v_origem.etapa,
      v_origem.tipos_servico, v_origem.descricao,
      v_data.data_prevista, v_origem.hora_prevista, v_origem.duracao_estimada, v_origem.recorrencia,
      v_origem.endereco_execucao, v_origem.responsavel_admin_id, v_origem.funcionario_integrado_id,
      v_origem.observacoes, v_origem.pragas, v_origem.epis,
      v_origem.necessita_relatorio, v_origem.outros_documentos, v_origem.mapa_pontos_url, v_origem.contato,
      _os_id, auth.uid()
    ) returning id into v_visita;

    insert into os_funcionarios (os_id, funcionario_id)
    select v_visita, funcionario_id from os_funcionarios where os_id = _os_id;

    -- Lote fica de fora: é escolhido em campo, da base do técnico, na visita.
    insert into os_produtos (os_id, produto_id, qtd_recomendada, unidade, prazo_alvo, observacao, base_id)
    select distinct on (produto_id) v_visita, produto_id, qtd_recomendada, unidade, prazo_alvo, observacao, base_id
      from os_produtos where os_id = _os_id
     order by produto_id, created_at;

    insert into os_equipamentos (os_id, produto_id, numero_serie, responsavel_id)
    select v_visita, produto_id, numero_serie, responsavel_id from os_equipamentos where os_id = _os_id;

    -- Planos: um por tipo de controle, como a origem nasceu. Se o cliente tem
    -- mapa, `preparar_monitoramento_os` faz o resto, igual à origem.
    for v_plano in
      select distinct on (tipo_controle) id, tipo_controle, frequencia, pontos_previstos, servico_codigo
        from os_planos_controle where os_id = _os_id
       order by tipo_controle, servico_codigo nulls first
    loop
      insert into os_planos_controle (os_id, tipo_controle, frequencia, pontos_previstos)
      values (v_visita, v_plano.tipo_controle, v_plano.frequencia,
              case when v_plano.servico_codigo is null then v_plano.pontos_previstos else 0 end)
      returning id into v_novo_plano;

      -- Plano preenchido à mão: os mesmos pontos, em branco, para a visita.
      if v_plano.servico_codigo is null then
        insert into os_plano_pontos (plano_id, numero, identificacao)
        select v_novo_plano, numero, identificacao
          from os_plano_pontos where plano_id = v_plano.id and cliente_ponto_id is null;
      end if;
    end loop;

    perform preparar_monitoramento_os(v_visita);

    update os_cronograma set visita_os_id = v_visita where id = v_data.id;

    insert into os_historico (os_id, campo, valor_anterior, valor_novo, actor_id)
    values (v_visita, 'OS criada', null, format('Visita recorrente da %s', v_origem.codigo), auth.uid());

    v_criadas := v_criadas + 1;
  end loop;

  return v_criadas;
end;
$$;

revoke all on function public.gerar_visitas_da_os(uuid) from public, anon;
grant execute on function public.gerar_visitas_da_os(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- A visita reflete no cronograma da origem
-- ----------------------------------------------------------------------------
-- O cronograma só conhece três situações. Executada e concluída são visita
-- feita; cancelada é cancelada; o resto continua prevista.
--
-- [A DEFINIR — visita "não executada" deveria aparecer diferente de
-- "prevista" na agenda do cliente?] O cronograma não tem esse estado hoje.
--
-- SECURITY DEFINER: o técnico atualiza a OS da visita pelo App, mas não tem
-- escrita no cronograma da OS de origem. A função só escreve a linha que
-- aponta para a própria OS que mudou.

create or replace function public.os_visita_reflete_no_cronograma()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update os_cronograma
     set status = case
                    when new.status in ('executada', 'concluida') then 'concluida'
                    when new.status = 'cancelada' then 'cancelada'
                    else 'previsto'
                  end,
         data_prevista = coalesce(new.data_programada, data_prevista)
   where visita_os_id = new.id;
  return new;
end;
$$;

create trigger os_visita_reflete_no_cronograma
  after update of status, data_programada on public.ordens_servico
  for each row
  when (new.recorrencia_origem_id is not null)
  execute function public.os_visita_reflete_no_cronograma();


-- ----------------------------------------------------------------------------
-- Garantia: uma por contrato, não uma por visita
-- ----------------------------------------------------------------------------
-- OS avulsa concluída gera garantia. Cada visita herda a origem avulsa, então
-- sem esta linha um contrato de seis visitas geraria seis garantias. Mantém o
-- comportamento de hoje: a garantia sai da OS de origem.
--
-- [A DEFINIR — a garantia de contrato recorrente deveria ser renovada a cada
-- visita concluída?]

create or replace function public.os_gera_garantia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_execucao date;
  v_meses    integer;
  v_garantia uuid;
  v_tipo     text;
begin
  -- Só na transição para concluída, e só OS avulsa.
  if new.status <> 'concluida' or old.status = 'concluida' then return new; end if;
  if new.orcamento_id is not null then return new; end if;
  -- Visita recorrente: a garantia é da OS de origem.
  if new.recorrencia_origem_id is not null then return new; end if;

  -- Uma OS, uma garantia: reconcluir não duplica.
  if exists (select 1 from comercial_garantias g where g.os_id = new.id) then return new; end if;

  v_execucao := coalesce(new.termino_execucao::date, new.check_out_at::date, new.data_programada, current_date);

  -- A OS pode ter vários tipos de serviço e uma garantia só. Vale o maior prazo:
  -- encerrar a garantia antes do prazo do serviço mais longo tiraria do cliente
  -- uma cobertura que ele contratou.
  select max(c.garantia_meses) into v_meses
    from catalogo_itens c
   where c.catalogo = 'tipos_servico'
     and c.nome = any(coalesce(new.tipos_servico, '{}'));

  -- Sem prazo configurado não há o que garantir — melhor não criar do que criar
  -- com validade inventada.
  if v_meses is null then return new; end if;

  insert into comercial_garantias (os_id, cliente_id, data_execucao, data_validade, status, created_by)
  values (new.id, new.cliente_id, v_execucao,
          (v_execucao + make_interval(months => v_meses))::date,
          'Em vigor', new.created_by)
  returning id into v_garantia;

  -- Registra quais serviços a garantia cobre — a tabela existe para isso.
  foreach v_tipo in array coalesce(new.tipos_servico, '{}') loop
    insert into comercial_garantia_servicos (garantia_id, tipo_servico)
    values (v_garantia, v_tipo);
  end loop;

  insert into comercial_garantia_historico (garantia_id, campo, valor_anterior, valor_novo, comentario, actor_id)
  values (v_garantia, 'Garantia criada', null, 'Em vigor',
          format('Gerada ao concluir a OS %s.', new.codigo), auth.uid());

  return new;
end;
$$;
