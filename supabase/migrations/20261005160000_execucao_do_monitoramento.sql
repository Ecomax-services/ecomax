-- ============================================================================
-- Execução do monitoramento — Release 4, Fase 1, PR 3
-- ============================================================================
-- Prepara a OS para receber o que o App aprovado registra em campo: status
-- 1–4 do porta-isca e da placa, contagem por espécie da armadilha luminosa e
-- de grãos, ocorrência por setor, aplicação da desinsetização, lâmpada,
-- reposição ao almoxarifado e as três assinaturas.
--
-- A regra que atravessa o arquivo: **nada do que funciona hoje muda**.
--
--   - Plano antigo (sem `servico_codigo`) continua exatamente como está: a
--     situação do ponto é escrita à mão pelo Backoffice.
--   - Plano novo (com `servico_codigo`) tem a situação CALCULADA a partir do
--     que o técnico registrou. A coluna `situacao` continua existindo e
--     continua com os mesmos quatro valores, então o contador "3/5 pontos", o
--     EmitirOs e a aba Mapeamento do Portal seguem funcionando sem mudança.
--   - Uma OS só entra no modelo novo quando o cliente tem mapa cadastrado
--     (`preparar_monitoramento_os`). Hoje nenhum cliente tem, então nenhuma
--     OS muda de comportamento até o cadastro do mapa chegar ao Backoffice.
--
-- A gravação em campo não acontece aqui: é a RPC `registrar_execucao`, no
-- PR 7, que grava tudo de uma vez. Por isso as tabelas novas não têm policy
-- de escrita para o técnico.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Plano de controle
-- ----------------------------------------------------------------------------
-- Um tipo de controle pode abrir mais de um serviço (Controle Roedores abre
-- PI e PA), e cada serviço é um plano: a grade, o contador e o bloqueio de
-- avanço do App são por serviço. A unicidade passa a incluir o serviço; o
-- nome da constraint fica o mesmo porque a mensagem de erro da tela é
-- procurada por ele.

alter table public.os_planos_controle
  add column servico_codigo     text references public.monitoramento_servicos (codigo),
  add column observacao         text,
  add column lampada_instalacao date,
  add column lampada_validade   date;

comment on column public.os_planos_controle.servico_codigo is
  'Serviço de monitoramento do plano. Nulo = plano anterior à Release 4, preenchido à mão.';
comment on column public.os_planos_controle.lampada_validade is
  'Armadilha Luminosa: uma validade para todas as armadilhas do serviço (aprovado em 17/09).';

alter table public.os_planos_controle
  drop constraint os_planos_controle_os_id_tipo_controle_key,
  add constraint os_planos_controle_os_id_tipo_controle_key
    unique nulls not distinct (os_id, tipo_controle, servico_codigo),
  add constraint os_planos_controle_lampada_so_al
    check ((lampada_instalacao is null and lampada_validade is null) or servico_codigo = 'AL'),
  add constraint os_planos_controle_lampada_ordem
    check (lampada_validade is null or lampada_instalacao is null or lampada_validade >= lampada_instalacao);


-- ----------------------------------------------------------------------------
-- 2. Ponto da OS
-- ----------------------------------------------------------------------------
-- O ponto da OS é a LEITURA de um ponto do mapa naquela visita. Área, fase,
-- número e local são copiados do mapa: se o cliente renomear "Doca 3" amanhã,
-- o registro de hoje continua dizendo onde o técnico esteve.

alter table public.os_plano_pontos
  add column cliente_ponto_id uuid references public.cliente_pontos (id),
  add column area             text,
  add column fase             smallint check (fase is null or fase >= 1),
  add column status_codigo    smallint check (status_codigo is null or status_codigo between 1 and 4),
  add column status_rotulo    text,
  add column contagens        jsonb,
  add column sem_ocorrencia   boolean not null default false,
  add column acao_corretiva   text;

comment on column public.os_plano_pontos.status_rotulo is
  'Rótulo da legenda no momento do registro. O código é o que vale; o rótulo é para leitura.';
comment on column public.os_plano_pontos.contagens is
  'Contagem por espécie (AL, PG) ou por praga (OC): {"Mosca Doméstica": 6}.';

-- O número deixa de ser único no plano: com fases, a numeração pode
-- recomeçar dentro da mesma área. No plano antigo a regra continua valendo,
-- com o mesmo nome — é por ele que a tela traduz o erro.
alter table public.os_plano_pontos drop constraint os_plano_pontos_plano_id_numero_key;
create unique index os_plano_pontos_plano_id_numero_key
  on public.os_plano_pontos (plano_id, numero) where cliente_ponto_id is null;
alter table public.os_plano_pontos
  add constraint os_plano_pontos_plano_id_cliente_ponto_id_key unique (plano_id, cliente_ponto_id),
  add constraint os_plano_pontos_contagens_objeto
    check (contagens is null or jsonb_typeof(contagens) = 'object');

create index os_plano_pontos_cliente_ponto_idx on public.os_plano_pontos (cliente_ponto_id);


-- ----------------------------------------------------------------------------
-- 3. Situação calculada
-- ----------------------------------------------------------------------------
-- Só no plano novo. A tradução do status para a situação é a do relatório
-- aprovado: 3 (intacta) é conforme; 1 e 2 (consumida, mofada, com ocorrência,
-- danificada) são não conforme; 4 (obstruído) é inacessível.

create or replace function public.os_ponto_calcula_situacao()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_servico text;
  v_comportamento text;
  v_valor record;
begin
  select p.servico_codigo, s.comportamento
    into v_servico, v_comportamento
    from os_planos_controle p
    left join monitoramento_servicos s on s.codigo = p.servico_codigo
   where p.id = new.plano_id;

  -- Plano antigo: situação escrita à mão, como sempre foi.
  if v_servico is null then
    return new;
  end if;

  if new.status_codigo is not null and v_comportamento <> 'status' then
    raise exception 'O serviço % não registra status 1–4.', v_servico using errcode = '23514';
  end if;

  if new.contagens is not null then
    if v_comportamento not in ('contagem', 'ocorrencia') then
      raise exception 'O serviço % não registra contagem.', v_servico using errcode = '23514';
    end if;
    -- Dois testes separados de propósito: o `or` do SQL não garante a ordem,
    -- e o cast de um texto para número estouraria antes da mensagem certa.
    for v_valor in select key, value from jsonb_each(new.contagens) loop
      if jsonb_typeof(v_valor.value) <> 'number' then
        raise exception 'Contagem inválida para "%": informe um número inteiro a partir de zero.', v_valor.key
          using errcode = '23514';
      end if;
      if (v_valor.value)::numeric < 0 or (v_valor.value)::numeric <> trunc((v_valor.value)::numeric) then
        raise exception 'Contagem inválida para "%": informe um número inteiro a partir de zero.', v_valor.key
          using errcode = '23514';
      end if;
    end loop;
  end if;

  if new.sem_ocorrencia then
    if v_comportamento <> 'ocorrencia' then
      raise exception 'Só a Ocorrência Setorial registra "sem ocorrência".' using errcode = '23514';
    end if;
    if new.contagens is not null and new.contagens <> '{}'::jsonb then
      raise exception 'Setor marcado sem ocorrência não pode ter pragas contadas.' using errcode = '23514';
    end if;
  end if;

  if new.status_codigo is distinct from (case when tg_op = 'UPDATE' then old.status_codigo end) then
    select pi.nome into new.status_rotulo
      from planilha_itens pi
     where pi.servico_codigo = v_servico and pi.codigo = new.status_codigo;
  end if;

  new.situacao := case v_comportamento
    when 'status' then
      case new.status_codigo
        when 3 then 'conforme'
        when 1 then 'nao_conforme'
        when 2 then 'nao_conforme'
        when 4 then 'inacessivel'
        else 'pendente'
      end
    when 'ocorrencia' then
      case
        when new.sem_ocorrencia then 'conforme'
        when new.contagens is not null and new.contagens <> '{}'::jsonb then 'nao_conforme'
        else 'pendente'
      end
    -- [A DEFINIR — captura em Armadilha Luminosa e Pragas de Grãos conta como
    -- não conforme?] Provisório: armadilha lida é "conforme", isto é,
    -- verificada. Muda aqui e só aqui quando o cliente responder.
    when 'contagem' then
      case when new.contagens is not null then 'conforme' else 'pendente' end
    else new.situacao
  end;

  return new;
end;
$$;

create trigger os_ponto_calcula_situacao
  before insert or update on public.os_plano_pontos
  for each row execute function public.os_ponto_calcula_situacao();


-- ----------------------------------------------------------------------------
-- 4. Aplicações da Desinsetização
-- ----------------------------------------------------------------------------
-- A DI não tem ponto: o técnico registra o que aplicou, como e onde.

create table public.os_aplicacoes (
  id          uuid primary key default gen_random_uuid(),
  os_id       uuid not null references public.ordens_servico (id) on delete cascade,
  plano_id    uuid not null references public.os_planos_controle (id) on delete cascade,
  produto_id  uuid not null references public.produtos (id) on delete restrict,
  lote        text,
  tecnica     text not null check (length(btrim(tecnica)) > 0),
  quantidade  numeric not null check (quantidade > 0),
  unidade     text not null,
  -- Nomes das áreas, copiados do mapa como no ponto.
  areas       text[] not null check (cardinality(areas) > 0),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on table public.os_aplicacoes is
  'Registro de aplicação da Desinsetização (DI): produto, técnica, quantidade e áreas.';

create index os_aplicacoes_os_idx on public.os_aplicacoes (os_id);

-- O plano tem de ser da mesma OS e ser de Desinsetização.
create or replace function public.os_aplicacao_confere_plano()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from os_planos_controle p
     where p.id = new.plano_id and p.os_id = new.os_id and p.servico_codigo = 'DI'
  ) then
    raise exception 'A aplicação precisa estar num plano de Desinsetização desta OS.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger os_aplicacao_confere_plano
  before insert or update on public.os_aplicacoes
  for each row execute function public.os_aplicacao_confere_plano();


-- ----------------------------------------------------------------------------
-- 5. Reposição ao almoxarifado
-- ----------------------------------------------------------------------------
-- A etapa "Reposição" do App: produtos e quantidades, mais uma observação
-- única para o almoxarifado.
--
-- [A DEFINIR — como o almoxarifado dá baixa na solicitação (status,
-- atendimento parcial, quem atende)?] O protótipo só mostra o envio.

create table public.os_reposicoes (
  id          uuid primary key default gen_random_uuid(),
  os_id       uuid not null unique references public.ordens_servico (id) on delete cascade,
  observacao  text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.os_reposicao_itens (
  id            uuid primary key default gen_random_uuid(),
  reposicao_id  uuid not null references public.os_reposicoes (id) on delete cascade,
  produto_id    uuid not null references public.produtos (id) on delete restrict,
  quantidade    numeric not null check (quantidade > 0),
  unique (reposicao_id, produto_id)
);

comment on table public.os_reposicoes is
  'Solicitação de reposição ao almoxarifado feita pelo técnico ao fim da execução.';


-- ----------------------------------------------------------------------------
-- 6. Produtos da OS: o mesmo produto com dois lotes
-- ----------------------------------------------------------------------------
-- No campo o técnico pode terminar um lote e abrir outro do mesmo produto. A
-- unicidade passa a ser por lote; o nome fica o mesmo pela mensagem da tela.

alter table public.os_produtos
  drop constraint os_produtos_os_id_produto_id_key,
  add constraint os_produtos_os_id_produto_id_key unique nulls not distinct (os_id, produto_id, lote);


-- ----------------------------------------------------------------------------
-- 7. Foto por ponto
-- ----------------------------------------------------------------------------

alter table public.os_anexos
  add column ponto_id uuid references public.os_plano_pontos (id) on delete set null;

create index os_anexos_ponto_idx on public.os_anexos (ponto_id) where ponto_id is not null;

-- Sem esta conferência, a foto de um ponto poderia ser pendurada numa OS de
-- outro cliente — e o Portal mostraria o anexo pelo dono da OS.
create or replace function public.os_anexo_confere_ponto()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.ponto_id is not null and not exists (
    select 1 from os_plano_pontos pt
      join os_planos_controle p on p.id = pt.plano_id
     where pt.id = new.ponto_id and p.os_id = new.os_id
  ) then
    raise exception 'O ponto da foto não pertence a esta OS.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger os_anexo_confere_ponto
  before insert or update of ponto_id, os_id on public.os_anexos
  for each row execute function public.os_anexo_confere_ponto();


-- ----------------------------------------------------------------------------
-- 8. Ordem de serviço: assinaturas e envio idempotente
-- ----------------------------------------------------------------------------
-- O certificado aprovado leva três assinaturas: cliente, técnico e
-- responsável técnico. A do cliente já existia (`assinatura_url`); faltavam
-- quem assinou por ele e a do técnico. A do RT vem do cadastro da empresa
-- (PR 6), não da OS.

alter table public.ordens_servico
  add column assinante_nome          text,
  add column assinante_cpf           text check (assinante_cpf is null or assinante_cpf ~ '^[0-9]{11}$'),
  add column assinante_cargo         text,
  add column tecnico_executor_id     uuid references public.funcionarios (id),
  add column tecnico_assinatura_url  text,
  -- Gerado no aparelho ao começar a execução. O envio pode chegar duas vezes
  -- com sinal ruim; a segunda é reconhecida por este valor e não grava nada.
  add column execucao_uuid           uuid unique;

comment on column public.ordens_servico.assinante_cpf is
  'CPF de quem assinou pelo cliente, só dígitos. [A DEFINIR — mascarar no PDF e no Portal (LGPD)?]';


-- ----------------------------------------------------------------------------
-- 9. Preparar a OS a partir do mapa do cliente
-- ----------------------------------------------------------------------------
-- Converte os planos da OS para o modelo novo e cria os pontos a partir do
-- mapa. Roda com os privilégios de quem chama: a RLS de planos e pontos
-- continua decidindo quem pode.
--
-- Só age se o cliente tem mapa cadastrado. Sem mapa, a OS fica no modelo
-- antigo e o Backoffice preenche os pontos como hoje.
--
-- Pode ser chamada de novo sem efeito: plano já convertido não se converte
-- outra vez, e plano que já tem pontos não ganha pontos novos.

create or replace function public.preparar_monitoramento_os(_os_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cliente uuid;
  v_plano record;
  v_codigos text[];
  v_criados integer := 0;
  n integer;
begin
  select cliente_id into v_cliente from ordens_servico where id = _os_id;
  if v_cliente is null then
    raise exception 'OS não encontrada.' using errcode = 'P0002';
  end if;

  if not exists (select 1 from cliente_areas where cliente_id = v_cliente and ativo) then
    return 0;
  end if;

  -- Planos antigos com tipo de controle mapeado viram um plano por serviço.
  for v_plano in
    select * from os_planos_controle where os_id = _os_id and servico_codigo is null
  loop
    select array_agg(m.servico_codigo order by s.ordem)
      into v_codigos
      from monitoramento_mapeamento m
      join catalogo_itens c on c.id = m.catalogo_item_id
      join monitoramento_servicos s on s.codigo = m.servico_codigo
     where c.catalogo = 'tipos_controle' and c.nome = v_plano.tipo_controle;

    continue when v_codigos is null;
    -- Plano antigo que já tem ponto preenchido à mão não se converte: os
    -- pontos dele não têm de onde vir do mapa.
    continue when exists (select 1 from os_plano_pontos where plano_id = v_plano.id);

    update os_planos_controle set servico_codigo = v_codigos[1] where id = v_plano.id;

    insert into os_planos_controle (os_id, tipo_controle, frequencia, pontos_previstos, servico_codigo)
    select _os_id, v_plano.tipo_controle, v_plano.frequencia, 0, c
      from unnest(v_codigos[2:]) as c
    on conflict do nothing;
  end loop;

  -- Pontos do mapa para cada plano novo que ainda não tem nenhum.
  for v_plano in
    select p.* from os_planos_controle p
      join monitoramento_servicos s on s.codigo = p.servico_codigo
     where p.os_id = _os_id and s.comportamento <> 'aplicacao'
       and not exists (select 1 from os_plano_pontos pt where pt.plano_id = p.id)
  loop
    insert into os_plano_pontos (plano_id, cliente_ponto_id, area, fase, numero, identificacao)
    select v_plano.id, cp.id, a.nome, cp.fase, cp.numero, cp.local
      from cliente_pontos cp
      join cliente_areas a on a.id = cp.area_id
     where cp.cliente_id = v_cliente and cp.servico_codigo = v_plano.servico_codigo
       and cp.ativo and a.ativo;
    get diagnostics n = row_count;

    update os_planos_controle set pontos_previstos = n where id = v_plano.id;
    v_criados := v_criados + n;
  end loop;

  return v_criados;
end;
$$;

revoke all on function public.preparar_monitoramento_os(uuid) from public, anon;
grant execute on function public.preparar_monitoramento_os(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 10. RLS das tabelas novas
-- ----------------------------------------------------------------------------
-- Leitura: Backoffice com Operacional, o técnico nas OS dele. A reposição
-- também é do almoxarifado, que lê pelo Estoque. O Portal não lê nenhuma
-- destas: o que o cliente vê da execução sai no relatório e no certificado.
--
-- Escrita do Backoffice com Operacional (correção antes de publicar). O
-- técnico escreve só pela RPC `registrar_execucao` (PR 7).

alter table public.os_aplicacoes      enable row level security;
alter table public.os_reposicoes      enable row level security;
alter table public.os_reposicao_itens enable row level security;

create policy os_aplicacoes_select on public.os_aplicacoes
  for select to authenticated
  using (public.has_module_perm('operacional', 'ler') or public.os_is_mine(os_id));
create policy os_aplicacoes_write on public.os_aplicacoes
  for all to authenticated
  using (public.has_module_perm('operacional', 'editar'))
  with check (public.has_module_perm('operacional', 'editar'));

create policy os_reposicoes_select on public.os_reposicoes
  for select to authenticated
  using (public.has_module_perm('operacional', 'ler') or public.has_module_perm('estoque', 'ler')
         or public.os_is_mine(os_id));
create policy os_reposicoes_write on public.os_reposicoes
  for all to authenticated
  using (public.has_module_perm('operacional', 'editar'))
  with check (public.has_module_perm('operacional', 'editar'));

create policy os_reposicao_itens_select on public.os_reposicao_itens
  for select to authenticated
  using (exists (
    select 1 from public.os_reposicoes r
     where r.id = reposicao_id
       and (public.has_module_perm('operacional', 'ler') or public.has_module_perm('estoque', 'ler')
            or public.os_is_mine(r.os_id))
  ));
create policy os_reposicao_itens_write on public.os_reposicao_itens
  for all to authenticated
  using (public.has_module_perm('operacional', 'editar'))
  with check (public.has_module_perm('operacional', 'editar'));

revoke all on public.os_aplicacoes, public.os_reposicoes, public.os_reposicao_itens from anon;
grant select, insert, update, delete
  on public.os_aplicacoes, public.os_reposicoes, public.os_reposicao_itens to authenticated;
grant all on public.os_aplicacoes, public.os_reposicoes, public.os_reposicao_itens to service_role;
