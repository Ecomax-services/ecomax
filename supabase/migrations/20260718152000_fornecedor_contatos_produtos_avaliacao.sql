-- Múltiplos contatos por fornecedor
create table if not exists public.fornecedor_contatos (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  nome text not null,
  cargo text,
  email text,
  telefone text,
  principal boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists fornecedor_contatos_forn_idx on public.fornecedor_contatos (fornecedor_id);

-- Vínculo fornecedor ↔ produtos fornecidos
create table if not exists public.fornecedor_produtos (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (fornecedor_id, produto_id)
);
create index if not exists fornecedor_produtos_forn_idx on public.fornecedor_produtos (fornecedor_id);

alter table public.fornecedor_contatos enable row level security;
alter table public.fornecedor_produtos enable row level security;

do $$
declare t text;
begin
  foreach t in array array['fornecedor_contatos','fornecedor_produtos'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.has_module_perm(''estoque'',''ler''))', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_module_perm(''estoque'',''criar''))', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_module_perm(''estoque'',''editar'')) with check (public.has_module_perm(''estoque'',''editar''))', t||'_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.has_module_perm(''estoque'',''excluir''))', t||'_delete', t);
  end loop;
end $$;

-- View com avaliação automática (a partir de cotações vencidas e compras recebidas)
create or replace view public.vw_fornecedores with (security_invoker = true) as
select f.*,
  coalesce((select count(*) from public.produtos p where p.fornecedor_id = f.id), 0) as num_produtos,
  coalesce((select sum(r.valor) from public.requisicoes r where r.fornecedor_id = f.id and r.status = 'recebida'), 0) as compras_total,
  (select count(*) from public.requisicoes r where r.fornecedor_id = f.id and r.status = 'recebida') as num_compras,
  (select count(*) from public.cotacao_respostas cr where cr.fornecedor_id = f.id and cr.melhor) as num_cotacoes_ganhas,
  least(5.0, round((3.0
    + 0.2 * (select count(*) from public.requisicoes r where r.fornecedor_id = f.id and r.status = 'recebida')
    + 0.15 * (select count(*) from public.cotacao_respostas cr where cr.fornecedor_id = f.id and cr.melhor)
  )::numeric, 1)) as avaliacao_calc
from public.fornecedores f;
