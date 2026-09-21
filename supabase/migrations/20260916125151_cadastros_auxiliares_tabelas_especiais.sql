-- ============================================================================
-- Cadastros Auxiliares — tabelas especiais
-- ============================================================================
-- Parte do mesmo trabalho de `..._conforme_prototipo`, separada porque foi
-- aplicada como uma migration própria: são as duas listas que não cabem no
-- catálogo genérico (`catalogo_itens`), porque têm colunas próprias e vínculo
-- com tipo de serviço.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2. Planilha de execução por tipo de serviço
-- ----------------------------------------------------------------------------
-- É o primeiro item da coluna no protótipo. Cada tipo de serviço tem a própria
-- lista de status/legendas, usada ao preencher os pontos durante a execução —
-- "Sem consumo", "Consumo parcial", "Placa saturada". Não é o mesmo conjunto
-- para todos: o que faz sentido em controle de roedores não faz em sanitização.
create table if not exists public.planilha_itens (
  id            uuid primary key default gen_random_uuid(),
  tipo_servico  text not null,
  nome          text not null,
  cor_bg        text,
  cor_fg        text,
  observacao    text,
  ordem         integer not null default 0,
  ativo         boolean not null default true,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tipo_servico, nome)
);
create index if not exists planilha_itens_tipo_idx on public.planilha_itens (tipo_servico, ordem);

drop trigger if exists set_updated_at on public.planilha_itens;
create trigger set_updated_at before update on public.planilha_itens
  for each row execute function public.set_updated_at();

alter table public.planilha_itens enable row level security;

-- Mesma divisão de catalogo_itens: leitura para qualquer autenticado (o app do
-- operador precisa das legendas para preencher ponto), escrita só para quem tem
-- Configurações.
drop policy if exists planilha_itens_select on public.planilha_itens;
create policy planilha_itens_select on public.planilha_itens
  for select to authenticated using (true);
drop policy if exists planilha_itens_insert on public.planilha_itens;
create policy planilha_itens_insert on public.planilha_itens
  for insert to authenticated with check (public.has_module_perm('configuracoes', 'criar'));
drop policy if exists planilha_itens_update on public.planilha_itens;
create policy planilha_itens_update on public.planilha_itens
  for update to authenticated
  using (public.has_module_perm('configuracoes', 'editar'))
  with check (public.has_module_perm('configuracoes', 'editar'));
drop policy if exists planilha_itens_delete on public.planilha_itens;
create policy planilha_itens_delete on public.planilha_itens
  for delete to authenticated using (public.has_module_perm('configuracoes', 'excluir'));

-- ----------------------------------------------------------------------------
-- 3. Produtos padrão por tipo de serviço
-- ----------------------------------------------------------------------------
-- Segundo item da coluna. Produtos do almoxarifado que já vêm previstos ao criar
-- uma OS daquele tipo, com quantidade padrão. A homologação por cliente
-- (cliente_produtos_homologados) continua valendo por cima disso.
create table if not exists public.tipo_servico_produtos (
  id            uuid primary key default gen_random_uuid(),
  tipo_servico  text not null,
  produto_id    uuid not null references public.produtos (id) on delete cascade,
  qtd_padrao    numeric not null default 1 check (qtd_padrao > 0),
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tipo_servico, produto_id)
);
create index if not exists tipo_servico_produtos_tipo_idx on public.tipo_servico_produtos (tipo_servico);

drop trigger if exists set_updated_at on public.tipo_servico_produtos;
create trigger set_updated_at before update on public.tipo_servico_produtos
  for each row execute function public.set_updated_at();

alter table public.tipo_servico_produtos enable row level security;

drop policy if exists tipo_servico_produtos_select on public.tipo_servico_produtos;
create policy tipo_servico_produtos_select on public.tipo_servico_produtos
  for select to authenticated using (true);
drop policy if exists tipo_servico_produtos_insert on public.tipo_servico_produtos;
create policy tipo_servico_produtos_insert on public.tipo_servico_produtos
  for insert to authenticated with check (public.has_module_perm('configuracoes', 'criar'));
drop policy if exists tipo_servico_produtos_update on public.tipo_servico_produtos;
create policy tipo_servico_produtos_update on public.tipo_servico_produtos
  for update to authenticated
  using (public.has_module_perm('configuracoes', 'editar'))
  with check (public.has_module_perm('configuracoes', 'editar'));
drop policy if exists tipo_servico_produtos_delete on public.tipo_servico_produtos;
create policy tipo_servico_produtos_delete on public.tipo_servico_produtos
  for delete to authenticated using (public.has_module_perm('configuracoes', 'excluir'));
