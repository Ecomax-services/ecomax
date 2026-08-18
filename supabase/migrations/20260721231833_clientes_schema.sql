-- Módulo Gestão de Clientes — núcleo

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  razao_social text,
  tipo_pessoa text not null default 'pj' check (tipo_pessoa in ('pf','pj')),
  cnpj text,
  cpf text,
  regiao text,
  cep text, logradouro text, numero text, complemento text, bairro text, cidade text, uf text,
  email text,
  telefone text,
  observacoes text,
  ativo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clientes_nome_idx on public.clientes (nome);
create index if not exists clientes_ativo_idx on public.clientes (ativo);

-- Contatos & Telefones (inline) — tabela única (origem = tipo)
create table if not exists public.cliente_contatos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo text not null check (tipo in ('telefone','contato')),
  nome text,
  telefone text,
  email text,
  recebe_email boolean not null default false,
  rel_tecnica boolean not null default false,
  padrao boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists cliente_contatos_cli_idx on public.cliente_contatos (cliente_id);

-- Usuários do portal externo do cliente
create table if not exists public.cliente_portal_usuarios (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nome text not null,
  email text not null,
  perfil text,
  status text not null default 'convidado' check (status in ('convidado','ativo','inativo')),
  ultimo_acesso timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists cliente_portal_cli_idx on public.cliente_portal_usuarios (cliente_id);

-- Vínculo funcionário integrado ↔ cliente (reusa funcionarios)
create table if not exists public.cliente_funcionarios (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (cliente_id, funcionario_id)
);
create index if not exists cliente_funcionarios_cli_idx on public.cliente_funcionarios (cliente_id);

-- Orçamentos (fluxo de status)
create sequence if not exists public.orcamento_seq;
create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default 'ORC-' || lpad(nextval('public.orcamento_seq')::text, 4, '0'),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  data date not null default current_date,
  status text not null default 'em_elaboracao' check (status in ('em_elaboracao','aprovado','cancelado')),
  observacao text,
  valor_total numeric not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orcamentos_cli_idx on public.orcamentos (cliente_id);

-- Produtos homologados por cliente (reusa produtos do estoque)
create table if not exists public.cliente_produtos_homologados (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  data_homologacao date not null default current_date,
  validade date,
  created_at timestamptz not null default now(),
  unique (cliente_id, produto_id)
);
create index if not exists cli_prod_homolog_cli_idx on public.cliente_produtos_homologados (cliente_id);

-- Triggers de updated_at
drop trigger if exists set_updated_at on public.clientes;
create trigger set_updated_at before update on public.clientes for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.orcamentos;
create trigger set_updated_at before update on public.orcamentos for each row execute function public.set_updated_at();
