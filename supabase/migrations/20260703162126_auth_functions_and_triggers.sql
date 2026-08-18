-- Funções de apoio ao RBAC e o trigger que cria o profile ao criar o usuário.
-- Reconstruída a partir do banco em 2026-08-17 (ver auth_core_schema).

-- Mantém updated_at. Reusada por praticamente todas as tabelas do projeto.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Papel do usuário atual.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable security definer
set search_path to ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Admin tem bypass em todo o RBAC (espelhado no can() do front).
create or replace function public.is_admin()
returns boolean
language sql
stable security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and ativo
  );
$$;

-- Quais apps cada papel pode acessar.
create or replace function public.apps_for_role(r public.user_role)
returns public.app_key[]
language sql
immutable
set search_path to ''
as $$
  select case
    when r = 'cliente'  then array['portal_cliente']::public.app_key[]
    when r = 'operador' then array['mobile_operador']::public.app_key[]
    else array['backoffice']::public.app_key[]
  end;
$$;

create or replace function public.has_app_access(app public.app_key)
returns boolean
language sql
stable security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.ativo
      and app = any (public.apps_for_role(p.role))
  );
$$;

-- Cria o profile quando um usuário nasce em auth.users, mapeando o papel
-- (vindo do raw_user_meta_data) para o perfil de acesso de mesmo nome.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_role public.user_role;
  v_perfil_nome text;
  v_perfil_id uuid;
begin
  begin
    v_role := coalesce(new.raw_user_meta_data->>'role', 'operacional')::public.user_role;
  exception when others then
    v_role := 'operacional';
  end;

  v_perfil_nome := case v_role
    when 'admin'        then 'Administrador'
    when 'gestor'       then 'Gestor'
    when 'operacional'  then 'Operacional'
    when 'almoxarifado' then 'Almoxarifado'
    when 'cliente'      then 'Cliente'
    else null
  end;

  select id into v_perfil_id from public.perfis_acesso where nome = v_perfil_nome;

  insert into public.profiles (id, nome_completo, role, perfil_acesso_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome_completo', new.email),
    v_role,
    v_perfil_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ATENÇÃO: este trigger vive no schema auth, fora do public. Um `db pull`
-- padrão (só public) não o captura — foi a causa de ele nunca ter sido versionado.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
