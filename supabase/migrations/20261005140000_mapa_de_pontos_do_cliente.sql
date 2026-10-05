-- ============================================================================
-- Mapa de pontos do cliente — Release 4, Fase 1, PR 2
-- ============================================================================
-- Hoje os pontos de monitoramento nascem dentro de cada OS
-- (`os_plano_pontos`) e morrem com ela. Não há como dizer que o PI-03 de hoje
-- é o mesmo PI-03 do mês passado, e sem isso não existe histórico por ponto,
-- tendência nem comparativo — que é o que o relatório técnico aprovado mostra.
--
-- Este PR cria o mapa permanente: áreas do cliente e, dentro delas, os pontos
-- por serviço. A OS passa a apontar para o ponto do mapa no PR 3; aqui nada
-- existente muda.
--
-- Estrutura, do protótipo aprovado:
--   área     "Fábrica", "CD" — o filtro de área do App e o índice do relatório
--   serviço  PI, PA, AL, PG, OC — DI não tem ponto: é registro de aplicação
--            por área
--   fase     opcional, numerada (Porta Iscas fase 1, 2, 3 dentro da Fábrica)
--   número   o "03" de PI-03
--   local    "Doca 3", "Corredor do refeitório"
--
-- Quem vê:
--   Backoffice  quem lê Gestão de Clientes ou Operacional (o EmitirOs monta o
--               plano a partir do mapa); escreve quem edita Gestão de Clientes
--   Operador    só o mapa dos clientes das OS em que está escalado; não escreve
--   Portal      só o mapa do próprio cliente; não escreve
--
-- [A DEFINIR — numeração de pontos: corrida por serviço no cliente, ou
-- reinicia por área e fase?] O protótipo do App numera corrido por serviço;
-- o do relatório agrupa por área e fase. A unicidade abaixo (área + serviço +
-- fase + número) aceita os dois esquemas, e a decisão fica para a tela.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Áreas
-- ----------------------------------------------------------------------------

create table public.cliente_areas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes (id) on delete cascade,
  nome        text not null check (length(btrim(nome)) > 0),
  ordem       integer not null default 0,
  ativo       boolean not null default true,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (cliente_id, nome),
  -- Alvo da FK composta do ponto: garante que o ponto e a área são do mesmo
  -- cliente.
  unique (id, cliente_id)
);

comment on table public.cliente_areas is
  'Áreas de atuação do cliente (ex.: Fábrica, CD). Agrupam os pontos e o relatório.';

create index cliente_areas_cliente_idx on public.cliente_areas (cliente_id, ordem);

create trigger set_updated_at before update on public.cliente_areas
  for each row execute function public.set_updated_at();


-- ----------------------------------------------------------------------------
-- Pontos
-- ----------------------------------------------------------------------------
-- `cliente_id` repete o da área de propósito. Com ele, a RLS do ponto é uma
-- comparação direta, sem subconsulta na área para cada linha. A FK composta
-- impede que os dois discordem.

create table public.cliente_pontos (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references public.clientes (id) on delete cascade,
  area_id         uuid not null,
  servico_codigo  text not null references public.monitoramento_servicos (codigo),
  fase            smallint check (fase is null or fase >= 1),
  numero          integer not null check (numero >= 1),
  local           text not null check (length(btrim(local)) > 0),
  ativo           boolean not null default true,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Área com pontos não se apaga: inativa-se. Apagar levaria junto o
  -- histórico dos pontos quando a OS passar a apontar para eles.
  --
  -- `no action`, e não `restrict`: a checagem acontece no fim do comando.
  -- Excluir o cliente apaga áreas e pontos pela cascata acima, e com
  -- `restrict` a área seria barrada no meio do caminho, antes de a cascata
  -- chegar aos pontos.
  foreign key (area_id, cliente_id)
    references public.cliente_areas (id, cliente_id) on delete no action,
  constraint cliente_pontos_servico_com_ponto check (servico_codigo <> 'DI'),
  constraint cliente_pontos_numero_key
    unique nulls not distinct (area_id, servico_codigo, fase, numero)
);

comment on table public.cliente_pontos is
  'Mapa permanente de pontos de monitoramento do cliente. A OS registra a leitura; o ponto é o mesmo de uma visita para outra.';

create index cliente_pontos_cliente_idx on public.cliente_pontos (cliente_id, servico_codigo, numero);

create trigger set_updated_at before update on public.cliente_pontos
  for each row execute function public.set_updated_at();

-- A FK composta de `cliente_pontos` só segura se a área nunca mudar de
-- cliente. Mover uma área levaria os pontos para outro cliente — com o
-- histórico de leitura junto.
create or replace function public.cliente_area_nao_muda_de_cliente()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.cliente_id is distinct from old.cliente_id then
    raise exception 'Uma área não pode ser transferida para outro cliente.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger cliente_area_nao_muda_de_cliente
  before update of cliente_id on public.cliente_areas
  for each row execute function public.cliente_area_nao_muda_de_cliente();

create or replace function public.cliente_ponto_nao_muda_de_cliente()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.cliente_id is distinct from old.cliente_id then
    raise exception 'Um ponto não pode ser transferido para outro cliente.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger cliente_ponto_nao_muda_de_cliente
  before update of cliente_id on public.cliente_pontos
  for each row execute function public.cliente_ponto_nao_muda_de_cliente();


-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

alter table public.cliente_areas  enable row level security;
alter table public.cliente_pontos enable row level security;

-- Backoffice
create policy cliente_areas_select on public.cliente_areas
  for select to authenticated
  using (public.has_module_perm('gestao_clientes', 'ler') or public.has_module_perm('operacional', 'ler'));
create policy cliente_areas_insert on public.cliente_areas
  for insert to authenticated with check (public.has_module_perm('gestao_clientes', 'editar'));
create policy cliente_areas_update on public.cliente_areas
  for update to authenticated
  using (public.has_module_perm('gestao_clientes', 'editar'))
  with check (public.has_module_perm('gestao_clientes', 'editar'));
create policy cliente_areas_delete on public.cliente_areas
  for delete to authenticated using (public.has_module_perm('gestao_clientes', 'editar'));

create policy cliente_pontos_select on public.cliente_pontos
  for select to authenticated
  using (public.has_module_perm('gestao_clientes', 'ler') or public.has_module_perm('operacional', 'ler'));
create policy cliente_pontos_insert on public.cliente_pontos
  for insert to authenticated with check (public.has_module_perm('gestao_clientes', 'editar'));
create policy cliente_pontos_update on public.cliente_pontos
  for update to authenticated
  using (public.has_module_perm('gestao_clientes', 'editar'))
  with check (public.has_module_perm('gestao_clientes', 'editar'));
create policy cliente_pontos_delete on public.cliente_pontos
  for delete to authenticated using (public.has_module_perm('gestao_clientes', 'editar'));

-- Operador em campo: a mesma regra que já decide quais clientes ele enxerga.
create policy cliente_areas_operador_select on public.cliente_areas
  for select to authenticated using (public.cliente_in_my_os(cliente_id));
create policy cliente_pontos_operador_select on public.cliente_pontos
  for select to authenticated using (public.cliente_in_my_os(cliente_id));

-- Portal do Cliente
create policy cliente_areas_portal_select on public.cliente_areas
  for select to authenticated using (cliente_id in (select public.my_portal_cliente_ids()));
create policy cliente_pontos_portal_select on public.cliente_pontos
  for select to authenticated using (cliente_id in (select public.my_portal_cliente_ids()));

-- Grants explícitos: o banco recriado do zero não dá privilégio padrão a
-- tabela nova. A RLS acima decide o resto.
revoke all on public.cliente_areas, public.cliente_pontos from anon;
grant select, insert, update, delete on public.cliente_areas, public.cliente_pontos to authenticated;
grant all on public.cliente_areas, public.cliente_pontos to service_role;
