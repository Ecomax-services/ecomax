-- Base do técnico: o que ele passa a enxergar, e o que continua fora.
--
-- Prova `20261006150000_base_do_tecnico.sql`. O técnico precisa ver os lotes
-- da base dele para escolher em campo — e só eles. Lote de outra base é
-- estoque de outra equipe; produto sem lote na base dele não é escolha.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_op uuid := gen_random_uuid();
  v_semb uuid := gen_random_uuid();
  v_cli uuid := gen_random_uuid();
  v_minha uuid; v_outra uuid; v_cliente uuid;
  v_prod_na_base uuid; v_prod_fora uuid;
  v_lote_meu uuid; v_lote_alheio uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_op, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-base-op@teste.local', '', now(), '{"provider":"email"}', '{"role":"operador"}', now(), now()),
    (v_semb, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-base-semb@teste.local', '', now(), '{"provider":"email"}', '{"role":"operador"}', now(), now()),
    (v_cli, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-base-cli@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now());

  insert into public.bases (nome) values ('[RLS] Base do técnico') returning id into v_minha;
  insert into public.bases (nome) values ('[RLS] Outra base') returning id into v_outra;

  insert into public.funcionarios (nome_completo, cpf, cargo, setor, profile_id, base_id) values
    ('[RLS] Técnico com base', '00000000061', 'Operador', 'Operacional', v_op, v_minha),
    ('[RLS] Técnico sem base', '00000000062', 'Operador', 'Operacional', v_semb, null);

  insert into public.clientes (nome, cnpj) values ('[RLS] Cliente base', '00000000001830') returning id into v_cliente;
  insert into public.cliente_portal_usuarios (cliente_id, nome, email, status)
  values (v_cliente, '[RLS] Portal base', 'rls-base-cli@teste.local', 'ativo');

  insert into public.produtos (codigo, nome, categoria, unidade) values ('[RLS]-BT1', '[RLS] Produto na base', 'Raticida', 'KG')
  returning id into v_prod_na_base;
  insert into public.produtos (codigo, nome, categoria, unidade) values ('[RLS]-BT2', '[RLS] Produto fora', 'Raticida', 'KG')
  returning id into v_prod_fora;

  insert into public.estoque_lotes (produto_id, base_id, lote, quantidade) values (v_prod_na_base, v_minha, 'MEU-1', 5)
  returning id into v_lote_meu;
  insert into public.estoque_lotes (produto_id, base_id, lote, quantidade) values (v_prod_fora, v_outra, 'ALHEIO-1', 5)
  returning id into v_lote_alheio;

  insert into t values ('op', v_op), ('semb', v_semb), ('cli', v_cli), ('minha', v_minha), ('outra', v_outra),
    ('prod_na_base', v_prod_na_base), ('prod_fora', v_prod_fora), ('lote_meu', v_lote_meu), ('lote_alheio', v_lote_alheio);
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

create or replace function pg_temp.conta(_quem text, _sql text) returns int language plpgsql as $$
declare n int;
begin
  perform pg_temp.como((select v from t where k = _quem));
  set local role authenticated;
  execute _sql into n;
  reset role;
  return n;
end $$;

do $$
begin
  perform pg_temp.esperar('o técnico vê o lote da base dele',
    pg_temp.conta('op', format('select count(*) from public.estoque_lotes where id = %L', (select v from t where k = 'lote_meu'))) = 1, true);
  perform pg_temp.esperar('o técnico NÃO vê lote de outra base',
    pg_temp.conta('op', format('select count(*) from public.estoque_lotes where id = %L', (select v from t where k = 'lote_alheio'))) = 0, true);

  perform pg_temp.esperar('o técnico vê o produto que tem lote na base dele, mesmo fora das OS',
    pg_temp.conta('op', format('select count(*) from public.produtos where id = %L', (select v from t where k = 'prod_na_base'))) = 1, true);
  perform pg_temp.esperar('o técnico NÃO vê produto sem lote na base dele',
    pg_temp.conta('op', format('select count(*) from public.produtos where id = %L', (select v from t where k = 'prod_fora'))) = 0, true);

  perform pg_temp.esperar('o técnico vê a própria base',
    pg_temp.conta('op', format('select count(*) from public.bases where id = %L', (select v from t where k = 'minha'))) = 1, true);
  perform pg_temp.esperar('o técnico NÃO vê outra base',
    pg_temp.conta('op', format('select count(*) from public.bases where id = %L', (select v from t where k = 'outra'))) = 0, true);

  perform pg_temp.esperar('técnico sem base NÃO vê lote nenhum',
    pg_temp.conta('semb', 'select count(*) from public.estoque_lotes where lote in (''MEU-1'', ''ALHEIO-1'')') = 0, true);

  perform pg_temp.esperar('o cliente do Portal NÃO vê lote',
    pg_temp.conta('cli', 'select count(*) from public.estoque_lotes where lote in (''MEU-1'', ''ALHEIO-1'')') = 0, true);
end $$;

-- Desativado deixa de valer: não enxerga mais os lotes da base.
do $$
begin
  update public.funcionarios set ativo = false where profile_id = (select v from t where k = 'op');
  perform pg_temp.esperar('técnico desativado NÃO vê mais os lotes',
    pg_temp.conta('op', format('select count(*) from public.estoque_lotes where id = %L', (select v from t where k = 'lote_meu'))) = 0, true);
end $$;

rollback;
