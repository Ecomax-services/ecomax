-- Base dos três módulos que faltam no Portal do Cliente: Documentos, Produtos e
-- Colaboradores. Nenhum deles tinha onde guardar dado — não era só a tela que
-- faltava.

-- ---------------------------------------------------------------------------
-- 1. Documentos disponibilizados ao cliente
-- ---------------------------------------------------------------------------

create table if not exists public.cliente_documentos (
  id uuid primary key default gen_random_uuid(),
  -- Nulo = documento institucional, visível a todos os clientes do portal.
  -- É o caso da maioria: manual do portal, licença sanitária da Ecomax, POPs.
  -- Preenchido = documento daquele cliente (contrato, laudo específico).
  cliente_id uuid references public.clientes(id) on delete cascade,
  categoria text not null,              -- catálogo 'categorias_documento_cliente'
  titulo text not null,
  descricao text,
  arquivo_url text,
  -- Alimenta o bloco "Licenças e certificações a vencer" da tela Início.
  -- Nulo para documento que não vence, como um manual.
  validade date,
  ativo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cliente_documentos_cliente_idx
  on public.cliente_documentos (cliente_id, categoria);
create index if not exists cliente_documentos_validade_idx
  on public.cliente_documentos (validade) where validade is not null;

create trigger cliente_documentos_updated_at
  before update on public.cliente_documentos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Bloco regulatório dos produtos
-- ---------------------------------------------------------------------------
-- O portal precisa mostrar quatro documentos por produto. Nenhum existia: a
-- tabela `produtos` só tinha código, nome, categoria, unidade, mínimo/máximo e
-- fornecedor. A ficha de emergência e a FDS não são adorno — são o que a pessoa
-- procura quando algo dá errado no local onde o produto foi aplicado.

alter table public.produtos add column if not exists ficha_tecnica_url text;
alter table public.produtos add column if not exists ficha_emergencia_url text;
alter table public.produtos add column if not exists fds_url text;
-- Link externo para o registro/rótulo no site da ANVISA. É URL, e não arquivo,
-- porque a fonte autoritativa é o órgão — cópia local envelhece em silêncio.
alter table public.produtos add column if not exists anvisa_url text;
alter table public.produtos add column if not exists registro_anvisa text;

comment on column public.produtos.anvisa_url is
  'Link para o registro no site da ANVISA. Externo de propósito: a fonte autoritativa é o órgão.';

-- ---------------------------------------------------------------------------
-- 3. Documentos dos colaboradores
-- ---------------------------------------------------------------------------
-- O design pede uma matriz colaborador x documento com Capacitação Técnica,
-- ASO, EPIs, NR33, NR35 e NR1. A tabela `funcionarios` tinha só duas colunas de
-- validade (ASO e CNH), e acrescentar cinco colunas resolveria hoje e voltaria
-- a travar na próxima norma. Uma linha por documento cresce sem migration.

create table if not exists public.funcionario_documentos (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  tipo text not null,                   -- catálogo 'documentos_colaborador'
  validade date,
  arquivo_url text,
  observacao text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Um documento de cada tipo por pessoa. Renovação substitui a linha; o
  -- histórico de versões, se for preciso, é outro assunto e outra tabela.
  unique (funcionario_id, tipo)
);

create index if not exists funcionario_documentos_validade_idx
  on public.funcionario_documentos (validade) where validade is not null;

create trigger funcionario_documentos_updated_at
  before update on public.funcionario_documentos
  for each row execute function public.set_updated_at();

-- Traz para cá o ASO e a CNH que já existiam em colunas, para a matriz do
-- portal ter uma origem só. As colunas continuam onde estão porque o Backoffice
-- ainda lê delas — ver o comentário abaixo.
insert into public.funcionario_documentos (funcionario_id, tipo, validade, arquivo_url)
select f.id, 'ASO', f.aso_validade, f.aso_arquivo_url
from public.funcionarios f
where f.aso_validade is not null or f.aso_arquivo_url is not null
on conflict (funcionario_id, tipo) do nothing;

insert into public.funcionario_documentos (funcionario_id, tipo, validade, arquivo_url)
select f.id, 'CNH', f.cnh_validade, f.cnh_arquivo_url
from public.funcionarios f
where f.cnh_validade is not null or f.cnh_arquivo_url is not null
on conflict (funcionario_id, tipo) do nothing;

comment on column public.funcionarios.aso_validade is
  'LEGADO: duplica funcionario_documentos (tipo=ASO). Mantida enquanto as telas de Gestão de Usuários lerem daqui; remover quando migrarem.';
comment on column public.funcionarios.cnh_validade is
  'LEGADO: duplica funcionario_documentos (tipo=CNH). Ver o comentário de aso_validade.';

-- ---------------------------------------------------------------------------
-- 4. Bucket dos documentos que o portal enxerga
-- ---------------------------------------------------------------------------
-- Um bucket só, com o escopo no caminho, em vez de espalhar por três: as
-- policies de leitura do portal ficam num lugar e a convenção é uma.
--
--     <escopo>/<id>/<tipo>/<timestamp>-<slug>.<ext>
--     escopo ∈ cliente | produto | funcionario
insert into storage.buckets (id, name, public)
values ('portal-docs', 'portal-docs', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Acesso de tabela
-- ---------------------------------------------------------------------------
-- No projeto remoto isto vem de graça, pelos privilégios padrão do Supabase.
-- Num banco criado do zero, não vem — e a migration tem de bastar por si.
-- Sem estas linhas o `db reset` sobe e as telas do portal batem em
-- "permission denied for table", que não tem nada a ver com RLS.
--
-- Quem decide as linhas continua sendo o RLS; o grant só abre a porta da tabela.
-- `anon` fica de fora de propósito: não há policy para ele, então o grant seria
-- uma permissão que nunca se exerce.
grant select, insert, update, delete on public.cliente_documentos to authenticated, service_role;
grant select, insert, update, delete on public.funcionario_documentos to authenticated, service_role;
