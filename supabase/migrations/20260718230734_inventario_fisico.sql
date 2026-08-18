-- Inventário físico por localização: contagem sistema × física + ajustes ao fechar.
do $$ begin
  create type public.inventario_status as enum ('aberto','fechado','cancelado');
exception when duplicate_object then null; end $$;

create sequence if not exists public.inventario_seq;

create table if not exists public.inventarios (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default 'INV-' || lpad(nextval('public.inventario_seq')::text, 4, '0'),
  base_id uuid not null references public.bases(id),
  status public.inventario_status not null default 'aberto',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.inventario_itens (
  id uuid primary key default gen_random_uuid(),
  inventario_id uuid not null references public.inventarios(id) on delete cascade,
  produto_id uuid not null references public.produtos(id),
  lote text not null,
  lote_id uuid references public.estoque_lotes(id),
  qtd_sistema numeric not null default 0,
  qtd_contada numeric
);
create index if not exists inventario_itens_inv_idx on public.inventario_itens (inventario_id);

alter table public.inventarios enable row level security;
alter table public.inventario_itens enable row level security;

create policy inventarios_select on public.inventarios for select to authenticated using (public.has_module_perm('estoque','ler'));
create policy inventarios_insert on public.inventarios for insert to authenticated with check (public.has_module_perm('estoque','criar'));
create policy inventarios_update on public.inventarios for update to authenticated using (public.has_module_perm('estoque','editar')) with check (public.has_module_perm('estoque','editar'));

create policy inventario_itens_select on public.inventario_itens for select to authenticated using (public.has_module_perm('estoque','ler'));
create policy inventario_itens_insert on public.inventario_itens for insert to authenticated with check (public.has_module_perm('estoque','criar'));
create policy inventario_itens_update on public.inventario_itens for update to authenticated using (public.has_module_perm('estoque','editar')) with check (public.has_module_perm('estoque','editar'));
