-- Catálogo de monitoramento: quem lê, quem escreve e o que a guarda segura.
--
-- Prova `20261005120000_catalogo_de_monitoramento.sql`. O caso que importa é
-- a guarda do código de status: o rótulo da legenda é editável, o código não.
-- Se "1" deixasse de ser "isca consumida", o comparativo do relatório passaria
-- a comparar coisas diferentes sem erro nenhum na tela.
--
-- A guarda vale até para o administrador. Por isso os casos de bloqueio rodam
-- como admin: se passassem só para o operador, provariam a RLS, não a guarda.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_admin uuid := gen_random_uuid();
  v_oper  uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-mon-admin@teste.local', '', now(), '{"provider":"email"}', '{"role":"admin"}', now(), now()),
    (v_oper, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-mon-oper@teste.local', '', now(), '{"provider":"email"}', '{"role":"operacional"}', now(), now());

  update public.profiles
     set perfil_acesso_id = (select id from public.perfis_acesso where nome = 'Administrador'), role = 'admin'
   where id = v_admin;
  update public.profiles
     set perfil_acesso_id = (select id from public.perfis_acesso where nome = 'Operacional'), role = 'operacional'
   where id = v_oper;

  insert into t values
    ('admin', v_admin), ('oper', v_oper),
    ('pi1', (select id from public.planilha_itens where servico_codigo = 'PI' and codigo = 1)),
    ('legado', (select id from public.planilha_itens where tipo_servico = 'Desratização' and codigo is null limit 1)),
    ('roedores', (select id from public.catalogo_itens where catalogo = 'tipos_controle' and nome = 'Controle Roedores')),
    ('unidade', (select id from public.catalogo_itens where catalogo = 'unidades' limit 1));
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
-- Dados de referência
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  select count(*) into n from public.monitoramento_servicos;
  perform pg_temp.esperar('os seis serviços existem', n = 6, true);

  select count(*) into n from public.planilha_itens where servico_codigo in ('PI', 'PA');
  perform pg_temp.esperar('PI e PA têm as quatro legendas cada', n = 8, true);

  select count(*) into n from public.monitoramento_mapeamento
   where catalogo_item_id = (select v from t where k = 'roedores');
  perform pg_temp.esperar('Controle Roedores abre PI e PA', n = 2, true);
end $$;

-- ---------------------------------------------------------------------------
-- Leitura: o App do operador precisa de tudo isto
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  perform pg_temp.como((select v from t where k = 'oper'));
  set local role authenticated;
  select count(*) into n from public.monitoramento_servicos;
  reset role;
  perform pg_temp.esperar('operador lê os serviços', n = 6, true);

  perform pg_temp.como((select v from t where k = 'oper'));
  set local role authenticated;
  select count(*) into n from public.planilha_itens where servico_codigo = 'PI';
  reset role;
  perform pg_temp.esperar('operador lê as legendas do PI', n = 4, true);

  perform pg_temp.como((select v from t where k = 'oper'));
  set local role authenticated;
  select count(*) into n from public.monitoramento_mapeamento;
  reset role;
  perform pg_temp.esperar('operador lê o mapeamento', n >= 5, true);

  perform pg_temp.como((select v from t where k = 'oper'));
  set local role authenticated;
  select count(*) into n from public.catalogo_itens where catalogo = 'monitoramento_pragas_oc';
  reset role;
  perform pg_temp.esperar('operador lê as pragas da Ocorrência Setorial', n = 14, true);
end $$;

-- ---------------------------------------------------------------------------
-- Escrita negada
-- ---------------------------------------------------------------------------
do $$
declare bloqueou boolean;
begin
  -- Nem o administrador cria serviço: não há policy de escrita.
  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    insert into public.monitoramento_servicos (codigo, nome, nome_longo, comportamento, ordem)
    values ('XX', 'Inventado', 'Inventado', 'status', 9);
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('admin NÃO cria serviço de monitoramento', bloqueou, true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'oper'));
  begin
    set local role authenticated;
    delete from public.monitoramento_mapeamento where catalogo_item_id = (select v from t where k = 'roedores');
    -- Delete sem permissão não dá erro: a RLS filtra e apaga zero linhas.
    if not found then bloqueou := true; end if;
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('operador NÃO apaga mapeamento', bloqueou, true);

  -- A FK composta: uma unidade de medida não pode virar PI.
  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    insert into public.monitoramento_mapeamento (catalogo_item_id, catalogo, servico_codigo)
    values ((select v from t where k = 'unidade'), 'tipos_controle', 'PI');
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('item de outro catálogo NÃO entra no mapeamento', bloqueou, true);
end $$;

-- ---------------------------------------------------------------------------
-- A guarda do código de status — tudo como admin
-- ---------------------------------------------------------------------------
do $$
declare bloqueou boolean; v_nome text; n int;
begin
  -- O que precisa continuar funcionando: trocar rótulo e cor.
  perform pg_temp.como((select v from t where k = 'admin'));
  set local role authenticated;
  update public.planilha_itens set nome = 'Isca roída', cor_bg = '#ffeedd'
   where id = (select v from t where k = 'pi1');
  select nome into v_nome from public.planilha_itens where id = (select v from t where k = 'pi1');
  reset role;
  perform pg_temp.esperar('admin troca o rótulo da legenda 1 do PI', v_nome = 'Isca roída', true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    update public.planilha_itens set codigo = 2 where id = (select v from t where k = 'pi1');
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('admin NÃO troca o código da legenda', bloqueou, true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    update public.planilha_itens set ativo = false where id = (select v from t where k = 'pi1');
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('admin NÃO inativa legenda com código', bloqueou, true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    delete from public.planilha_itens where id = (select v from t where k = 'pi1');
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('admin NÃO apaga legenda com código', bloqueou, true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    insert into public.planilha_itens (tipo_servico, nome, servico_codigo, codigo)
    values ('Desratização', '[RLS] Status 5', 'PI', 4);
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('admin NÃO cria legenda com código', bloqueou, true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    update public.planilha_itens set servico_codigo = 'PA', codigo = 4
     where id = (select v from t where k = 'legado');
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('admin NÃO dá código a legenda antiga', bloqueou, true);

  -- E o comportamento de antes, para legenda sem código, segue igual.
  perform pg_temp.como((select v from t where k = 'admin'));
  set local role authenticated;
  insert into public.planilha_itens (tipo_servico, nome) values ('Desratização', '[RLS] Legenda livre');
  update public.planilha_itens set ativo = false where nome = '[RLS] Legenda livre';
  delete from public.planilha_itens where nome = '[RLS] Legenda livre';
  get diagnostics n = row_count;
  reset role;
  perform pg_temp.esperar('legenda sem código continua criada, inativada e apagada', n = 1, true);
end $$;

rollback;
