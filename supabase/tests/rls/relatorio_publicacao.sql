-- Publicação do relatório técnico.
--
-- Prova `20261008130000_relatorio_publicacao.sql`:
--   - só a Edge Function (chave de serviço) registra a publicação;
--   - publica a última versão, e só com observações e parecer;
--   - a publicação entra em os_relatorios (o Portal lista e o cliente é
--     avisado); republicar tira a anterior do ar, sem tocar no PDF enviado à mão;
--   - a aba Versões traz o autor; o módulo Relatórios lê os arquivos da OS.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_gestor uuid := gen_random_uuid();
  v_oper   uuid := gen_random_uuid();
  v_cli    uuid := gen_random_uuid();
  v_cliente uuid; v_os uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_gestor, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-pub-gestor@teste.local', '', now(), '{"provider":"email"}', '{"role":"operacional"}', now(), now()),
    (v_oper, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-pub-oper@teste.local', '', now(), '{"provider":"email"}', '{"role":"operacional"}', now(), now()),
    (v_cli, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-pub-cli@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now());
  update public.profiles set role = 'operacional', nome_completo = '[RLS] Gestora Ana', perfil_acesso_id = (select id from public.perfis_acesso where nome = 'Gestor') where id = v_gestor;
  update public.profiles set role = 'operacional', perfil_acesso_id = (select id from public.perfis_acesso where nome = 'Operacional') where id = v_oper;

  insert into public.clientes (nome, cnpj) values ('[RLS] Cliente publicação', '00000000002704') returning id into v_cliente;
  insert into public.cliente_portal_usuarios (cliente_id, nome, email, status)
  values (v_cliente, '[RLS] Portal publicação', 'rls-pub-cli@teste.local', 'ativo');

  insert into public.ordens_servico (cliente_id, status, codigo) values (v_cliente, 'executada', 'OS-RLS-PUB') returning id into v_os;
  -- PDF enviado à mão, já publicado: não pode sair do ar por causa do relatório gerado.
  insert into public.os_relatorios (os_id, titulo, arquivo_url, publicado, publicado_at)
  values (v_os, '[RLS] Laudo enviado à mão', 'os/' || v_os || '/relatorio/laudo.pdf', true, now());

  insert into storage.objects (bucket_id, name) values ('operacional-docs', 'os/' || v_os || '/foto/1-ponto.jpg');

  insert into t values ('gestor', v_gestor), ('oper', v_oper), ('cli', v_cli), ('os', v_os);
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

create or replace function pg_temp.erro(_quem text, _sql text) returns text language plpgsql as $$
begin
  if _quem is null then
    execute _sql;
    return null;
  end if;
  perform pg_temp.como((select v from t where k = _quem));
  set local role authenticated;
  execute _sql;
  reset role;
  return null;
exception when others then
  reset role;
  return sqlstate;
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

-- Publicar como a Edge Function (sem trocar de papel = chave de serviço).
create or replace function pg_temp.publicar(_numero int) returns text language plpgsql as $$
begin
  return pg_temp.erro(null, format('select public.registrar_publicacao_relatorio(%L, %s, %L, %L)',
    (select v from t where k = 'os'), _numero, 'os/' || (select v from t where k = 'os') || '/relatorio/rel-v' || _numero || '.pdf',
    (select v from t where k = 'gestor')));
end $$;

create or replace function pg_temp.salvar(_base int) returns text language plpgsql as $$
begin
  return pg_temp.erro('gestor', format('select public.salvar_versao_relatorio(%L, %L::jsonb, null, %s)',
    (select v from t where k = 'os'), '{"observacoes": "Sem intercorrências.", "parecer": "Ambiente sob controle."}', _base));
end $$;

do $$
declare
  os constant uuid := (select v from t where k = 'os');
begin
  perform pg_temp.esperar('sessão comum não registra publicação (só a chave de serviço)',
    pg_temp.erro('gestor', format('select public.registrar_publicacao_relatorio(%L, 1, %L, %L)', os, 'os/' || os || '/relatorio/x.pdf', (select v from t where k = 'gestor'))) = '42501', true);
  perform pg_temp.esperar('a v1 vazia não publica: faltam observações e parecer',
    pg_temp.publicar(1) = '23514', true);

  perform pg_temp.esperar('o Gestor salva a v2', pg_temp.salvar(1) is null, true);
  perform pg_temp.esperar('só a última versão publica', pg_temp.publicar(1) = '40001', true);
  perform pg_temp.esperar('caminho fora da pasta da OS é recusado',
    pg_temp.erro(null, format('select public.registrar_publicacao_relatorio(%L, 2, %L, null)', os, 'os/outra/relatorio/x.pdf')) = '22023', true);

  perform pg_temp.esperar('a v2 publica', pg_temp.publicar(2) is null, true);
  perform pg_temp.esperar('o relatório aponta a v2 como publicada',
    (select versao_publicada from public.os_relatorios_tecnicos where os_id = os) = 2, true);
  perform pg_temp.esperar('o PDF da v2 entra em os_relatorios, publicado',
    exists (select 1 from public.os_relatorios where os_id = os and relatorio_versao = 2 and publicado), true);
  perform pg_temp.esperar('o cliente do Portal é avisado',
    pg_temp.conta('cli', format('select count(*) from public.notificacoes where os_id = %L and titulo = %L', os, 'Relatório técnico disponível')) >= 1, true);

  perform pg_temp.esperar('o Gestor salva a v3', pg_temp.salvar(2) is null, true);
  perform pg_temp.esperar('a v3 publica (reemissão)', pg_temp.publicar(3) is null, true);
  perform pg_temp.esperar('a v2 sai do ar; só a v3 do relatório gerado fica publicada',
    (select string_agg(relatorio_versao::text, ',') from public.os_relatorios where os_id = os and relatorio_versao is not null and publicado) = '3', true);
  perform pg_temp.esperar('o PDF enviado à mão continua publicado',
    exists (select 1 from public.os_relatorios where os_id = os and relatorio_versao is null and publicado), true);
end $$;

do $$
declare
  os constant uuid := (select v from t where k = 'os');
begin
  perform pg_temp.esperar('a aba Versões traz as três versões, com o autor',
    pg_temp.conta('gestor', format('select count(*) from public.listar_versoes_relatorio(%L) where (numero = 3 and autor = %L) or numero in (1, 2)', os, '[RLS] Gestora Ana')) = 3, true);
  perform pg_temp.esperar('o perfil Operacional não lista versões',
    pg_temp.erro('oper', format('select count(*) from public.listar_versoes_relatorio(%L)', os)) = '42501', true);
  perform pg_temp.esperar('o Gestor (Relatórios) lê as fotos da OS',
    pg_temp.conta('gestor', format('select count(*) from storage.objects where bucket_id = %L and name = %L', 'operacional-docs', 'os/' || os || '/foto/1-ponto.jpg')) = 1, true);
  perform pg_temp.esperar('anon não executa listar_versoes_relatorio',
    has_function_privilege('anon', 'public.listar_versoes_relatorio(uuid)', 'execute'), false);
end $$;

rollback;
