-- Transferências entre bases com estado "em trânsito" (débito na origem imediato,
-- crédito no destino só após confirmação de recebimento).
do $$ begin
  create type public.transferencia_status as enum ('em_transito','recebida','cancelada');
exception when duplicate_object then null; end $$;

create sequence if not exists public.transferencia_seq;

create table if not exists public.transferencias (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default 'TRF-' || lpad(nextval('public.transferencia_seq')::text, 4, '0'),
  produto_id uuid not null references public.produtos(id),
  base_origem_id uuid not null references public.bases(id),
  base_destino_id uuid not null references public.bases(id),
  lote text not null,
  validade date,
  quantidade_enviada numeric not null,
  quantidade_recebida numeric,
  status public.transferencia_status not null default 'em_transito',
  motivo text,
  justificativa_divergencia text,
  ator_envio_id uuid references auth.users(id),
  ator_recebimento_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  recebida_at timestamptz
);
create index if not exists transferencias_status_idx on public.transferencias (status);

alter table public.transferencias enable row level security;
create policy transferencias_select on public.transferencias
  for select to authenticated using (public.has_module_perm('estoque','ler'));
create policy transferencias_insert on public.transferencias
  for insert to authenticated with check (public.has_module_perm('estoque','criar'));
create policy transferencias_update on public.transferencias
  for update to authenticated
  using (public.has_module_perm('estoque','editar')) with check (public.has_module_perm('estoque','editar'));
