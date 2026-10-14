-- ============================================================================
-- Histórico mês a mês do relatório técnico — Release 4, Fase 3 (PR 23)
-- ============================================================================
-- O relatório aprovado tem, por bloco:
--   - "Consolidação anual · Evolução mês a mês · meses sem visita aparecem
--     sem valor" (Porta-Isca, Placa Adesiva, Captura Não-Alvo);
--   - "Evolução mensal do total capturado" e "Visão mensal por tipo"
--     (Armadilhas Luminosas, Pragas de Grãos);
--   - "Visão por período" (Ocorrências);
--   - "Tendência <ano anterior> × <ano>": Jan até o último mês com dado,
--     contra o mesmo período do ano anterior;
--   - o Comparativo "Iscas consumidas × placas com ocorrência, mês a mês".
--
-- `relatorio_dados` passa a devolver o histórico do cliente agregado por mês,
-- área, serviço e fase — do 1º de janeiro do ano anterior até a execução da
-- OS. Agregado no banco para o JSON não crescer com o número de visitas.
-- O ano de referência é o da execução; o mês corrente, o da execução.
--
-- Ano anterior sem dado (antes desta release o sistema não tinha leitura por
-- ponto) aparece vazio. [A DEFINIR — importar as planilhas antigas do
-- cliente, ou aceitar a tendência vazia no primeiro ano.]
--
-- Também passa a devolver as fotos da execução, para a galeria do relatório.
--
-- O resto da função é o mesmo de 20261008090000_relatorio_dados.sql.
-- ============================================================================

create or replace function public.relatorio_dados(_os_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_os    ordens_servico%rowtype;
  v_ate   date;
  v_de    date;
  v_ini   date;
  v_saida jsonb;
begin
  if not (has_module_perm('relatorios', 'ler') or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'Você não tem acesso aos relatórios técnicos.' using errcode = '42501';
  end if;

  select * into v_os from ordens_servico where id = _os_id;
  if not found or v_os.status not in ('executada', 'concluida') then
    raise exception 'Relatório técnico só existe para OS executada ou concluída.' using errcode = 'P0002';
  end if;

  -- Dia da execução em Brasília, com o critério do histórico do App: término
  -- do envio; senão check-out; senão a data programada.
  v_ate := coalesce((v_os.termino_execucao at time zone 'America/Sao_Paulo')::date,
                    (v_os.check_out_at at time zone 'America/Sao_Paulo')::date,
                    v_os.data_programada);
  v_de  := v_ate - 27;
  -- Histórico: do 1º de janeiro do ano anterior até a execução.
  v_ini := make_date(extract(year from v_ate)::int - 1, 1, 1);

  with execucoes as (
    select o.id, o.codigo,
           coalesce((o.termino_execucao at time zone 'America/Sao_Paulo')::date,
                    (o.check_out_at at time zone 'America/Sao_Paulo')::date,
                    o.data_programada) as data
      from ordens_servico o
     where o.cliente_id = v_os.cliente_id
       and o.status in ('executada', 'concluida')
       and not coalesce(o.rascunho, false)
  ),
  visitas as (
    select * from execucoes where data between v_de and v_ate
  ),
  historico as (
    select * from execucoes where data between v_ini and v_ate
  ),
  -- Leituras do histórico nos serviços desta OS, com a área e a fase do bloco.
  -- A fase só separa bloco na Desratização (Porta-Isca e Placa Adesiva).
  leituras as (
    select extract(year from h.data)::int as ano, extract(month from h.data)::int as mes, h.id as os_id,
           cp.area_id, pt.area as area_texto, p.servico_codigo as servico,
           case when p.servico_codigo in ('PI', 'PA') then pt.fase end as fase,
           pt.status_codigo, pt.contagens, pt.situacao
      from os_plano_pontos pt
      join os_planos_controle p on p.id = pt.plano_id
      join historico h on h.id = p.os_id
      left join cliente_pontos cp on cp.id = pt.cliente_ponto_id
     where p.servico_codigo in (select q.servico_codigo from os_planos_controle q where q.os_id = _os_id)
  )
  select jsonb_build_object(
    'os', (
      select jsonb_build_object(
        'id', o.id, 'codigo', o.codigo, 'status', o.status,
        'tipos', coalesce(o.tipos_servico, '{}'), 'pragas', coalesce(o.pragas, '{}'),
        'data_execucao', v_ate, 'inicio', o.inicio_execucao, 'termino', o.termino_execucao,
        'endereco_execucao', o.endereco_execucao,
        'assinante_nome', o.assinante_nome,
        'cliente', jsonb_build_object(
          'id', c.id, 'nome', coalesce(c.razao_social, c.nome),
          'endereco', nullif(concat_ws(' - ',
            nullif(concat_ws(', ', nullif(c.logradouro, ''), nullif(c.numero, ''), nullif(c.complemento, ''), nullif(c.bairro, '')), ''),
            nullif(concat_ws('/', nullif(c.cidade, ''), nullif(c.uf, '')), '')), '')
        ),
        'equipe', coalesce((
          select jsonb_agg(f.nome_completo order by f.nome_completo)
            from os_funcionarios osf join funcionarios f on f.id = osf.funcionario_id
           where osf.os_id = o.id), '[]'::jsonb),
        'tecnico_executor', (select f.nome_completo from funcionarios f where f.id = o.tecnico_executor_id)
      )
        from ordens_servico o join clientes c on c.id = o.cliente_id
       where o.id = _os_id
    ),
    -- Capa ("Vêm do cadastro da Ecomax e do cliente. Não são editados no relatório.")
    'empresa', (select jsonb_build_object('razao_social', e.razao_social, 'cnpj', e.cnpj, 'endereco', e.endereco,
                                          'contato', e.contato, 'ceatox', e.ceatox, 'logo_path', e.logo_path)
                  from empresa_config e limit 1),
    'licencas', coalesce((select jsonb_agg(jsonb_build_object('rotulo', l.rotulo, 'descricao', l.descricao) order by l.ordem)
                            from empresa_licencas l where l.ativo), '[]'::jsonb),
    'responsavel_tecnico', (select jsonb_build_object('nome', rt.nome, 'formacao', rt.formacao, 'conselho', rt.conselho, 'registro', rt.registro)
                              from responsaveis_tecnicos rt where rt.vigente_ate is null
                             order by rt.vigente_desde desc limit 1),
    'relatorio', (
      select jsonb_build_object('versao_atual', r.versao_atual, 'versao_publicada', r.versao_publicada, 'publicado_em', r.publicado_em)
        from os_relatorios_tecnicos r where r.os_id = _os_id
    ),
    'janela', jsonb_build_object('de', v_de, 'ate', v_ate),
    -- Mês a mês: a "Consolidação anual" e a "Tendência" contra o ano anterior.
    'historico', jsonb_build_object(
      'ano', extract(year from v_ate)::int,
      'mes_atual', extract(month from v_ate)::int,
      -- Meses com visita em cada bloco: "meses sem visita aparecem sem valor".
      'visitas', coalesce((
        select jsonb_agg(jsonb_build_object('ano', ano, 'mes', mes, 'area_id', area_id, 'area_texto', area_texto,
                                            'servico', servico, 'fase', fase, 'n', n))
          from (select ano, mes, area_id, area_texto, servico, fase, count(distinct os_id) as n
                  from leituras group by 1, 2, 3, 4, 5, 6) x), '[]'::jsonb),
      'status', coalesce((
        select jsonb_agg(jsonb_build_object('ano', ano, 'mes', mes, 'area_id', area_id, 'area_texto', area_texto,
                                            'servico', servico, 'fase', fase, 'codigo', status_codigo, 'n', n))
          from (select ano, mes, area_id, area_texto, servico, fase, status_codigo, count(*) as n
                  from leituras where servico in ('PI', 'PA') and status_codigo is not null
                 group by 1, 2, 3, 4, 5, 6, 7) x), '[]'::jsonb),
      'contagens', coalesce((
        select jsonb_agg(jsonb_build_object('ano', ano, 'mes', mes, 'area_id', area_id, 'area_texto', area_texto,
                                            'servico', servico, 'especie', especie, 'total', total))
          from (select l.ano, l.mes, l.area_id, l.area_texto, l.servico, c.key as especie, sum(c.value::numeric) as total
                  from leituras l, jsonb_each_text(coalesce(l.contagens, '{}'::jsonb)) c
                 where l.servico in ('AL', 'PG') and c.value ~ '^[0-9]+(\.[0-9]+)?$'
                 group by 1, 2, 3, 4, 5, 6) x), '[]'::jsonb),
      'ocorrencias', coalesce((
        select jsonb_agg(jsonb_build_object('ano', ano, 'mes', mes, 'area_id', area_id, 'area_texto', area_texto, 'n', n))
          from (select ano, mes, area_id, area_texto, count(*) as n
                  from leituras where servico = 'OC' and situacao = 'nao_conforme'
                 group by 1, 2, 3, 4) x), '[]'::jsonb),
      'capturas', coalesce((
        select jsonb_agg(jsonb_build_object('ano', ano, 'mes', mes, 'area_id', area_id, 'especie', especie, 'n', n))
          from (select extract(year from h.data)::int as ano, extract(month from h.data)::int as mes,
                       cp.area_id, k.especie, count(*) as n
                  from os_capturas_nao_alvo k
                  join historico h on h.id = k.os_id
                  join cliente_pontos cp on cp.id = k.cliente_ponto_id
                 group by 1, 2, 3, 4) x), '[]'::jsonb)
    ),
    'areas', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'nome', a.nome, 'ordem', a.ordem) order by a.ordem, a.nome)
        from cliente_areas a where a.cliente_id = v_os.cliente_id and a.ativo), '[]'::jsonb),
    'visitas', coalesce((
      select jsonb_agg(jsonb_build_object('os_id', v.id, 'codigo', v.codigo, 'data', v.data) order by v.data, v.codigo)
        from visitas v), '[]'::jsonb),
    -- Planos desta OS: dão os serviços do relatório e a frequência de cada um.
    'planos', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'servico', p.servico_codigo, 'tipo_controle', p.tipo_controle,
                                          'frequencia', p.frequencia, 'observacao', p.observacao,
                                          'lampada_instalacao', p.lampada_instalacao, 'lampada_validade', p.lampada_validade))
        from os_planos_controle p where p.os_id = _os_id), '[]'::jsonb),
    -- Leituras de todas as visitas do período, nos serviços desta OS.
    'pontos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'os_id', p.os_id, 'id', pt.id, 'cliente_ponto_id', pt.cliente_ponto_id,
               'area_id', cp.area_id, 'area_texto', pt.area, 'servico', p.servico_codigo,
               'fase', pt.fase, 'numero', pt.numero, 'local', coalesce(cp.local, pt.identificacao),
               'situacao', pt.situacao, 'status_codigo', pt.status_codigo, 'status_rotulo', pt.status_rotulo,
               'contagens', pt.contagens, 'sem_ocorrencia', pt.sem_ocorrencia,
               'observacao', pt.observacao, 'acao_corretiva', pt.acao_corretiva))
        from os_plano_pontos pt
        join os_planos_controle p on p.id = pt.plano_id
        join visitas v on v.id = p.os_id
        left join cliente_pontos cp on cp.id = pt.cliente_ponto_id
       where p.servico_codigo in (select q.servico_codigo from os_planos_controle q where q.os_id = _os_id)), '[]'::jsonb),
    -- Fotos da execução (galeria em Campos complementares). Pelo relatório,
    -- e não por os_anexos: quem tem só o módulo Relatórios não lê os_anexos.
    'fotos', coalesce((
      select jsonb_agg(jsonb_build_object('id', f.id, 'nome', f.nome, 'caminho', f.arquivo_url, 'ponto_id', f.ponto_id) order by f.created_at)
        from os_anexos f where f.os_id = _os_id and f.tipo = 'foto' and f.arquivo_url is not null), '[]'::jsonb),
    'aplicacoes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'produto', pr.nome, 'lote', a.lote, 'tecnica', a.tecnica,
               'quantidade', a.quantidade, 'unidade', a.unidade, 'areas', coalesce(a.areas, '{}')) order by a.created_at)
        from os_aplicacoes a left join produtos pr on pr.id = a.produto_id
       where a.os_id = _os_id), '[]'::jsonb),
    -- Placas adesivas do mapa: são as linhas da Captura Não-Alvo, mesmo sem captura.
    'placas', coalesce((
      select jsonb_agg(jsonb_build_object('id', cp.id, 'area_id', cp.area_id, 'fase', cp.fase,
                                          'numero', cp.numero, 'local', cp.local) order by cp.numero)
        from cliente_pontos cp
       where cp.cliente_id = v_os.cliente_id and cp.servico_codigo = 'PA' and cp.ativo), '[]'::jsonb),
    'capturas', coalesce((
      select jsonb_agg(jsonb_build_object('os_id', k.os_id, 'cliente_ponto_id', k.cliente_ponto_id, 'especie', k.especie))
        from os_capturas_nao_alvo k join visitas v on v.id = k.os_id), '[]'::jsonb),
    'especies_nao_alvo', coalesce((
      select jsonb_agg(c.nome order by c.ordem nulls last, c.nome)
        from catalogo_itens c where c.catalogo = 'monitoramento_capturas_nao_alvo' and c.ativo), '[]'::jsonb),
    -- Legendas da Planilha por tipo de serviço (rótulo e cor do código 1–4).
    'legendas', coalesce((
      select jsonb_agg(jsonb_build_object('tipo_servico', l.tipo_servico, 'servico', l.servico_codigo,
                                          'codigo', l.codigo, 'nome', l.nome, 'cor_bg', l.cor_bg, 'cor_fg', l.cor_fg)
                       order by l.servico_codigo, l.codigo)
        from planilha_itens l where l.ativo and l.servico_codigo is not null and l.codigo is not null), '[]'::jsonb)
  ) into v_saida;

  return v_saida;
end;
$$;

