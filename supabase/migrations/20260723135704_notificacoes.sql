-- Notificações in-app, compartilhadas pelos 3 apps.
-- Reconstruída a partir do banco em 2026-08-17 (nunca havia sido versionada).
--
-- Uma notificação é endereçada de uma destas três formas:
--   para_profile_id → um usuário específico
--   para_role       → todos de um papel
--   para_cliente_id → os usuários do portal daquele cliente

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  para_profile_id uuid references auth.users(id) on delete cascade,
  para_role text,
  para_cliente_id uuid references public.clientes(id) on delete cascade,
  tipo text not null default 'info' check (tipo in ('os', 'info', 'expired', 'estoque')),
  titulo text not null,
  descricao text,
  os_id uuid references public.ordens_servico(id) on delete set null,
  link text,
  lida boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists notificacoes_destinatario_idx
  on public.notificacoes (para_profile_id, created_at desc);

alter table public.notificacoes enable row level security;

-- Clientes aos quais o usuário logado tem acesso pelo portal.
-- Definida aqui porque as policies abaixo já dependem dela; a migration
-- operacional_portal_cliente_rls a redeclara (create or replace) junto das
-- policies do portal. Depende apenas de cliente_portal_usuarios, criada em
-- clientes_schema.
create or replace function public.my_portal_cliente_ids()
returns setof uuid
language sql
stable security definer
set search_path to 'public'
as $$
  select cliente_id from public.cliente_portal_usuarios
  where lower(email) = lower(nullif(auth.jwt()->>'email','')) and status = 'ativo';
$$;

-- O destinatário é quem lê e marca como lida.
create policy notif_select on public.notificacoes
  for select to authenticated using (
    para_profile_id = auth.uid()
    or (para_role is not null and para_role = public.current_user_role()::text)
    or (para_cliente_id is not null and para_cliente_id in (select public.my_portal_cliente_ids()))
  );

create policy notif_insert on public.notificacoes
  for insert to authenticated with check (created_by = auth.uid());

create policy notif_update on public.notificacoes
  for update to authenticated using (
    para_profile_id = auth.uid()
    or (para_role is not null and para_role = public.current_user_role()::text)
    or (para_cliente_id is not null and para_cliente_id in (select public.my_portal_cliente_ids()))
  );
