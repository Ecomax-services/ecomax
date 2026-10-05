-- Mapa de pontos do cliente: quem vê o mapa de quem.
--
-- Prova `20261005140000_mapa_de_pontos_do_cliente.sql`. O mapa diz onde ficam
-- as iscas e armadilhas dentro da planta do cliente. Entregá-lo a outro
-- cliente é vazamento, e entregá-lo a um técnico que não atende aquele
-- cliente também — por isso os casos negativos dominam.
--
-- O técnico de campo não tem perfil de acesso: só enxerga pelo vínculo com a
-- OS. É esse caminho que se prova aqui, não o do perfil Operacional do
-- escritório.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_admin uuid := gen_random_uuid();
  v_op_a  uuid := gen_random_uuid();
  v_op_b  uuid := gen_random_uuid();
  v_cli_a uuid := gen_random_uuid();
  v_cli_b uuid := gen_random_uuid();
  v_cliente_a uuid; v_cliente_b uuid;
  v_os_a uuid; v_os_b uuid;
  v_func_a uuid := gen_random_uuid();
  v_func_b uuid := gen_random_uuid();
  v_area_a uuid; v_area_b uuid;
  v_ponto_a uuid; v_ponto_b uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-mapa-admin@teste.local', '', now(), '{"provider":"email"}', '{"role":"admin"}', now(), now()),
    (v_op_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-mapa-op-a@teste.local', '', now(), '{"provider":"email"}', '{"role":"operador"}', now(), now()),
    (v_op_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-mapa-op-b@teste.local', '', now(), '{"provider":"email"}', '{"role":"operador"}', now(), now()),
    (v_cli_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-mapa-cli-a@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now()),
    (v_cli_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-mapa-cli-b@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now());

  update public.profiles
     set perfil_acesso_id = (select id from public.perfis_acesso where nome = 'Administrador'), role = 'admin'
   where id = v_admin;

  insert into public.clientes (nome, cnpj) values ('[RLS] Mapa A', '00000000000515') returning id into v_cliente_a;
  insert into public.clientes (nome, cnpj) values ('[RLS] Mapa B', '00000000000604') returning id into v_cliente_b;

  insert into public.cliente_portal_usuarios (cliente_id, nome, email, status) values
    (v_cliente_a, '[RLS] Portal mapa A', 'rls-mapa-cli-a@teste.local', 'ativo'),
    (v_cliente_b, '[RLS] Portal mapa B', 'rls-mapa-cli-b@teste.local', 'ativo');

  insert into public.ordens_servico (cliente_id, status, rascunho) values (v_cliente_a, 'em_aberto', false) returning id into v_os_a;
  insert into public.ordens_servico (cliente_id, status, rascunho) values (v_cliente_b, 'em_aberto', false) returning id into v_os_b;

  insert into public.funcionarios (id, nome_completo, cpf, cargo, setor, profile_id) values
    (v_func_a, '[RLS] Técnico mapa A', '00000000011', 'Operador', 'Operacional', v_op_a),
    (v_func_b, '[RLS] Técnico mapa B', '00000000012', 'Operador', 'Operacional', v_op_b);
  insert into public.os_funcionarios (os_id, funcionario_id) values (v_os_a, v_func_a), (v_os_b, v_func_b);

  insert into public.cliente_areas (cliente_id, nome) values (v_cliente_a, 'Fábrica') returning id into v_area_a;
  insert into public.cliente_areas (cliente_id, nome) values (v_cliente_b, 'CD') returning id into v_area_b;

  insert into public.cliente_pontos (cliente_id, area_id, servico_codigo, numero, local)
  values (v_cliente_a, v_area_a, 'PI', 3, 'Doca 3') returning id into v_ponto_a;
  insert into public.cliente_pontos (cliente_id, area_id, servico_codigo, numero, local)
  values (v_cliente_b, v_area_b, 'PI', 3, 'Portaria') returning id into v_ponto_b;

  insert into t values
    ('admin', v_admin), ('op_a', v_op_a), ('op_b', v_op_b), ('cli_a', v_cli_a), ('cli_b', v_cli_b),
    ('cliente_a', v_cliente_a), ('cliente_b', v_cliente_b),
    ('area_a', v_area_a), ('area_b', v_area_b), ('ponto_a', v_ponto_a), ('ponto_b', v_ponto_b);
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
-- Operador em campo
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  perform pg_temp.como((select v from t where k = 'op_a'));
  set local role authenticated;
  select count(*) into n from public.cliente_pontos where id = (select v from t where k = 'ponto_a');
  reset role;
  perform pg_temp.esperar('técnico vê o ponto do cliente da OS dele', n = 1, true);

  perform pg_temp.como((select v from t where k = 'op_a'));
  set local role authenticated;
  select count(*) into n from public.cliente_areas where id = (select v from t where k = 'area_a');
  reset role;
  perform pg_temp.esperar('técnico vê a área do cliente da OS dele', n = 1, true);

  perform pg_temp.como((select v from t where k = 'op_a'));
  set local role authenticated;
  select count(*) into n from public.cliente_pontos where id = (select v from t where k = 'ponto_b');
  reset role;
  perform pg_temp.esperar('técnico NÃO vê ponto de cliente que não atende', n = 0, true);

  perform pg_temp.como((select v from t where k = 'op_a'));
  set local role authenticated;
  select count(*) into n from public.cliente_areas where id = (select v from t where k = 'area_b');
  reset role;
  perform pg_temp.esperar('técnico NÃO vê área de cliente que não atende', n = 0, true);
end $$;

-- ---------------------------------------------------------------------------
-- Portal do Cliente
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  perform pg_temp.como((select v from t where k = 'cli_a'));
  set local role authenticated;
  select count(*) into n from public.cliente_pontos where id = (select v from t where k = 'ponto_a');
  reset role;
  perform pg_temp.esperar('cliente vê o próprio mapa', n = 1, true);

  perform pg_temp.como((select v from t where k = 'cli_a'));
  set local role authenticated;
  select count(*) into n from public.cliente_pontos where id = (select v from t where k = 'ponto_b');
  reset role;
  perform pg_temp.esperar('cliente NÃO vê o mapa de outro cliente', n = 0, true);

  perform pg_temp.como((select v from t where k = 'cli_b'));
  set local role authenticated;
  select count(*) into n from public.cliente_areas where id = (select v from t where k = 'area_a');
  reset role;
  perform pg_temp.esperar('o outro cliente NÃO vê a área do primeiro', n = 0, true);
end $$;

-- ---------------------------------------------------------------------------
-- Escrita negada a quem só lê
-- ---------------------------------------------------------------------------
do $$
declare bloqueou boolean; n int;
begin
  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'op_a'));
  begin
    set local role authenticated;
    insert into public.cliente_pontos (cliente_id, area_id, servico_codigo, numero, local)
    values ((select v from t where k = 'cliente_a'), (select v from t where k = 'area_a'), 'PA', 1, '[RLS] Inventado');
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('técnico NÃO cria ponto', bloqueou, true);

  perform pg_temp.como((select v from t where k = 'op_a'));
  set local role authenticated;
  update public.cliente_pontos set local = '[RLS] Mudado' where id = (select v from t where k = 'ponto_a');
  get diagnostics n = row_count;
  reset role;
  perform pg_temp.esperar('técnico NÃO edita ponto', n = 0, true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'cli_a'));
  begin
    set local role authenticated;
    insert into public.cliente_areas (cliente_id, nome) values ((select v from t where k = 'cliente_a'), '[RLS] Área do portal');
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('cliente NÃO cria área no próprio mapa', bloqueou, true);

  perform pg_temp.como((select v from t where k = 'cli_a'));
  set local role authenticated;
  delete from public.cliente_pontos where id = (select v from t where k = 'ponto_a');
  get diagnostics n = row_count;
  reset role;
  perform pg_temp.esperar('cliente NÃO apaga ponto do próprio mapa', n = 0, true);
end $$;

-- ---------------------------------------------------------------------------
-- Backoffice e integridade — como admin
-- ---------------------------------------------------------------------------
do $$
declare bloqueou boolean; n int;
begin
  perform pg_temp.como((select v from t where k = 'admin'));
  set local role authenticated;
  insert into public.cliente_pontos (cliente_id, area_id, servico_codigo, fase, numero, local)
  values ((select v from t where k = 'cliente_a'), (select v from t where k = 'area_a'), 'PI', 1, 1, '[RLS] Fase 1');
  select count(*) into n from public.cliente_pontos where cliente_id = (select v from t where k = 'cliente_a');
  reset role;
  perform pg_temp.esperar('admin cria ponto com fase', n = 2, true);

  -- Ponto de um cliente pendurado na área de outro.
  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    insert into public.cliente_pontos (cliente_id, area_id, servico_codigo, numero, local)
    values ((select v from t where k = 'cliente_a'), (select v from t where k = 'area_b'), 'PA', 1, '[RLS] Cruzado');
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('ponto NÃO entra em área de outro cliente', bloqueou, true);

  -- Dois PI-03 na mesma área, sem fase: o nulo não pode escapar da unicidade.
  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    insert into public.cliente_pontos (cliente_id, area_id, servico_codigo, numero, local)
    values ((select v from t where k = 'cliente_a'), (select v from t where k = 'area_a'), 'PI', 3, '[RLS] Repetido');
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('número repetido no mesmo serviço e área é recusado', bloqueou, true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    insert into public.cliente_pontos (cliente_id, area_id, servico_codigo, numero, local)
    values ((select v from t where k = 'cliente_a'), (select v from t where k = 'area_a'), 'DI', 1, '[RLS] Desinsetização');
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('Desinsetização NÃO tem ponto', bloqueou, true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    update public.cliente_areas set cliente_id = (select v from t where k = 'cliente_b')
     where id = (select v from t where k = 'area_a');
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('área NÃO muda de cliente', bloqueou, true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    delete from public.cliente_areas where id = (select v from t where k = 'area_a');
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('área com pontos NÃO se apaga', bloqueou, true);
end $$;

-- Excluir o cliente leva o mapa junto. A trava da área não pode impedir isto.
-- Cliente próprio, sem OS: OS existente barra a exclusão do cliente, e não é
-- isso que se prova aqui.
do $$
declare n int; v_c uuid; v_a uuid;
begin
  insert into public.clientes (nome, cnpj) values ('[RLS] Mapa C', '00000000000787') returning id into v_c;
  insert into public.cliente_areas (cliente_id, nome) values (v_c, 'Fábrica') returning id into v_a;
  insert into public.cliente_pontos (cliente_id, area_id, servico_codigo, numero, local)
  values (v_c, v_a, 'AL', 1, 'Recepção');

  delete from public.clientes where id = v_c;
  select count(*) into n from public.cliente_pontos where cliente_id = v_c;
  perform pg_temp.esperar('excluir o cliente apaga o mapa dele', n = 0, true);
end $$;

rollback;
