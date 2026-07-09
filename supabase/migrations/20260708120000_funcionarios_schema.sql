-- Gestão de Usuários — schema base
-- funcionarios: mestre de colaboradores internos (nem todo funcionário tem login).
-- auditoria: trilha de ações administrativas (substitui o mock auditLog).

create table if not exists public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  cpf text not null unique,
  rg text,
  data_nascimento date,
  telefone text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  cargo text not null,
  setor text not null,
  gestor_id uuid references public.funcionarios(id) on delete set null,
  data_admissao date,
  carga_horaria text,
  turno text,
  ativo boolean not null default true,
  aso_validade date,
  aso_arquivo_url text,
  cnh_numero text,
  cnh_categoria text,
  cnh_validade date,
  cnh_arquivo_url text,
  -- preenchido quando o funcionário tem acesso à plataforma (login). access = profile_id is not null
  profile_id uuid unique references public.profiles(id) on delete set null,
  avatar_url text,
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.funcionarios is
  'Colaboradores internos (módulo Gestão de Usuários). profile_id vincula ao login quando há acesso à plataforma.';

create index if not exists funcionarios_cargo_idx on public.funcionarios (cargo);
create index if not exists funcionarios_setor_idx on public.funcionarios (setor);
create index if not exists funcionarios_gestor_idx on public.funcionarios (gestor_id);
create index if not exists funcionarios_ativo_idx on public.funcionarios (ativo);

create trigger funcionarios_set_updated_at
  before update on public.funcionarios
  for each row execute function public.set_updated_at();

create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  funcionario_id uuid references public.funcionarios(id) on delete set null,
  modulo public.module_key not null default 'gestao_usuarios',
  acao text not null,
  detalhes jsonb,
  justificativa text,
  created_at timestamptz not null default now()
);

comment on table public.auditoria is 'Trilha de auditoria de ações administrativas.';

create index if not exists auditoria_funcionario_idx on public.auditoria (funcionario_id, created_at desc);

-- RLS habilitado aqui; policies são criadas no migration seguinte (perm_helper_and_rls).
alter table public.funcionarios enable row level security;
alter table public.auditoria enable row level security;
