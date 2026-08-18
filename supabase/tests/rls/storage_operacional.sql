-- Suíte de RLS do bucket operacional-docs.
--
-- Roda contra o banco local do CI (`supabase db reset` já aplicou tudo), onde
-- temos superusuário e podemos trocar de role — coisa que o conector MCP de
-- produção não permite. Toda a suíte vive numa transação revertida no fim, então
-- não deixa resíduo.
--
-- O que se prova aqui é o que o conector não conseguiu provar: que as policies
-- realmente deixam o operador gravar assinatura na OS dele e realmente barram
-- todo o resto.

begin;

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------
create temporary table t_ids (k text primary key, v uuid);

do $$
declare
  v_op_a   uuid := gen_random_uuid();   -- operador escalado na OS A
  v_op_b   uuid := gen_random_uuid();   -- operador escalado só na OS B
  v_cli    uuid := gen_random_uuid();   -- usuário do portal do cliente da OS A
  v_os_a   uuid;
  v_os_b   uuid;
  v_cliente uuid;
  v_func_a uuid := gen_random_uuid();
  v_func_b uuid := gen_random_uuid();
begin
  -- Usuários de auth. O trigger on_auth_user_created cria os profiles.
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values
    (v_op_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-op-a@teste.local', '', now(), '{"provider":"email"}', '{"role":"operador"}', now(), now()),
    (v_op_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-op-b@teste.local', '', now(), '{"provider":"email"}', '{"role":"operador"}', now(), now()),
    (v_cli,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-cliente@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now());

  -- Um cliente e duas OS dele.
  insert into public.clientes (nome, razao_social, cnpj)
  values ('[RLS] Teste', '[RLS] Cliente de Teste', '00000000000191')
  returning id into v_cliente;

  insert into public.ordens_servico (cliente_id, status) values (v_cliente, 'em_andamento')
  returning id into v_os_a;
  insert into public.ordens_servico (cliente_id, status) values (v_cliente, 'em_andamento')
  returning id into v_os_b;

  -- Cada operador escalado na sua OS.
  insert into public.funcionarios (id, nome_completo, cpf, cargo, setor, profile_id) values
    (v_func_a, '[RLS] Operador A', '00000000001', 'Operador', 'Operacional', v_op_a),
    (v_func_b, '[RLS] Operador B', '00000000002', 'Operador', 'Operacional', v_op_b);
  insert into public.os_funcionarios (os_id, funcionario_id) values
    (v_os_a, v_func_a), (v_os_b, v_func_b);

  -- O usuário do portal, ligado por e-mail (é assim que o convite funciona).
  insert into public.cliente_portal_usuarios (cliente_id, nome, email, status)
  values (v_cliente, '[RLS] Portal', 'rls-cliente@teste.local', 'ativo');

  insert into t_ids values
    ('op_a', v_op_a), ('op_b', v_op_b), ('cli', v_cli),
    ('os_a', v_os_a), ('os_b', v_os_b), ('cliente', v_cliente);
end $$;

-- ---------------------------------------------------------------------------
-- Helper: roda uma expressão booleana como um usuário e compara com o esperado
-- ---------------------------------------------------------------------------
create or replace function pg_temp.esperar(_caso text, _obtido boolean, _esperado boolean)
returns void language plpgsql as $$
begin
  if _obtido is distinct from _esperado then
    raise exception 'FALHOU: % — esperado %, obteve %', _caso, _esperado, coalesce(_obtido::text,'null');
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
-- Parsing de caminho: nada fora da convenção pode virar um os_id
-- ---------------------------------------------------------------------------
do $$
begin
  perform pg_temp.esperar('caminho válido rende o os_id',
    public.storage_os_id('os/11111111-2222-3333-4444-555555555555/foto/1-x.png')
      = '11111111-2222-3333-4444-555555555555', true);
  perform pg_temp.esperar('travessia de diretório é rejeitada',
    public.storage_os_id('../../etc/passwd') is null, true);
  perform pg_temp.esperar('segmento que não é uuid é rejeitado',
    public.storage_os_id('os/nao-e-uuid/foto/x.png') is null, true);
  perform pg_temp.esperar('caminho sem tipo é rejeitado',
    public.storage_os_tipo('os/11111111-2222-3333-4444-555555555555//x.png') is null, true);
end $$;

-- ---------------------------------------------------------------------------
-- Escopo do operador
-- ---------------------------------------------------------------------------
do $$
declare os_a uuid := (select v from t_ids where k='os_a');
        os_b uuid := (select v from t_ids where k='os_b');
begin
  perform pg_temp.como((select v from t_ids where k='op_a'));

  -- O motivo de tudo isto: o operador não tem perfil de acesso, então a policy
  -- original (has_module_perm) negava até o que é dele.
  perform pg_temp.esperar('operador não tem perfil de acesso',
    (select perfil_acesso_id is null from public.profiles
      where id = (select v from t_ids where k='op_a')), true);
  perform pg_temp.esperar('policy antiga negaria o upload',
    public.has_module_perm('operacional','criar'), false);

  perform pg_temp.esperar('operador alcança a OS dele',  public.os_is_mine(os_a), true);
  perform pg_temp.esperar('operador não alcança OS alheia', public.os_is_mine(os_b), false);
end $$;

-- ---------------------------------------------------------------------------
-- As policies de storage, com role trocado de verdade
-- ---------------------------------------------------------------------------
do $$
declare os_a uuid := (select v from t_ids where k='os_a');
        os_b uuid := (select v from t_ids where k='os_b');
        ok boolean;
begin
  insert into storage.buckets (id, name, public)
  values ('operacional-docs','operacional-docs',false)
  on conflict (id) do nothing;

  perform pg_temp.como((select v from t_ids where k='op_a'));
  set local role authenticated;

  -- Permitido: assinatura na própria OS.
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('operacional-docs', 'os/'||os_a||'/assinatura/1-assinatura.png',
            (select v from t_ids where k='op_a'));
    ok := true;
  exception when others then ok := false; raise notice 'motivo: % %', sqlstate, sqlerrm;
  end;
  perform pg_temp.esperar('operador grava assinatura na OS dele', ok, true);

  -- Barrado: OS de outro operador.
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('operacional-docs', 'os/'||os_b||'/assinatura/1-assinatura.png',
            (select v from t_ids where k='op_a'));
    ok := true;
  exception when others then ok := false; raise notice 'motivo: % %', sqlstate, sqlerrm;
  end;
  perform pg_temp.esperar('operador não grava em OS alheia', ok, false);

  -- Barrado: tipo que é documento de registro, emitido pelo backoffice.
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('operacional-docs', 'os/'||os_a||'/certificado/1-cert.pdf',
            (select v from t_ids where k='op_a'));
    ok := true;
  exception when others then ok := false; raise notice 'motivo: % %', sqlstate, sqlerrm;
  end;
  perform pg_temp.esperar('operador não emite certificado', ok, false);

  -- Barrado: caminho fora da convenção.
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('operacional-docs', 'solto.png', (select v from t_ids where k='op_a'));
    ok := true;
  exception when others then ok := false; raise notice 'motivo: % %', sqlstate, sqlerrm;
  end;
  perform pg_temp.esperar('caminho fora da convenção é barrado', ok, false);

  reset role;
end $$;

-- ---------------------------------------------------------------------------
-- Portal do Cliente: só relatório publicado
-- ---------------------------------------------------------------------------
do $$
declare os_a uuid := (select v from t_ids where k='os_a');
        n int;
begin
  -- Um relatório da OS A, ainda em rascunho, e o PDF já no bucket.
  insert into public.os_relatorios (os_id, titulo, publicado)
  values (os_a, '[RLS] Relatório', false);
  insert into storage.objects (bucket_id, name)
  values ('operacional-docs', 'os/'||os_a||'/relatorio/1-rel.pdf');

  perform pg_temp.como((select v from t_ids where k='cli'));
  set local role authenticated;
  select count(*) into n from storage.objects
   where bucket_id='operacional-docs' and name = 'os/'||os_a||'/relatorio/1-rel.pdf';
  reset role;
  perform pg_temp.esperar('cliente não vê relatório em rascunho', n = 0, true);

  update public.os_relatorios set publicado = true, publicado_at = now() where os_id = os_a;

  perform pg_temp.como((select v from t_ids where k='cli'));
  set local role authenticated;
  select count(*) into n from storage.objects
   where bucket_id='operacional-docs' and name = 'os/'||os_a||'/relatorio/1-rel.pdf';
  reset role;
  perform pg_temp.esperar('cliente vê relatório publicado', n = 1, true);

  -- E continua sem enxergar a evidência de campo, publicada ou não.
  perform pg_temp.como((select v from t_ids where k='cli'));
  set local role authenticated;
  select count(*) into n from storage.objects
   where bucket_id='operacional-docs' and public.storage_os_tipo(name) = 'assinatura';
  reset role;
  perform pg_temp.esperar('cliente não vê assinatura', n = 0, true);
end $$;

rollback;
