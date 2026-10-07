-- O técnico lê a ficha técnica dos produtos que pode usar, e nada além disso.
--
-- Prova `20261007090000_tecnico_le_ficha_tecnica.sql`.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_op uuid := gen_random_uuid();
  v_base uuid; v_outra uuid; v_cliente uuid; v_os uuid; v_func uuid := gen_random_uuid();
  v_prev uuid; v_base_prod uuid; v_alheio uuid; v_func_doc uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v_op, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'rls-ficha-op@teste.local', '', now(), '{"provider":"email"}', '{"role":"operador"}', now(), now());

  insert into public.bases (nome) values ('[RLS] Base ficha') returning id into v_base;
  insert into public.bases (nome) values ('[RLS] Outra base ficha') returning id into v_outra;
  insert into public.funcionarios (id, nome_completo, cpf, cargo, setor, profile_id, base_id)
  values (v_func, '[RLS] Técnico ficha', '00000000071', 'Operador', 'Operacional', v_op, v_base);

  insert into public.clientes (nome, cnpj) values ('[RLS] Cliente ficha', '00000000001910') returning id into v_cliente;
  insert into public.ordens_servico (cliente_id, status) values (v_cliente, 'confirmada') returning id into v_os;
  insert into public.os_funcionarios (os_id, funcionario_id) values (v_os, v_func);

  insert into public.produtos (codigo, nome, categoria, unidade) values ('[RLS]-FT1', '[RLS] Previsto', 'Raticida', 'KG') returning id into v_prev;
  insert into public.produtos (codigo, nome, categoria, unidade) values ('[RLS]-FT2', '[RLS] Da base', 'Raticida', 'KG') returning id into v_base_prod;
  insert into public.produtos (codigo, nome, categoria, unidade) values ('[RLS]-FT3', '[RLS] Alheio', 'Raticida', 'KG') returning id into v_alheio;
  insert into public.os_produtos (os_id, produto_id, qtd_recomendada) values (v_os, v_prev, 1);
  insert into public.estoque_lotes (produto_id, base_id, lote, quantidade) values (v_base_prod, v_base, 'FT-1', 2);
  insert into public.estoque_lotes (produto_id, base_id, lote, quantidade) values (v_alheio, v_outra, 'FT-2', 2);

  insert into storage.objects (bucket_id, name) values
    ('portal-docs', 'produto/' || v_prev || '/ficha.pdf'),
    ('portal-docs', 'produto/' || v_base_prod || '/ficha.pdf'),
    ('portal-docs', 'produto/' || v_alheio || '/ficha.pdf'),
    ('portal-docs', 'funcionario/' || v_func || '/aso.pdf');

  insert into t values ('op', v_op), ('prev', v_prev), ('base_prod', v_base_prod), ('alheio', v_alheio), ('func', v_func);
end $$;

create or replace function pg_temp.esperar(_caso text, _obtido boolean, _esperado boolean)
returns void language plpgsql as $$
begin
  if _obtido is distinct from _esperado then
    raise exception 'FALHOU: % — esperado %, obteve %', _caso, _esperado, coalesce(_obtido::text, 'null');
  end if;
  raise notice 'ok: %', _caso;
end $$;

create or replace function pg_temp.ve(_nome text) returns boolean language plpgsql as $$
declare n int;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select v from t where k = 'op'), 'role', 'authenticated',
                      'email', 'rls-ficha-op@teste.local')::text, true);
  set local role authenticated;
  select count(*) into n from storage.objects where bucket_id = 'portal-docs' and name = _nome;
  reset role;
  return n = 1;
end $$;

do $$
begin
  perform pg_temp.esperar('técnico abre a ficha do produto previsto na OS dele',
    pg_temp.ve('produto/' || (select v from t where k = 'prev') || '/ficha.pdf'), true);
  perform pg_temp.esperar('técnico abre a ficha do produto que tem lote na base dele',
    pg_temp.ve('produto/' || (select v from t where k = 'base_prod') || '/ficha.pdf'), true);
  perform pg_temp.esperar('técnico NÃO abre ficha de produto fora das listas dele',
    pg_temp.ve('produto/' || (select v from t where k = 'alheio') || '/ficha.pdf'), false);
  perform pg_temp.esperar('técnico NÃO abre documento de colaborador no mesmo bucket',
    pg_temp.ve('funcionario/' || (select v from t where k = 'func') || '/aso.pdf'), false);
end $$;

rollback;
