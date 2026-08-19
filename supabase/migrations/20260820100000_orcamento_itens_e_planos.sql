-- Telas 3.1.1 (Elaborar orçamento) e 3.1.3 (Emitir ordem de serviço).
--
-- As duas estavam ausentes, e nenhuma tinha onde guardar dado. O orçamento
-- existia como cabeçalho — código, data, status, valor total digitado — sem os
-- itens que compõem esse valor. E a OS não tinha os planos de controle que a
-- tela de emissão precisa listar.

-- ---------------------------------------------------------------------------
-- 1. Itens do orçamento
-- ---------------------------------------------------------------------------
-- A grade do design é tipo de controle × frequência × valor por serviço.
create table if not exists public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  tipo_controle text not null,           -- catálogo 'tipos_controle'
  frequencia text not null,              -- catálogo 'frequencias'
  valor numeric(12,2) not null default 0 check (valor >= 0),
  created_at timestamptz not null default now(),
  -- Um tipo de controle aparece uma vez por orçamento: a linha tem frequência e
  -- valor próprios, e repetir o tipo tornaria ambíguo o que foi contratado.
  unique (orcamento_id, tipo_controle)
);

create index if not exists orcamento_itens_idx on public.orcamento_itens (orcamento_id);

-- O total do orçamento passa a ser derivado dos itens, e não digitado à mão.
-- Digitado, ele diverge da grade no primeiro ajuste e ninguém percebe.
create or replace function public.recalcular_total_orcamento()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare alvo uuid := coalesce(new.orcamento_id, old.orcamento_id);
begin
  update public.orcamentos
  set valor_total = coalesce((select sum(valor) from public.orcamento_itens where orcamento_id = alvo), 0)
  where id = alvo;
  return null;
end $$;

drop trigger if exists orcamento_itens_total on public.orcamento_itens;
create trigger orcamento_itens_total
  after insert or update or delete on public.orcamento_itens
  for each row execute function public.recalcular_total_orcamento();

-- Gestor responsável pelo orçamento (campo da tela 3.1.1).
alter table public.orcamentos add column if not exists gestor_id uuid
  references public.funcionarios(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 2. Planos de controle da OS
-- ---------------------------------------------------------------------------
-- "Apenas os planos contratados no orçamento de origem." O plano nasce do item
-- do orçamento; os pontos são o mapeamento físico do local.
create table if not exists public.os_planos_controle (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  tipo_controle text not null,
  frequencia text,
  pontos_previstos integer not null default 0 check (pontos_previstos >= 0),
  created_at timestamptz not null default now(),
  unique (os_id, tipo_controle)
);

create index if not exists os_planos_idx on public.os_planos_controle (os_id);

create table if not exists public.os_plano_pontos (
  id uuid primary key default gen_random_uuid(),
  plano_id uuid not null references public.os_planos_controle(id) on delete cascade,
  numero integer not null check (numero > 0),
  identificacao text,
  situacao text not null default 'pendente'
    check (situacao in ('pendente', 'conforme', 'nao_conforme', 'inacessivel')),
  observacao text,
  preenchido_em timestamptz,
  preenchido_por uuid references auth.users(id) on delete set null,
  unique (plano_id, numero)
);

create index if not exists os_plano_pontos_idx on public.os_plano_pontos (plano_id);

-- O contador "3/5 pontos" da tela sai daqui, e não de um campo mantido à mão.
create or replace function public.contar_pontos_preenchidos(_plano_id uuid)
returns integer language sql stable security definer set search_path to 'public'
as $$
  select count(*)::integer from public.os_plano_pontos
  where plano_id = _plano_id and situacao <> 'pendente';
$$;

-- ---------------------------------------------------------------------------
-- 3. Campos de execução da OS
-- ---------------------------------------------------------------------------
-- O bloco "Dados da execução" da tela 3.1.3 pede nove campos que não existiam.
alter table public.ordens_servico add column if not exists hora_comprometida text;
alter table public.ordens_servico add column if not exists inicio_execucao timestamptz;
alter table public.ordens_servico add column if not exists termino_execucao timestamptz;
alter table public.ordens_servico add column if not exists etapa text
  check (etapa is null or etapa in ('Planejamento', 'Execução', 'Revisão'));
alter table public.ordens_servico add column if not exists contato text;
alter table public.ordens_servico add column if not exists data_validade date;
alter table public.ordens_servico add column if not exists email_enviado boolean not null default false;
alter table public.ordens_servico add column if not exists email_enviado_em timestamptz;

-- ---------------------------------------------------------------------------
-- 4. Situações da OS
-- ---------------------------------------------------------------------------
-- O fluxo do design tem dez ações, e algumas delas são status novos. As cinco
-- situações antigas ficam: elas estão em uso no app do operador e no portal, e
-- trocá-las de nome quebraria os dois de uma vez.
--
-- 'emitida' e 'confirmada' entram entre 'em_aberto' e 'em_andamento';
-- 'remarcada' e 'nao_executada' são desfechos alternativos.
alter table public.ordens_servico drop constraint if exists ordens_servico_status_check;
alter table public.ordens_servico add constraint ordens_servico_status_check
  check (status in (
    'em_aberto', 'emitida', 'confirmada', 'em_andamento',
    'executada', 'concluida', 'remarcada', 'nao_executada', 'cancelada'
  ));

-- ---------------------------------------------------------------------------
-- 5. RLS e acesso
-- ---------------------------------------------------------------------------
alter table public.orcamento_itens enable row level security;
alter table public.os_planos_controle enable row level security;
alter table public.os_plano_pontos enable row level security;

-- Itens do orçamento seguem o módulo de clientes, onde o orçamento vive.
create policy orcamento_itens_all on public.orcamento_itens
  for all to authenticated
  using (public.has_module_perm('gestao_clientes', 'ler'))
  with check (public.has_module_perm('gestao_clientes', 'editar'));

-- Planos e pontos seguem o Operacional, e o operador enxerga os da OS dele —
-- é ele quem preenche o ponto em campo.
create policy os_planos_select on public.os_planos_controle
  for select to authenticated
  using (public.has_module_perm('operacional', 'ler') or public.os_is_mine(os_id));
create policy os_planos_write on public.os_planos_controle
  for all to authenticated
  using (public.has_module_perm('operacional', 'editar'))
  with check (public.has_module_perm('operacional', 'editar'));

create policy os_pontos_select on public.os_plano_pontos
  for select to authenticated
  using (exists (
    select 1 from public.os_planos_controle p
    where p.id = plano_id
      and (public.has_module_perm('operacional', 'ler') or public.os_is_mine(p.os_id))
  ));
create policy os_pontos_write on public.os_plano_pontos
  for all to authenticated
  using (exists (
    select 1 from public.os_planos_controle p
    where p.id = plano_id
      and (public.has_module_perm('operacional', 'editar') or public.os_is_mine(p.os_id))
  ))
  with check (exists (
    select 1 from public.os_planos_controle p
    where p.id = plano_id
      and (public.has_module_perm('operacional', 'editar') or public.os_is_mine(p.os_id))
  ));

grant select, insert, update, delete on public.orcamento_itens to authenticated, service_role;
grant select, insert, update, delete on public.os_planos_controle to authenticated, service_role;
grant select, insert, update, delete on public.os_plano_pontos to authenticated, service_role;
