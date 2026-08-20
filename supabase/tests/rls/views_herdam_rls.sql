-- Toda view em `public` precisa de `security_invoker = true`.
--
-- Sem essa opção a view executa com os privilégios de quem a criou — postgres —
-- e **ignora o RLS das tabelas de base**. Como `authenticated` tem select nas
-- views, uma view desprotegida é um caminho aberto por onde o cliente do Portal
-- e o operador leem o que as policies negam.
--
-- Aconteceu de verdade: `vw_produtos` perdeu a opção quando foi recriada com
-- `create or replace view` sem repetir a cláusula, para acrescentar uma coluna.
-- O `CREATE OR REPLACE` substitui as opções pelas fornecidas, e não havia
-- nenhuma. Nada na tela mudou, nenhum teste falhou, e o catálogo inteiro de
-- produtos e saldos passou a ser legível por qualquer sessão autenticada.
--
-- Por isso este teste varre `pg_class` em vez de listar as views uma a uma: a
-- armadilha não é uma view específica, é o gesto de recriar qualquer uma delas.

begin;

do $$
declare
  r record;
  faltando text := '';
begin
  for r in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('v','m')
       and coalesce(array_to_string(c.reloptions, ','), '') not like '%security_invoker=true%'
     order by c.relname
  loop
    faltando := faltando || r.relname || ' ';
  end loop;

  if faltando <> '' then
    raise exception 'FALHOU: view sem security_invoker (ignora o RLS das tabelas de base): %', faltando;
  end if;
  raise notice 'ok: todas as views de public herdam o RLS';
end $$;

-- E o efeito prático, no caso que motivou tudo: a view não pode mostrar ao
-- cliente do portal um produto que a tabela esconde dele.
create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_cli uuid := gen_random_uuid();
  v_cliente uuid; v_prod uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v_cli, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'rls-view-cliente@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now());

  insert into public.clientes (nome, cnpj) values ('[RLS] Cliente da view', '00000000000515') returning id into v_cliente;
  insert into public.cliente_portal_usuarios (cliente_id, nome, email, status)
  values (v_cliente, '[RLS] Portal da view', 'rls-view-cliente@teste.local', 'ativo');

  -- Produto sem nenhum vínculo com este cliente.
  insert into public.produtos (codigo, nome, categoria, unidade)
  values ('[RLS]-VW', '[RLS] Produto de ninguém', 'Inseticida', 'L') returning id into v_prod;

  insert into t values ('cli', v_cli), ('prod', v_prod);
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

do $$
declare n int;
begin
  perform pg_temp.como((select v from t where k='cli'));
  set local role authenticated;
  select count(*) into n from public.produtos where id = (select v from t where k='prod');
  reset role;
  perform pg_temp.esperar('a tabela esconde o produto sem vínculo', n = 0, true);

  perform pg_temp.como((select v from t where k='cli'));
  set local role authenticated;
  select count(*) into n from public.vw_produtos where id = (select v from t where k='prod');
  reset role;
  perform pg_temp.esperar('a view esconde o mesmo produto', n = 0, true);
end $$;

rollback;
