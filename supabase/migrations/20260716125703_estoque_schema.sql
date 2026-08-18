-- Módulo Estoque — schema base (bases, fornecedores, produtos, lotes, movimentações,
-- cotações + respostas, requisições). RLS criada no migration seguinte.

create type public.req_status as enum
  ('aguardando_aprovacao', 'aprovada', 'enviada', 'recebida', 'recusada', 'cancelada');
create type public.mov_tipo as enum ('entrada', 'saida', 'transferencia', 'ajuste');
create type public.cotacao_status as enum ('aguardando', 'respondida', 'aprovada', 'cancelada');

-- Locais de estoque (Central + Bases)
create table if not exists public.bases (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  cidade text,
  uf text,
  responsavel_id uuid references public.funcionarios(id) on delete set null,
  central boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  cnpj text unique,
  email text,
  telefone text,
  categoria text,
  avaliacao numeric(2, 1) not null default 0,
  dados_bancarios jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  categoria text not null,
  unidade text not null,
  estoque_min numeric not null default 0,
  estoque_max numeric,
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists produtos_categoria_idx on public.produtos (categoria);
create index if not exists produtos_fornecedor_idx on public.produtos (fornecedor_id);

create table if not exists public.estoque_lotes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  base_id uuid not null references public.bases(id) on delete cascade,
  lote text not null,
  validade date,
  quantidade numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (produto_id, base_id, lote)
);
create index if not exists lotes_produto_idx on public.estoque_lotes (produto_id);
create index if not exists lotes_base_idx on public.estoque_lotes (base_id);

create table if not exists public.movimentacoes (
  id uuid primary key default gen_random_uuid(),
  tipo public.mov_tipo not null,
  produto_id uuid references public.produtos(id) on delete set null,
  quantidade numeric not null,
  base_origem_id uuid references public.bases(id) on delete set null,
  base_destino_id uuid references public.bases(id) on delete set null,
  lote text,
  descricao text,
  ator_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists mov_produto_idx on public.movimentacoes (produto_id, created_at desc);

create sequence if not exists public.cotacao_seq start 231;
create table if not exists public.cotacoes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('COT-' || lpad(nextval('public.cotacao_seq')::text, 4, '0')),
  produto_id uuid references public.produtos(id) on delete set null,
  quantidade text,
  status public.cotacao_status not null default 'aguardando',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cotacao_respostas (
  id uuid primary key default gen_random_uuid(),
  cotacao_id uuid not null references public.cotacoes(id) on delete cascade,
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  valor numeric,
  prazo text,
  condicao text,
  melhor boolean not null default false
);
create index if not exists cot_resp_cotacao_idx on public.cotacao_respostas (cotacao_id);

create sequence if not exists public.requisicao_seq start 142;
create table if not exists public.requisicoes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('REQ-' || lpad(nextval('public.requisicao_seq')::text, 4, '0')),
  produto_id uuid references public.produtos(id) on delete set null,
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  quantidade text,
  valor numeric,
  solicitante_id uuid references auth.users(id) on delete set null,
  status public.req_status not null default 'aguardando_aprovacao',
  nota_fiscal_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists req_status_idx on public.requisicoes (status);

-- updated_at triggers
create trigger bases_set_updated_at before update on public.bases for each row execute function public.set_updated_at();
create trigger fornecedores_set_updated_at before update on public.fornecedores for each row execute function public.set_updated_at();
create trigger produtos_set_updated_at before update on public.produtos for each row execute function public.set_updated_at();
create trigger lotes_set_updated_at before update on public.estoque_lotes for each row execute function public.set_updated_at();
create trigger cotacoes_set_updated_at before update on public.cotacoes for each row execute function public.set_updated_at();
create trigger requisicoes_set_updated_at before update on public.requisicoes for each row execute function public.set_updated_at();

alter table public.bases enable row level security;
alter table public.fornecedores enable row level security;
alter table public.produtos enable row level security;
alter table public.estoque_lotes enable row level security;
alter table public.movimentacoes enable row level security;
alter table public.cotacoes enable row level security;
alter table public.cotacao_respostas enable row level security;
alter table public.requisicoes enable row level security;
