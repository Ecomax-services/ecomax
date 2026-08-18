-- Módulo Operacional (Ordens de Serviço) — schema base.
-- Reusa clientes/orcamentos (Gestão de Clientes), funcionarios (Gestão de Usuários) e
-- produtos/estoque_lotes (Estoque). RLS criada no migration seguinte (operacional_rls).
-- Obs.: o enum public.module_key já contém 'operacional' (usado no front e na tela de Permissões).

-- OS: identificador sequencial OS-#### (espelha ORC-/COT-/REQ-).
create sequence if not exists public.os_seq start 1000;

create table if not exists public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('OS-' || lpad(nextval('public.os_seq')::text, 4, '0')),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  -- NULL = OS avulsa; preenchido = originada de um orçamento aprovado.
  orcamento_id uuid references public.orcamentos(id) on delete set null,

  status text not null default 'em_aberto'
    check (status in ('em_aberto','em_andamento','executada','concluida','cancelada')),
  rascunho boolean not null default false,

  -- Dados gerais (aba 4.1.a / etapa 1)
  tipos_servico text[] not null default '{}',        -- multi-select (catálogo tipos_servico)
  descricao text,
  data_programada date,
  hora_prevista text,
  duracao_estimada text,
  recorrencia text not null default 'nenhuma'
    check (recorrencia in ('nenhuma','semanal','mensal','trimestral')),
  endereco_execucao text,                             -- puxa do cliente, editável
  responsavel_admin_id uuid references public.funcionarios(id) on delete set null,
  funcionario_integrado_id uuid references public.funcionarios(id) on delete set null, -- parceiro (opcional)
  observacoes text,

  -- Vincular produtos e dados (etapa 4.2.1)
  pragas text[] not null default '{}',                -- multi-select (catálogo pragas)
  epis text[] not null default '{}',                  -- derivado dos produtos (read-only)
  necessita_relatorio boolean not null default false,
  outros_documentos text,
  mapa_pontos_url text,                               -- croqui (só serviços de monitoramento)

  -- Execução — capturado pelo app mobile (read-only no back office)
  check_in_at timestamptz, check_in_lat numeric, check_in_lng numeric,
  check_out_at timestamptz, check_out_lat numeric, check_out_lng numeric,
  assinatura_url text,                                -- obrigatória p/ status 'executada'
  cancelamento_motivo text,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists os_cliente_idx on public.ordens_servico (cliente_id);
create index if not exists os_status_idx on public.ordens_servico (status);
create index if not exists os_data_prog_idx on public.ordens_servico (data_programada);
create index if not exists os_orcamento_idx on public.ordens_servico (orcamento_id);

-- Funcionários vinculados à execução (4.1.b)
create table if not exists public.os_funcionarios (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (os_id, funcionario_id)
);
create index if not exists os_func_os_idx on public.os_funcionarios (os_id);

-- Produtos previstos + consumo real (4.1.c / 4.2.1)
create table if not exists public.os_produtos (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete restrict,
  qtd_recomendada numeric not null default 0,
  qtd_utilizada numeric,                              -- preenchido pelo app mobile (null = ainda não)
  unidade text,
  lote text,
  prazo_alvo date,
  observacao text,
  created_at timestamptz not null default now(),
  unique (os_id, produto_id)
);
create index if not exists os_prod_os_idx on public.os_produtos (os_id);

-- Equipamentos do inventário (4.1.c / 4.2.1)
create table if not exists public.os_equipamentos (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete restrict,
  numero_serie text,
  responsavel_id uuid references public.funcionarios(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (os_id, produto_id)
);
create index if not exists os_equip_os_idx on public.os_equipamentos (os_id);

-- Relatórios técnicos (4.1.d) — publicáveis no portal do cliente
create table if not exists public.os_relatorios (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  titulo text not null,
  arquivo_url text,
  publicado boolean not null default false,
  publicado_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists os_rel_os_idx on public.os_relatorios (os_id, created_at desc);

-- Anexos tipados (4.1.e)
create table if not exists public.os_anexos (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  nome text not null,
  tipo text not null default 'outro'
    check (tipo in ('foto','comprovante','autorizacao','extra','outro')),
  arquivo_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists os_anexo_os_idx on public.os_anexos (os_id, created_at desc);

-- Histórico por-campo (4.1.f) — somente leitura na UI
create table if not exists public.os_historico (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  campo text not null,                                -- rótulo do campo ou do evento
  valor_anterior text,
  valor_novo text,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists os_hist_os_idx on public.os_historico (os_id, created_at desc);

-- Cronograma (datas geradas por recorrência) — editável apenas se recorrente
create table if not exists public.os_cronograma (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  data_prevista date not null,
  status text not null default 'previsto' check (status in ('previsto','concluida','cancelada')),
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists os_crono_os_idx on public.os_cronograma (os_id, ordem);

-- updated_at
drop trigger if exists set_updated_at on public.ordens_servico;
create trigger set_updated_at before update on public.ordens_servico
  for each row execute function public.set_updated_at();

-- Storage: bucket privado para documentos da OS (relatórios, anexos, mapa, assinatura, fotos).
insert into storage.buckets (id, name, public)
values ('operacional-docs', 'operacional-docs', false)
on conflict (id) do nothing;
