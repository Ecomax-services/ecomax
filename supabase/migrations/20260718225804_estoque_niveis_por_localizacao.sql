-- Níveis de estoque (mín/máx) por (produto × base). Fallback: produtos.estoque_min/max.
create table if not exists public.estoque_niveis (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  base_id uuid not null references public.bases(id) on delete cascade,
  estoque_min numeric not null default 0,
  estoque_max numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (produto_id, base_id)
);
create index if not exists estoque_niveis_base_idx on public.estoque_niveis (base_id);

drop trigger if exists set_updated_at on public.estoque_niveis;
create trigger set_updated_at before update on public.estoque_niveis
  for each row execute function public.set_updated_at();

alter table public.estoque_niveis enable row level security;

-- Leitura liberada a autenticados (consumido nos alertas); escrita gated por estoque.
create policy estoque_niveis_select on public.estoque_niveis
  for select to authenticated using (true);
create policy estoque_niveis_insert on public.estoque_niveis
  for insert to authenticated with check (public.has_module_perm('estoque','criar'));
create policy estoque_niveis_update on public.estoque_niveis
  for update to authenticated
  using (public.has_module_perm('estoque','editar')) with check (public.has_module_perm('estoque','editar'));
create policy estoque_niveis_delete on public.estoque_niveis
  for delete to authenticated using (public.has_module_perm('estoque','excluir'));
