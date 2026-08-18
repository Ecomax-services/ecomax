-- Suíte de RLS dos três módulos novos do Portal do Cliente.
--
-- O que se prova aqui é a afirmação que motivou as policies: sem elas o cliente
-- não lê `produtos` nem `funcionarios` (só há policy por has_module_perm, e o
-- perfil Cliente não tem linha para módulo nenhum). E, com elas, lê apenas o que
-- tem vínculo com ele.
--
-- Os casos negativos valem mais que os positivos: um portal que mostra o
-- colaborador de outro cliente é vazamento, não defeito de tela.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_cli_a uuid := gen_random_uuid();   -- usuário do portal do cliente A
  v_cli_b uuid := gen_random_uuid();   -- usuário do portal do cliente B
  v_cliente_a uuid; v_cliente_b uuid;
  v_os_a uuid; v_os_b uuid;
  v_func_a uuid := gen_random_uuid();  -- atende o cliente A
  v_func_b uuid := gen_random_uuid();  -- atende só o cliente B
  v_prod_a uuid; v_prod_x uuid;
  v_doc_inst uuid; v_doc_a uuid; v_doc_b uuid; v_doc_off uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_cli_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-portal-a@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now()),
    (v_cli_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-portal-b@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now());

  insert into public.clientes (nome, cnpj) values ('[RLS] Cliente A', '00000000000191') returning id into v_cliente_a;
  insert into public.clientes (nome, cnpj) values ('[RLS] Cliente B', '00000000000272') returning id into v_cliente_b;

  insert into public.cliente_portal_usuarios (cliente_id, nome, email, status)
  values (v_cliente_a, '[RLS] Portal A', 'rls-portal-a@teste.local', 'ativo'),
         (v_cliente_b, '[RLS] Portal B', 'rls-portal-b@teste.local', 'ativo');

  insert into public.ordens_servico (cliente_id, status) values (v_cliente_a, 'executada') returning id into v_os_a;
  insert into public.ordens_servico (cliente_id, status) values (v_cliente_b, 'executada') returning id into v_os_b;

  insert into public.funcionarios (id, nome_completo, cpf, cargo, setor) values
    (v_func_a, '[RLS] Técnico do A', '00000000011', 'Técnico', 'Operações'),
    (v_func_b, '[RLS] Técnico do B', '00000000022', 'Técnico', 'Operações');
  insert into public.os_funcionarios (os_id, funcionario_id) values (v_os_a, v_func_a), (v_os_b, v_func_b);

  insert into public.funcionario_documentos (funcionario_id, tipo, validade) values
    (v_func_a, 'NR35', current_date + 90), (v_func_b, 'NR35', current_date + 90);

  -- Um produto aplicado numa OS do A, e outro que não tem relação com ninguém.
  insert into public.produtos (codigo, nome, unidade) values ('[RLS]-P1', '[RLS] Aplicado no A', 'L') returning id into v_prod_a;
  insert into public.produtos (codigo, nome, unidade) values ('[RLS]-PX', '[RLS] Sem vínculo', 'L') returning id into v_prod_x;
  insert into public.os_produtos (os_id, produto_id, qtd_recomendada) values (v_os_a, v_prod_a, 1);

  insert into public.cliente_documentos (cliente_id, categoria, titulo, ativo)
  values (null, 'Manual do Usuário', '[RLS] Manual institucional', true) returning id into v_doc_inst;
  insert into public.cliente_documentos (cliente_id, categoria, titulo, ativo)
  values (v_cliente_a, 'SSMA', '[RLS] Doc do A', true) returning id into v_doc_a;
  insert into public.cliente_documentos (cliente_id, categoria, titulo, ativo)
  values (v_cliente_b, 'SSMA', '[RLS] Doc do B', true) returning id into v_doc_b;
  insert into public.cliente_documentos (cliente_id, categoria, titulo, ativo)
  values (null, 'SSMA', '[RLS] Institucional desativado', false) returning id into v_doc_off;

  insert into t values
    ('cli_a', v_cli_a), ('cli_b', v_cli_b), ('func_a', v_func_a), ('func_b', v_func_b),
    ('prod_a', v_prod_a), ('prod_x', v_prod_x),
    ('doc_inst', v_doc_inst), ('doc_a', v_doc_a), ('doc_b', v_doc_b), ('doc_off', v_doc_off);
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
-- O motivo das policies existirem
-- ---------------------------------------------------------------------------
do $$
begin
  perform pg_temp.como((select v from t where k='cli_a'));
  perform pg_temp.esperar('cliente não tem permissão de módulo em estoque',
    public.has_module_perm('estoque','ler'), false);
  perform pg_temp.esperar('cliente não tem permissão de módulo em gestao_usuarios',
    public.has_module_perm('gestao_usuarios','ler'), false);
end $$;

-- ---------------------------------------------------------------------------
-- Documentos
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.cliente_documentos where id = (select v from t where k='doc_inst');
  reset role;
  perform pg_temp.esperar('cliente vê documento institucional', n = 1, true);

  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.cliente_documentos where id = (select v from t where k='doc_a');
  reset role;
  perform pg_temp.esperar('cliente vê documento próprio', n = 1, true);

  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.cliente_documentos where id = (select v from t where k='doc_b');
  reset role;
  perform pg_temp.esperar('cliente NÃO vê documento de outro cliente', n = 0, true);

  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.cliente_documentos where id = (select v from t where k='doc_off');
  reset role;
  perform pg_temp.esperar('cliente NÃO vê documento desativado', n = 0, true);
end $$;

-- ---------------------------------------------------------------------------
-- Colaboradores
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.funcionarios where id = (select v from t where k='func_a');
  reset role;
  perform pg_temp.esperar('cliente vê quem atendeu a OS dele', n = 1, true);

  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.funcionarios where id = (select v from t where k='func_b');
  reset role;
  perform pg_temp.esperar('cliente NÃO vê colaborador de outro cliente', n = 0, true);

  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.funcionario_documentos
   where funcionario_id = (select v from t where k='func_b');
  reset role;
  perform pg_temp.esperar('cliente NÃO vê documento de colaborador alheio', n = 0, true);

  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.funcionario_documentos
   where funcionario_id = (select v from t where k='func_a');
  reset role;
  perform pg_temp.esperar('cliente vê documento de quem o atendeu', n = 1, true);
end $$;

-- ---------------------------------------------------------------------------
-- Produtos
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.produtos where id = (select v from t where k='prod_a');
  reset role;
  -- É o caso que motiva a tela: a FDS existe para o que foi aplicado no local.
  perform pg_temp.esperar('cliente vê produto aplicado na OS dele', n = 1, true);

  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.produtos where id = (select v from t where k='prod_x');
  reset role;
  perform pg_temp.esperar('cliente NÃO vê produto sem vínculo', n = 0, true);

  perform pg_temp.como((select v from t where k='cli_b'));
  set local role authenticated;
  select count(*) into n from public.produtos where id = (select v from t where k='prod_a');
  reset role;
  perform pg_temp.esperar('outro cliente NÃO vê o produto do primeiro', n = 0, true);
end $$;

rollback;
