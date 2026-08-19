-- Módulo Comercial: Follow-ups (5.1) e Garantias de OS Avulsas (5.2).
--
-- Nada disto existia. O enum module_key já trazia 'comercial', mas sem uma
-- tabela sequer — o item ficava no menu, desabilitado.
--
-- As regras de negócio do Discovery que dependem só dos dados estão como
-- constraint, e não apenas na tela: elas valem para qualquer caminho de escrita,
-- inclusive importação e correção manual.

-- ---------------------------------------------------------------------------
-- Dependência: classificação ABC do cliente
-- ---------------------------------------------------------------------------
-- A lista de Garantias exibe a classificação como pill colorida, lendo de
-- Gestão de Clientes. A coluna não existia em lugar nenhum.
alter table public.clientes add column if not exists classificacao_abc text
  check (classificacao_abc in ('A', 'B', 'C'));

comment on column public.clientes.classificacao_abc is
  'Curva ABC do cliente. Somente leitura no Comercial; a origem é Gestão de Clientes.';

-- ---------------------------------------------------------------------------
-- 5.1 Follow-ups
-- ---------------------------------------------------------------------------
create table if not exists public.comercial_follow_ups (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  orcamento_id uuid references public.orcamentos(id) on delete set null,
  data_registro date not null default current_date,
  data_acao date not null,
  status text not null default 'Em espera',   -- catálogo 'status_follow_up'
  descricao text,
  responsavel_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- "Data Ação obrigatória, ≥ Data Registro".
  constraint fup_acao_depois_do_registro check (data_acao >= data_registro),

  -- "FUP só pode ser concluído se tiver descrição preenchida." Fica aqui, e não
  -- só no formulário, porque a regra é sobre o dado — um FUP concluído em
  -- branco não diz o que foi feito, e é justamente isso que se quer registrar.
  constraint fup_concluido_exige_descricao
    check (status <> 'Concluído' or coalesce(btrim(descricao), '') <> '')
);

create index if not exists fup_data_acao_idx on public.comercial_follow_ups (data_acao);
create index if not exists fup_cliente_idx on public.comercial_follow_ups (cliente_id);
create index if not exists fup_status_idx on public.comercial_follow_ups (status);

create trigger comercial_follow_ups_updated_at
  before update on public.comercial_follow_ups
  for each row execute function public.set_updated_at();

create table if not exists public.comercial_fup_anexos (
  id uuid primary key default gen_random_uuid(),
  follow_up_id uuid not null references public.comercial_follow_ups(id) on delete cascade,
  nome text not null,
  tipo text,                    -- pdf | imagem | planilha | email | outro
  tamanho_bytes bigint,
  arquivo_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists fup_anexos_idx on public.comercial_fup_anexos (follow_up_id);

-- ---------------------------------------------------------------------------
-- 5.2 Garantias de OS Avulsas
-- ---------------------------------------------------------------------------
create table if not exists public.comercial_garantias (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  data_execucao date,
  data_validade date not null,
  -- Os 8 estágios do sistema atual, preservados de propósito: o time já opera
  -- com esse vocabulário, e renomear agora custaria retreinamento sem ganho.
  status text not null default 'Em vigor',    -- catálogo 'status_garantia'
  data_contato_renovacao date,
  observacao text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (os_id)
);

create index if not exists garantia_validade_idx on public.comercial_garantias (data_validade);
create index if not exists garantia_status_idx on public.comercial_garantias (status);
create index if not exists garantia_cliente_idx on public.comercial_garantias (cliente_id);

create trigger comercial_garantias_updated_at
  before update on public.comercial_garantias
  for each row execute function public.set_updated_at();

-- Subgrid fixa dentro do detalhe. O catálogo é o mesmo tipos_servico usado no
-- Operacional, para não haver duas listas de serviço no sistema.
create table if not exists public.comercial_garantia_servicos (
  id uuid primary key default gen_random_uuid(),
  garantia_id uuid not null references public.comercial_garantias(id) on delete cascade,
  tipo_servico text not null,
  observacao text,
  created_at timestamptz not null default now(),
  unique (garantia_id, tipo_servico)
);

-- "Toda alteração de status de Garantia é registrada na linha do tempo."
create table if not exists public.comercial_garantia_historico (
  id uuid primary key default gen_random_uuid(),
  garantia_id uuid not null references public.comercial_garantias(id) on delete cascade,
  campo text not null,
  valor_anterior text,
  valor_novo text,
  -- Obrigatório para "Renovação Recusada" e "Não Aplicável"; a exigência é
  -- aplicada na camada de dados do app, que é quem conhece o status de destino.
  comentario text,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists garantia_hist_idx on public.comercial_garantia_historico (garantia_id, created_at desc);

-- Link público de renovação. Primeira superfície anônima do produto: o token é
-- opaco e a leitura acontece por Edge Function, nunca por policy para `anon`.
create table if not exists public.comercial_garantia_links (
  id uuid primary key default gen_random_uuid(),
  garantia_id uuid not null references public.comercial_garantias(id) on delete cascade,
  token text not null unique,
  expira_em timestamptz not null,
  aberto_em timestamptz,
  respondido_em timestamptz,
  resposta text,                -- renovar | recusar | contato
  revogado boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists garantia_link_token_idx on public.comercial_garantia_links (token);

create table if not exists public.comercial_garantia_anexos (
  id uuid primary key default gen_random_uuid(),
  garantia_id uuid not null references public.comercial_garantias(id) on delete cascade,
  nome text not null,
  tipo text,
  tamanho_bytes bigint,
  arquivo_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists garantia_anexos_idx on public.comercial_garantia_anexos (garantia_id);

-- ---------------------------------------------------------------------------
-- 5.1.3 Filtros salvos
-- ---------------------------------------------------------------------------
-- Compartilhada com o Operacional de propósito: as duas listas têm o mesmo
-- problema e a mesma solução, e duplicar a tabela duplicaria o builder.
--
-- O RLS é por escopo e autor, e NÃO por has_module_perm('comercial'): quem tem
-- só Operacional precisa ler os próprios filtros.
create table if not exists public.filtros_salvos (
  id uuid primary key default gen_random_uuid(),
  modulo text not null,                       -- comercial | operacional
  nome text not null,
  categoria text,
  visibilidade text not null default 'pessoal' check (visibilidade in ('pessoal', 'global')),
  regras jsonb not null default '[]'::jsonb,  -- [{campo, operador, valor, juncao}]
  favorito boolean not null default false,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists filtros_salvos_idx on public.filtros_salvos (modulo, created_by);

create trigger filtros_salvos_updated_at
  before update on public.filtros_salvos
  for each row execute function public.set_updated_at();
