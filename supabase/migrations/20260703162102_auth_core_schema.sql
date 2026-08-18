-- Núcleo de autenticação e RBAC.
--
-- Esta migration foi reconstruída a partir do banco em 2026-08-17: os objetos
-- existiam no projeto remoto mas nunca haviam sido versionados, e as migrations
-- seguintes (funcionarios, estoque, clientes, operacional…) dependem deles.

-- Enums --------------------------------------------------------------------

create type public.user_role as enum (
  'admin', 'gestor', 'operacional', 'comercial', 'financeiro',
  'rh', 'almoxarifado', 'operador', 'cliente'
);

-- Aplicações que consomem a mesma base de usuários.
create type public.app_key as enum ('backoffice', 'portal_cliente', 'mobile_operador');

-- Módulos do backoffice. O valor 'notificacoes' é acrescentado depois, em
-- 20260718221610_configuracoes_schema.sql.
create type public.module_key as enum (
  'dashboard', 'gestao_clientes', 'operacional', 'comercial', 'estoque',
  'relatorios', 'financeiro', 'gestao_usuarios', 'configuracoes'
);

-- Perfis de acesso e a matriz de permissões por módulo ----------------------

create table public.perfis_acesso (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.permissoes_modulo (
  id uuid primary key default gen_random_uuid(),
  perfil_acesso_id uuid not null references public.perfis_acesso(id) on delete cascade,
  modulo public.module_key not null,
  pode_ler boolean not null default false,
  pode_criar boolean not null default false,
  pode_editar boolean not null default false,
  pode_excluir boolean not null default false,
  unique (perfil_acesso_id, modulo)
);

-- Dados de negócio do usuário, 1:1 com auth.users --------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_completo text not null,
  role public.user_role not null default 'operacional',
  perfil_acesso_id uuid,               -- FK adicionada em auth_link_profiles_to_perfis
  ativo boolean not null default true,
  telefone text,
  avatar_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
