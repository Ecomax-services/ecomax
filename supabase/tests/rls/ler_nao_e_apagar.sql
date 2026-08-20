-- Ler não é apagar.
--
-- Três tabelas tinham uma policy só, `FOR ALL`, com `USING` pedindo apenas
-- 'ler' e `WITH CHECK` pedindo 'editar'. Como `WITH CHECK` não vale para
-- DELETE, quem tinha só leitura apagava:
--
--   orcamento_itens        e o trigger mudava o valor do orçamento junto;
--   cliente_documentos     documentos do cliente;
--   funcionario_documentos ASO e CNH de qualquer colaborador — o que, com a
--                          regra de bloqueio por documento, tira o técnico das
--                          novas OS sem que ninguém entenda o motivo.
--
-- Os sujeitos não são perfis inventados para o teste caber: "Operacional" lê
-- Gestão de Clientes sem editar, e "Gestor" lê Gestão de Usuários sem editar.
-- São os que já existem no sistema.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_leitor uuid := gen_random_uuid();
  v_editor uuid := gen_random_uuid();
  v_perfil_leitura uuid;
  v_perfil_escrita uuid;
  v_perfil_gestor uuid;
  v_gestor uuid := gen_random_uuid();
  v_cliente uuid;
  v_orc uuid;
  v_item uuid;
  v_doc_cli uuid;
  v_func uuid := gen_random_uuid();
  v_doc_func uuid;
begin
  -- Os dois perfis que já existem no sistema.
  select id into v_perfil_leitura from public.perfis_acesso where nome = 'Operacional';
  select id into v_perfil_escrita from public.perfis_acesso where nome = 'Administrador';
  select id into v_perfil_gestor  from public.perfis_acesso where nome = 'Gestor';

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_leitor, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-orc-leitor@teste.local', '', now(), '{"provider":"email"}', '{"role":"operacional"}', now(), now()),
    (v_editor, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-orc-editor@teste.local', '', now(), '{"provider":"email"}', '{"role":"admin"}', now(), now()),
    (v_gestor, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-orc-gestor@teste.local', '', now(), '{"provider":"email"}', '{"role":"gestor"}', now(), now());

  -- O trigger em auth.users cria os profiles; aqui só se aponta o perfil.
  update public.profiles set perfil_acesso_id = v_perfil_leitura, role = 'operacional' where id = v_leitor;
  update public.profiles set perfil_acesso_id = v_perfil_escrita, role = 'admin'       where id = v_editor;
  update public.profiles set perfil_acesso_id = v_perfil_gestor,  role = 'gestor'      where id = v_gestor;

  insert into public.clientes (nome, cnpj) values ('[RLS] Cliente do orçamento', '00000000000353') returning id into v_cliente;
  insert into public.orcamentos (cliente_id, status, valor_total)
  values (v_cliente, 'em_elaboracao', 0) returning id into v_orc;
  insert into public.orcamento_itens (orcamento_id, tipo_controle, frequencia, valor)
  values (v_orc, 'Desratização', 'Mensal', 800) returning id into v_item;

  insert into public.cliente_documentos (cliente_id, categoria, titulo, ativo)
  values (v_cliente, 'Contrato', '[RLS] Contrato do cliente', true) returning id into v_doc_cli;

  insert into public.funcionarios (id, nome_completo, cpf, cargo, setor)
  values (v_func, '[RLS] Técnico com documentos', '00000000044', 'Técnico de Campo', 'Operações');
  insert into public.funcionario_documentos (funcionario_id, tipo, validade)
  values (v_func, 'ASO', current_date + 200) returning id into v_doc_func;

  insert into t values ('leitor', v_leitor), ('editor', v_editor), ('orc', v_orc), ('item', v_item),
                       ('doc_cli', v_doc_cli), ('doc_func', v_doc_func), ('gestor', v_gestor);
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
-- O sujeito é mesmo um leitor
-- ---------------------------------------------------------------------------
do $$
begin
  perform pg_temp.como((select v from t where k='leitor'));
  perform pg_temp.esperar('perfil Operacional lê Gestão de Clientes',
    public.has_module_perm('gestao_clientes','ler'), true);
  perform pg_temp.esperar('perfil Operacional NÃO edita Gestão de Clientes',
    public.has_module_perm('gestao_clientes','editar'), false);
end $$;

-- ---------------------------------------------------------------------------
-- O que ele pode e o que não pode
-- ---------------------------------------------------------------------------
do $$
declare n int; total numeric;
begin
  perform pg_temp.como((select v from t where k='leitor'));
  set local role authenticated;
  select count(*) into n from public.orcamento_itens where id = (select v from t where k='item');
  reset role;
  perform pg_temp.esperar('leitor vê o item do orçamento', n = 1, true);

  -- O caso que motivou tudo.
  perform pg_temp.como((select v from t where k='leitor'));
  begin
    set local role authenticated;
    delete from public.orcamento_itens where id = (select v from t where k='item');
    reset role;
  exception when insufficient_privilege then
    reset role;
  end;
  select count(*) into n from public.orcamento_itens where id = (select v from t where k='item');
  perform pg_temp.esperar('leitor NÃO apaga item de orçamento', n = 1, true);

  -- E o total do orçamento continua de pé.
  select valor_total into total from public.orcamentos where id = (select v from t where k='orc');
  perform pg_temp.esperar('o valor do orçamento sobrevive à tentativa', total = 800, true);

  perform pg_temp.como((select v from t where k='leitor'));
  begin
    set local role authenticated;
    update public.orcamento_itens set valor = 1 where id = (select v from t where k='item');
    reset role;
  exception when insufficient_privilege then
    reset role;
  end;
  select count(*) into n from public.orcamento_itens where id = (select v from t where k='item') and valor = 800;
  perform pg_temp.esperar('leitor NÃO altera valor de item', n = 1, true);

  perform pg_temp.como((select v from t where k='leitor'));
  begin
    set local role authenticated;
    insert into public.orcamento_itens (orcamento_id, tipo_controle, frequencia, valor)
    values ((select v from t where k='orc'), 'Descupinização', 'Anual', 500);
    reset role;
  exception when insufficient_privilege then
    reset role;
  end;
  select count(*) into n from public.orcamento_itens where orcamento_id = (select v from t where k='orc');
  perform pg_temp.esperar('leitor NÃO acrescenta item', n = 1, true);
end $$;


-- ---------------------------------------------------------------------------
-- As outras duas tabelas com o mesmo desenho
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  perform pg_temp.como((select v from t where k='leitor'));
  begin
    set local role authenticated;
    delete from public.cliente_documentos where id = (select v from t where k='doc_cli');
    reset role;
  exception when insufficient_privilege then
    reset role;
  end;
  select count(*) into n from public.cliente_documentos where id = (select v from t where k='doc_cli');
  perform pg_temp.esperar('leitor NÃO apaga documento de cliente', n = 1, true);

  -- Gestor lê Gestão de Usuários sem editar. Apagar o ASO de um técnico o
  -- deixaria bloqueado para novas OS, e o motivo seria invisível.
  perform pg_temp.como((select v from t where k='gestor'));
  perform pg_temp.esperar('perfil Gestor lê Gestão de Usuários',
    public.has_module_perm('gestao_usuarios','ler'), true);
  perform pg_temp.esperar('perfil Gestor NÃO edita Gestão de Usuários',
    public.has_module_perm('gestao_usuarios','editar'), false);

  begin
    set local role authenticated;
    delete from public.funcionario_documentos where id = (select v from t where k='doc_func');
    reset role;
  exception when insufficient_privilege then
    reset role;
  end;
  select count(*) into n from public.funcionario_documentos where id = (select v from t where k='doc_func');
  perform pg_temp.esperar('gestor NÃO apaga ASO de colaborador', n = 1, true);
end $$;

-- ---------------------------------------------------------------------------
-- Quem edita continua editando — a correção não pode travar o trabalho
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  perform pg_temp.como((select v from t where k='editor'));
  set local role authenticated;
  insert into public.orcamento_itens (orcamento_id, tipo_controle, frequencia, valor)
  values ((select v from t where k='orc'), 'Descupinização', 'Anual', 500);
  reset role;
  select count(*) into n from public.orcamento_itens where orcamento_id = (select v from t where k='orc');
  perform pg_temp.esperar('editor acrescenta item', n = 2, true);

  perform pg_temp.como((select v from t where k='editor'));
  set local role authenticated;
  delete from public.orcamento_itens where id = (select v from t where k='item');
  reset role;
  select count(*) into n from public.orcamento_itens where orcamento_id = (select v from t where k='orc');
  perform pg_temp.esperar('editor apaga item', n = 1, true);
end $$;

rollback;
