-- Acesso do Portal do Cliente às próprias ordens de serviço.
-- Reconstruída a partir do banco em 2026-08-17.
--
-- O vínculo usuário↔cliente é feito pelo e-mail do JWT contra
-- cliente_portal_usuarios (é assim que o convite do portal funciona: a pessoa
-- é convidada por e-mail, não por profile_id).

-- Guardada no profile para conveniência de leitura; o vínculo autoritativo
-- continua sendo cliente_portal_usuarios.
alter table public.profiles add column if not exists cliente_id uuid;

-- Clientes aos quais o usuário logado tem acesso pelo portal.
create or replace function public.my_portal_cliente_ids()
returns setof uuid
language sql
stable security definer
set search_path to 'public'
as $$
  select cliente_id from public.cliente_portal_usuarios
  where lower(email) = lower(nullif(auth.jwt()->>'email','')) and status = 'ativo';
$$;

create or replace function public.os_is_my_cliente(_os_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.ordens_servico o
    where o.id = _os_id
      and o.cliente_id in (
        select cliente_id from public.cliente_portal_usuarios
        where lower(email) = lower(nullif(auth.jwt()->>'email','')) and status = 'ativo'
      )
  );
$$;

-- Somente leitura, e somente do que é do próprio cliente.
create policy clientes_portal_select on public.clientes
  for select to authenticated using (id in (select public.my_portal_cliente_ids()));

create policy os_cliente_select on public.ordens_servico
  for select to authenticated using (cliente_id in (select public.my_portal_cliente_ids()));

create policy oscrono_cliente_select on public.os_cronograma
  for select to authenticated using (public.os_is_my_cliente(os_id));

-- O cliente só vê relatório publicado — rascunho é interno.
create policy osrel_cliente_select on public.os_relatorios
  for select to authenticated using (publicado = true and public.os_is_my_cliente(os_id));
