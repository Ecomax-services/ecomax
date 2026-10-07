-- ============================================================================
-- Sem CPF e cargo de quem assina — ajuste pedido na aprovação da Release 4
-- ============================================================================
-- Na aprovação da Release 4 (e-mail de 06/10/2026), a Ecomax pediu para
-- retirar do certificado o CPF e o cargo do cliente, e a Fraktal confirmou que
-- esses campos não seriam criados. O App pedia os dois como obrigatórios na
-- etapa Cliente, e esta função recusava o envio sem eles.
--
--   1. `registrar_execucao` deixa de exigir e de gravar CPF e cargo; quem
--      assina continua identificado pelo nome e pela assinatura;
--   2. as colunas `assinante_cpf` e `assinante_cargo` saem de `ordens_servico`.
--      Nenhuma OS tinha os dois preenchidos (conferido em 07/10). Também deixa
--      de existir o CPF de terceiro guardado sem uso, que pedia tratamento de
--      LGPD.
--
-- O resto da função é o mesmo de 20261006150000_base_do_tecnico.sql.
-- ============================================================================

create or replace function public.registrar_execucao(_os_id uuid, _dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_os         ordens_servico%rowtype;
  v_uuid       uuid;
  v_inicio     timestamptz;
  v_termino    timestamptz;
  v_funcionario uuid;
  v_item       jsonb;
  v_linha      uuid;
  v_repo       uuid;
  v_caminho    text;
  v_faltam     integer;
  v_n_pontos   integer := 0;
  v_n_produtos integer := 0;
  v_assinante  jsonb := coalesce(_dados -> 'assinante', '{}'::jsonb);
  v_base_tecnico uuid;
  v_base_lote  uuid;
  v_lote_existe boolean;
begin
  -- Quem: só o técnico escalado nesta OS. O Backoffice corrige pelo relatório,
  -- não reescrevendo o registro de campo.
  if not os_is_mine(_os_id) then
    raise exception 'Esta OS não está atribuída a você.' using errcode = '42501';
  end if;

  begin
    v_uuid := (_dados ->> 'execucao_uuid')::uuid;
    v_inicio := (_dados ->> 'inicio')::timestamptz;
    v_termino := (_dados ->> 'termino')::timestamptz;
  exception when others then
    raise exception 'Envio malformado: identificador ou horários inválidos.' using errcode = '22023';
  end;
  if v_uuid is null or v_inicio is null or v_termino is null then
    raise exception 'Envio incompleto: faltam identificador ou horários.' using errcode = '22023';
  end if;

  -- Trava a OS: dois envios simultâneos do mesmo aparelho (o reenvio que
  -- chega antes da resposta do primeiro) não podem passar os dois.
  select * into v_os from ordens_servico where id = _os_id for update;

  if v_os.execucao_uuid = v_uuid then
    return jsonb_build_object('status', 'ja_registrada', 'os_id', _os_id);
  end if;
  if v_os.execucao_uuid is not null then
    raise exception 'Esta OS já tem uma execução registrada.' using errcode = '23505';
  end if;
  if v_os.rascunho or v_os.status in ('executada', 'concluida', 'cancelada', 'nao_executada') then
    raise exception 'Esta OS não aceita mais execução (situação: %).', v_os.status using errcode = '23514';
  end if;

  -- 1. Data programada, no fuso de Brasília. Vale o início registrado no
  --    aparelho, não a hora do envio: o envio pode chegar no dia seguinte.
  if v_os.data_programada is null
     or (v_inicio at time zone 'America/Sao_Paulo')::date <> v_os.data_programada then
    raise exception 'Só é possível iniciar na data programada.' using errcode = '23514';
  end if;
  if v_termino < v_inicio then
    raise exception 'O término não pode ser antes do início.' using errcode = '23514';
  end if;

  -- 2. Produtos
  if jsonb_array_length(coalesce(_dados -> 'produtos', '[]'::jsonb)) = 0 then
    raise exception 'Registre pelo menos um produto.' using errcode = '23514';
  end if;

  -- O lote vem da lista da base do técnico (decisão do cliente). Sem base no
  -- cadastro, não há lista — e o envio não tem como valer.
  v_base_tecnico := minha_base_id();
  if v_base_tecnico is null then
    raise exception 'Seu cadastro não tem base de estoque. Peça ao escritório para definir a sua base.'
      using errcode = '23514';
  end if;

  for v_item in select * from jsonb_array_elements(_dados -> 'produtos') loop
    if (v_item ->> 'estoque_lote_id') is null then
      raise exception 'O lote é obrigatório.' using errcode = '23514';
    end if;
    select true, base_id into v_lote_existe, v_base_lote
      from estoque_lotes where id = (v_item ->> 'estoque_lote_id')::uuid;
    if v_lote_existe is null or v_base_lote is distinct from v_base_tecnico then
      raise exception 'O lote escolhido não é da sua base.' using errcode = '23514';
    end if;
    v_lote_existe := null;
    if coalesce((v_item ->> 'quantidade')::numeric, 0) <= 0 then
      raise exception 'Informe a quantidade aplicada.' using errcode = '23514';
    end if;

    -- Previsto ainda não usado deste produto: é ele que recebe o consumo.
    -- Sem previsto, o produto entra como não planejado.
    select id into v_linha
      from os_produtos
     where os_id = _os_id and produto_id = (v_item ->> 'produto_id')::uuid
       and qtd_utilizada is null and estoque_lote_id is null
     order by created_at
     limit 1;

    if v_linha is not null then
      update os_produtos
         set qtd_utilizada = (v_item ->> 'quantidade')::numeric,
             unidade_utilizada = nullif(v_item ->> 'unidade', ''),
             estoque_lote_id = (v_item ->> 'estoque_lote_id')::uuid
       where id = v_linha;
    else
      insert into os_produtos (os_id, produto_id, qtd_recomendada, qtd_utilizada, unidade_utilizada, estoque_lote_id)
      values (_os_id, (v_item ->> 'produto_id')::uuid, 0, (v_item ->> 'quantidade')::numeric,
              nullif(v_item ->> 'unidade', ''), (v_item ->> 'estoque_lote_id')::uuid);
    end if;
    v_n_produtos := v_n_produtos + 1;
  end loop;

  -- Planos: observação e lâmpada.
  for v_item in select * from jsonb_array_elements(coalesce(_dados -> 'planos', '[]'::jsonb)) loop
    update os_planos_controle
       set observacao = nullif(v_item ->> 'observacao', ''),
           lampada_instalacao = (v_item ->> 'lampada_instalacao')::date,
           lampada_validade = (v_item ->> 'lampada_validade')::date
     where id = (v_item ->> 'plano_id')::uuid and os_id = _os_id;
    if not found then
      raise exception 'Plano de controle que não é desta OS.' using errcode = '23514';
    end if;
  end loop;

  -- Pontos. A situação é calculada pelo trigger a partir do que vem aqui.
  for v_item in select * from jsonb_array_elements(coalesce(_dados -> 'pontos', '[]'::jsonb)) loop
    update os_plano_pontos pt
       set status_codigo  = (v_item ->> 'status_codigo')::smallint,
           contagens      = v_item -> 'contagens',
           sem_ocorrencia = coalesce((v_item ->> 'sem_ocorrencia')::boolean, false),
           observacao     = nullif(v_item ->> 'observacao', ''),
           acao_corretiva = nullif(v_item ->> 'acao_corretiva', ''),
           preenchido_em  = v_termino,
           preenchido_por = auth.uid()
      from os_planos_controle p
     where pt.id = (v_item ->> 'ponto_id')::uuid and p.id = pt.plano_id and p.os_id = _os_id;
    if not found then
      raise exception 'Ponto que não é desta OS.' using errcode = '23514';
    end if;
    v_n_pontos := v_n_pontos + 1;
  end loop;

  -- Aplicações da Desinsetização.
  for v_item in select * from jsonb_array_elements(coalesce(_dados -> 'aplicacoes', '[]'::jsonb)) loop
    insert into os_aplicacoes (os_id, plano_id, produto_id, tecnica, quantidade, unidade, areas, created_by)
    values (_os_id, (v_item ->> 'plano_id')::uuid, (v_item ->> 'produto_id')::uuid, v_item ->> 'tecnica',
            (v_item ->> 'quantidade')::numeric, v_item ->> 'unidade',
            array(select jsonb_array_elements_text(coalesce(v_item -> 'areas', '[]'::jsonb))),
            auth.uid());
  end loop;

  -- 3. Nada pendente no monitoramento.
  select count(*) into v_faltam
    from os_plano_pontos pt
    join os_planos_controle p on p.id = pt.plano_id
   where p.os_id = _os_id and p.servico_codigo is not null and pt.situacao = 'pendente';
  if v_faltam > 0 then
    raise exception 'Avalie todos os pontos para concluir. Faltam %.', v_faltam using errcode = '23514';
  end if;

  if exists (
    select 1 from os_planos_controle p
     where p.os_id = _os_id and p.servico_codigo = 'DI'
       and not exists (select 1 from os_aplicacoes a where a.plano_id = p.id)
  ) then
    raise exception 'Registre ao menos uma aplicação na Desinsetização.' using errcode = '23514';
  end if;

  -- Fotos.
  for v_item in select * from jsonb_array_elements(coalesce(_dados -> 'fotos', '[]'::jsonb)) loop
    v_caminho := v_item ->> 'caminho';
    if v_caminho is null or v_caminho not like 'os/' || _os_id || '/foto/%'
       or not exists (select 1 from storage.objects where bucket_id = 'operacional-docs' and name = v_caminho) then
      raise exception 'Foto não encontrada no armazenamento. Reenvie as fotos.' using errcode = '23514';
    end if;
    insert into os_anexos (os_id, nome, tipo, arquivo_url, ponto_id, created_by)
    values (_os_id, coalesce(nullif(v_item ->> 'nome', ''), 'Foto'), 'foto', v_caminho,
            (v_item ->> 'ponto_id')::uuid, auth.uid());
  end loop;

  -- Reposição ao almoxarifado, se pedida.
  if jsonb_array_length(coalesce(_dados -> 'reposicao' -> 'itens', '[]'::jsonb)) > 0 then
    insert into os_reposicoes (os_id, observacao, created_by)
    values (_os_id, nullif(_dados -> 'reposicao' ->> 'observacao', ''), auth.uid())
    returning id into v_repo;
    insert into os_reposicao_itens (reposicao_id, produto_id, quantidade)
    select v_repo, (i ->> 'produto_id')::uuid, (i ->> 'quantidade')::numeric
      from jsonb_array_elements(_dados -> 'reposicao' -> 'itens') i;
  end if;

  -- 4 e 5. Assinaturas.
  if coalesce(btrim(v_assinante ->> 'nome'), '') = '' then
    raise exception 'Informe o nome de quem assina.' using errcode = '23514';
  end if;

  v_caminho := v_assinante ->> 'assinatura';
  if v_caminho is null or v_caminho not like 'os/' || _os_id || '/assinatura/%'
     or not exists (select 1 from storage.objects where bucket_id = 'operacional-docs' and name = v_caminho) then
    raise exception 'Colete a assinatura do cliente.' using errcode = '23514';
  end if;

  v_caminho := _dados ->> 'tecnico_assinatura';
  if v_caminho is null or v_caminho not like 'os/' || _os_id || '/assinatura/%'
     or not exists (select 1 from storage.objects where bucket_id = 'operacional-docs' and name = v_caminho) then
    raise exception 'Assine antes de concluir.' using errcode = '23514';
  end if;

  select f.id into v_funcionario
    from funcionarios f
    join os_funcionarios osf on osf.funcionario_id = f.id and osf.os_id = _os_id
   where f.profile_id = auth.uid()
   limit 1;

  update ordens_servico
     set status = 'executada',
         inicio_execucao = coalesce(inicio_execucao, v_inicio),
         termino_execucao = v_termino,
         assinante_nome = btrim(v_assinante ->> 'nome'),
         assinatura_url = v_assinante ->> 'assinatura',
         tecnico_assinatura_url = _dados ->> 'tecnico_assinatura',
         tecnico_executor_id = v_funcionario,
         execucao_uuid = v_uuid
   where id = _os_id;

  insert into os_historico (os_id, campo, valor_anterior, valor_novo, actor_id)
  values (_os_id, 'Execução registrada', v_os.status,
          format('App · %s ponto(s), %s produto(s)', v_n_pontos, v_n_produtos), auth.uid());

  return jsonb_build_object('status', 'registrada', 'os_id', _os_id);
end;
$$;


alter table public.ordens_servico
  drop column assinante_cpf,
  drop column assinante_cargo;
