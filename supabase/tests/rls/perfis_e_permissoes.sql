-- A configuração de acesso do escritório não é assunto de quem está fora dele.
--
-- `perfis_acesso` e `permissoes_modulo` estavam com `for select using (true)`:
-- qualquer sessão autenticada lia a matriz inteira. O cliente do Portal e o
-- operador em campo não têm o que fazer com ela.
--
-- Este arquivo prova as duas metades: o que precisa continuar funcionando (o
-- login de todo mundo depende de ler as **próprias** permissões) e o que tem de
-- parar (ler as dos outros).

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_admin uuid := gen_random_uuid();
  v_oper  uuid := gen_random_uuid();
  v_cli   uuid := gen_random_uuid();
  v_perfil_admin uuid; v_perfil_oper uuid; v_cliente uuid;
begin
  select id into v_perfil_admin from public.perfis_acesso where nome = 'Administrador';
  select id into v_perfil_oper  from public.perfis_acesso where nome = 'Operacional';

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-perm-admin@teste.local', '', now(), '{"provider":"email"}', '{"role":"admin"}', now(), now()),
    (v_oper, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-perm-oper@teste.local', '', now(), '{"provider":"email"}', '{"role":"operacional"}', now(), now()),
    (v_cli, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-perm-cliente@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now());

  update public.profiles set perfil_acesso_id = v_perfil_admin, role = 'admin'       where id = v_admin;
  update public.profiles set perfil_acesso_id = v_perfil_oper,  role = 'operacional' where id = v_oper;
  -- O cliente do portal é o caso que motivou a mudança: nenhum perfil de acesso.
  update public.profiles set perfil_acesso_id = null,           role = 'cliente'     where id = v_cli;

  insert into public.clientes (nome, cnpj) values ('[RLS] Cliente do portal', '00000000000434') returning id into v_cliente;
  insert into public.cliente_portal_usuarios (cliente_id, nome, email, status)
  values (v_cliente, '[RLS] Portal', 'rls-perm-cliente@teste.local', 'ativo');

  insert into t values ('admin', v_admin), ('oper', v_oper), ('cli', v_cli),
                       ('perfil_admin', v_perfil_admin), ('perfil_oper', v_perfil_oper);
end $$;

create or replace function pg_temp.esperar(_caso text, _obtido boolean, _esperado boolean)
returns void language plpgsql as $$
begin
  if _obtido is distinct from _esperado then
    raise exception 'FALHOU: % — esperado %, obteve %', _caso, _esperado, coalesce(_obtido::text, 'null');
  end if;
  raise notice 'ok: %', _caso;
end $$;

create or replace function pg_temp.como(_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', _uid, 'role', 'authenticated',
                      'email', (select email from auth.users where id = _uid))::text, true);
end $$;

-- ---------------------------------------------------------------------------
-- O que precisa continuar funcionando: o login de cada um
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  -- Esta consulta é a do AuthProvider. Se ela voltar vazia, ninguém entra.
  perform pg_temp.como((select v from t where k='oper'));
  set local role authenticated;
  select count(*) into n from public.permissoes_modulo
   where perfil_acesso_id = (select v from t where k='perfil_oper');
  reset role;
  perform pg_temp.esperar('operacional lê as PRÓPRIAS permissões', n > 0, true);

  -- E o nome do próprio perfil, que Meu Perfil mostra.
  perform pg_temp.como((select v from t where k='oper'));
  set local role authenticated;
  select count(*) into n from public.perfis_acesso where id = (select v from t where k='perfil_oper');
  reset role;
  perform pg_temp.esperar('operacional lê o PRÓPRIO perfil', n = 1, true);

  perform pg_temp.como((select v from t where k='admin'));
  set local role authenticated;
  select count(*) into n from public.permissoes_modulo;
  reset role;
  perform pg_temp.esperar('admin lê a matriz inteira', n > 0, true);

  perform pg_temp.como((select v from t where k='admin'));
  set local role authenticated;
  select count(*) into n from public.perfis_acesso;
  reset role;
  perform pg_temp.esperar('admin lista todos os perfis', n >= 2, true);
end $$;

-- ---------------------------------------------------------------------------
-- O que tem de parar
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  perform pg_temp.como((select v from t where k='oper'));
  set local role authenticated;
  select count(*) into n from public.permissoes_modulo
   where perfil_acesso_id = (select v from t where k='perfil_admin');
  reset role;
  perform pg_temp.esperar('operacional NÃO lê as permissões do Administrador', n = 0, true);

  perform pg_temp.como((select v from t where k='cli'));
  set local role authenticated;
  select count(*) into n from public.perfis_acesso;
  reset role;
  perform pg_temp.esperar('cliente do portal NÃO lista perfil nenhum', n = 0, true);

  perform pg_temp.como((select v from t where k='cli'));
  set local role authenticated;
  select count(*) into n from public.permissoes_modulo;
  reset role;
  perform pg_temp.esperar('cliente do portal NÃO lê permissão nenhuma', n = 0, true);
end $$;

-- ---------------------------------------------------------------------------
-- A policy de `permissoes_modulo` chama `has_module_perm`, que lê
-- `permissoes_modulo`. Se isso recursionasse, a consulta acima teria estourado
-- a pilha em vez de devolver zero — este caso deixa a armadilha explícita.
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  perform pg_temp.como((select v from t where k='oper'));
  set local role authenticated;
  select count(*) into n from public.permissoes_modulo;
  reset role;
  perform pg_temp.esperar('consultar a tabela cuja policy a consulta não recursiona', n >= 0, true);
end $$;

rollback;
