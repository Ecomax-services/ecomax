-- Módulo Configurações — Cadastros Auxiliares (catálogos)

-- Completa o enum de módulos com o único faltante (para a matriz de permissões 10.3.a).
alter type public.module_key add value if not exists 'notificacoes';

-- Tabela genérica de itens de catálogo. `catalogo` identifica o catálogo (ex.: 'unidades').
create table if not exists public.catalogo_itens (
  id uuid primary key default gen_random_uuid(),
  catalogo text not null,
  nome text not null,
  cor_bg text,
  cor_fg text,
  observacao text,
  ativo boolean not null default true,
  ordem integer not null default 0,
  template_mensagem text,      -- só p/ tipos de serviço (link público)
  prazo_padrao integer,        -- só p/ tipos de serviço (dias)
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalogo, nome)
);

create index if not exists catalogo_itens_catalogo_idx on public.catalogo_itens (catalogo, ordem);

drop trigger if exists set_updated_at on public.catalogo_itens;
create trigger set_updated_at before update on public.catalogo_itens
  for each row execute function public.set_updated_at();

alter table public.catalogo_itens enable row level security;
