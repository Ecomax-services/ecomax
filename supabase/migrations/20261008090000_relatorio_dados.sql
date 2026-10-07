-- ============================================================================
-- Dados do relatório técnico e Captura Não-Alvo — Release 4, Fase 3 (PR 22)
-- ============================================================================
-- O relatório técnico aprovado mostra, por bloco (área × serviço × fase), os
-- pontos e o status de cada um nas visitas do período, a contagem por
-- armadilha, as aplicações e as ocorrências. Este PR traz:
--
--   1. `os_capturas_nao_alvo`: a Captura Não-Alvo é lançada no Backoffice,
--      não no App (decisão da release; o App aprovado não tem esse registro).
--      Uma espécie por placa adesiva por visita, como na grade do protótipo.
--   2. `relatorio_dados(_os_id)`: os dados crus do relatório num só lugar,
--      para a tela e para o PDF. Quem monta os blocos a partir deles é
--      `shared/relatorio.ts`, o mesmo código no Backoffice e na Edge Function
--      — tela e PDF não podem divergir.
--
-- Período das visitas: os 28 dias que terminam no dia da execução da OS. É o
-- que cabem as 4 visitas semanais, as 2 quinzenais ou a visita mensal do
-- protótipo — que inventava as datas; aqui são as visitas executadas de fato
-- (cada visita é uma OS desde o PR 4). Um ponto é o mesmo de uma visita para
-- outra pelo mapa do cliente (`cliente_pontos`).
--   [A DEFINIR — confirmar com o cliente o período do relatório.]
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Captura Não-Alvo
-- ----------------------------------------------------------------------------

create table public.os_capturas_nao_alvo (
  id                uuid primary key default gen_random_uuid(),
  os_id             uuid not null references public.ordens_servico (id) on delete cascade,
  -- A placa adesiva (PA) do mapa do cliente onde houve a captura.
  cliente_ponto_id  uuid not null references public.cliente_pontos (id) on delete restrict,
  -- Uma das espécies do catálogo `monitoramento_capturas_nao_alvo`.
  especie           text not null,
  created_by        uuid references auth.users (id) on delete set null default auth.uid(),
  created_at        timestamptz not null default now(),
  unique (os_id, cliente_ponto_id)
);

comment on table public.os_capturas_nao_alvo is
  'Captura Não-Alvo por placa adesiva e visita, lançada no Backoffice. Situação atípica: o bloco sai oculto por padrão no relatório.';

-- A placa tem de ser placa adesiva do cliente da OS, e a espécie, do catálogo.
create or replace function public.os_captura_confere()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from cliente_pontos cp
      join ordens_servico o on o.cliente_id = cp.cliente_id
     where cp.id = new.cliente_ponto_id and o.id = new.os_id and cp.servico_codigo = 'PA'
  ) then
    raise exception 'A captura não-alvo é lançada numa placa adesiva do cliente desta OS.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from catalogo_itens c
     where c.catalogo = 'monitoramento_capturas_nao_alvo' and c.ativo and c.nome = new.especie
  ) then
    raise exception 'Espécie fora da lista de capturas não-alvo.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger os_captura_confere
  before insert or update on public.os_capturas_nao_alvo
  for each row execute function public.os_captura_confere();

alter table public.os_capturas_nao_alvo enable row level security;

create policy os_capturas_nao_alvo_select on public.os_capturas_nao_alvo
  for select to authenticated using (public.has_module_perm('relatorios', 'ler'));
create policy os_capturas_nao_alvo_insert on public.os_capturas_nao_alvo
  for insert to authenticated with check (public.has_module_perm('relatorios', 'editar'));
create policy os_capturas_nao_alvo_update on public.os_capturas_nao_alvo
  for update to authenticated
  using (public.has_module_perm('relatorios', 'editar'))
  with check (public.has_module_perm('relatorios', 'editar'));
create policy os_capturas_nao_alvo_delete on public.os_capturas_nao_alvo
  for delete to authenticated using (public.has_module_perm('relatorios', 'editar'));

grant select, insert, update, delete on public.os_capturas_nao_alvo to authenticated;
grant all on public.os_capturas_nao_alvo to service_role;


-- ----------------------------------------------------------------------------
-- 2. relatorio_dados
-- ----------------------------------------------------------------------------
-- Dados crus, sem regra de apresentação. Lê quem tem Relatórios › ler, e a
-- Edge Function do PDF com a chave de serviço.

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

revoke all on function public.relatorio_dados(uuid) from public, anon;
grant execute on function public.relatorio_dados(uuid) to authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 3. Lista "Relatórios técnicos"
-- ----------------------------------------------------------------------------
-- "OS disponíveis para relatório técnico · Somente OS executada ou
-- concluída". Pela mesma regra de acesso do relatório (Relatórios › ler):
-- quem tem o módulo Relatórios e não tem o Operacional também vê a lista.

create or replace function public.listar_relatorios_tecnicos()
returns table (
  os_id uuid,
  codigo text,
  cliente text,
  tipos text[],
  data_execucao date,
  status_os text,
  versao_atual integer,
  versao_publicada integer,
  publicado_em timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not has_module_perm('relatorios', 'ler') then
    raise exception 'Você não tem acesso aos relatórios técnicos.' using errcode = '42501';
  end if;
  return query
  select o.id, o.codigo, coalesce(c.razao_social, c.nome), coalesce(o.tipos_servico, '{}'),
         coalesce((o.termino_execucao at time zone 'America/Sao_Paulo')::date,
                  (o.check_out_at at time zone 'America/Sao_Paulo')::date,
                  o.data_programada),
         o.status, r.versao_atual, r.versao_publicada, r.publicado_em
    from os_relatorios_tecnicos r
    join ordens_servico o on o.id = r.os_id
    join clientes c on c.id = o.cliente_id
   order by 5 desc nulls last, o.codigo desc;
end;
$$;

revoke all on function public.listar_relatorios_tecnicos() from public, anon;
grant execute on function public.listar_relatorios_tecnicos() to authenticated;
