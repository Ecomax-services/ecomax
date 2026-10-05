-- Empresa, responsável técnico e certificado.
--
-- Prova `20261005220000_empresa_rt_e_certificado.sql`. Duas garantias valem
-- mais que o resto:
--
--   - o certificado emitido não muda, nem o RT que o assinou: o documento de
--     março continua dizendo o que dizia em março;
--   - o cliente abre o arquivo do certificado da OS dele — o que antes dava
--     acesso negado — e continua sem abrir a foto interna, no mesmo caminho.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_admin uuid := gen_random_uuid();
  v_op    uuid := gen_random_uuid();
  v_cli_a uuid := gen_random_uuid();
  v_cli_b uuid := gen_random_uuid();
  v_cliente_a uuid; v_cliente_b uuid; v_os_a uuid; v_os_b uuid; v_rt uuid; v_cert uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-cert-admin@teste.local', '', now(), '{"provider":"email"}', '{"role":"admin"}', now(), now()),
    (v_op, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-cert-op@teste.local', '', now(), '{"provider":"email"}', '{"role":"operador"}', now(), now()),
    (v_cli_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-cert-cli-a@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now()),
    (v_cli_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-cert-cli-b@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now());

  update public.profiles
     set perfil_acesso_id = (select id from public.perfis_acesso where nome = 'Administrador'), role = 'admin'
   where id = v_admin;

  insert into public.clientes (nome, cnpj) values ('[RLS] Cert A', '00000000001244') returning id into v_cliente_a;
  insert into public.clientes (nome, cnpj) values ('[RLS] Cert B', '00000000001325') returning id into v_cliente_b;
  insert into public.cliente_portal_usuarios (cliente_id, nome, email, status) values
    (v_cliente_a, '[RLS] Portal cert A', 'rls-cert-cli-a@teste.local', 'ativo'),
    (v_cliente_b, '[RLS] Portal cert B', 'rls-cert-cli-b@teste.local', 'ativo');

  insert into public.ordens_servico (cliente_id, status) values (v_cliente_a, 'executada') returning id into v_os_a;
  insert into public.ordens_servico (cliente_id, status) values (v_cliente_b, 'executada') returning id into v_os_b;

  insert into public.responsaveis_tecnicos (nome, formacao, conselho, registro)
  values ('[RLS] RT Antigo', 'Químico', 'CRQ', '04-0001') returning id into v_rt;

  -- Como a Edge Function grava: fora da API, com a chave de serviço.
  insert into public.os_certificados (os_id, numero, validade, responsavel_tecnico_id, snapshot)
  values (v_os_a, 'OS-RLS-A', current_date + 90, v_rt, '{"rt": "[RLS] RT Antigo"}')
  returning id into v_cert;

  insert into t values ('admin', v_admin), ('op', v_op), ('cli_a', v_cli_a), ('cli_b', v_cli_b),
    ('os_a', v_os_a), ('os_b', v_os_b), ('rt', v_rt), ('cert', v_cert);
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
-- Empresa
-- ---------------------------------------------------------------------------
do $$
declare n int; bloqueou boolean;
begin
  perform pg_temp.esperar('a empresa nasce com razão social e CNPJ',
    exists (select 1 from public.empresa_config where cnpj = '04009610000107'), true);

  perform pg_temp.como((select v from t where k = 'cli_a'));
  set local role authenticated;
  select count(*) into n from public.empresa_config;
  reset role;
  perform pg_temp.esperar('o cliente lê os dados da empresa (estão no certificado dele)', n = 1, true);

  perform pg_temp.como((select v from t where k = 'cli_a'));
  set local role authenticated;
  update public.empresa_config set razao_social = '[RLS] Invadida';
  get diagnostics n = row_count;
  reset role;
  perform pg_temp.esperar('o cliente NÃO altera a empresa', n = 0, true);

  perform pg_temp.como((select v from t where k = 'admin'));
  set local role authenticated;
  update public.empresa_config set ceatox = '0800 000 0000';
  get diagnostics n = row_count;
  reset role;
  perform pg_temp.esperar('quem edita Configurações altera a empresa', n = 1, true);

  bloqueou := false;
  begin
    insert into public.empresa_config (razao_social, cnpj) values ('[RLS] Segunda', '11111111111111');
  exception when others then bloqueou := true;
  end;
  perform pg_temp.esperar('NÃO existe segunda empresa', bloqueou, true);
end $$;

-- ---------------------------------------------------------------------------
-- Responsável técnico
-- ---------------------------------------------------------------------------
do $$
declare n int; bloqueou boolean; v_novo uuid;
begin
  perform pg_temp.como((select v from t where k = 'admin'));
  set local role authenticated;
  insert into public.responsaveis_tecnicos (nome, formacao, conselho, registro)
  values ('[RLS] RT Novo', 'Química', 'CRQ', '04-0002') returning id into v_novo;
  reset role;
  insert into t values ('rt_novo', v_novo);

  perform pg_temp.esperar('registrar o novo encerra o anterior',
    (select vigente_ate is not null from public.responsaveis_tecnicos where id = (select v from t where k = 'rt')), true);
  select count(*) into n from public.responsaveis_tecnicos where vigente_ate is null;
  perform pg_temp.esperar('há um RT vigente, não dois', n = 1, true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    update public.responsaveis_tecnicos set registro = '04-9999' where id = v_novo;
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('o RT NÃO se edita', bloqueou, true);

  perform pg_temp.como((select v from t where k = 'admin'));
  set local role authenticated;
  update public.responsaveis_tecnicos set assinatura_path = 'rt/assinatura-1.png' where id = v_novo;
  reset role;
  perform pg_temp.esperar('a assinatura entra uma vez',
    (select assinatura_path = 'rt/assinatura-1.png' from public.responsaveis_tecnicos where id = v_novo), true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    update public.responsaveis_tecnicos set assinatura_path = 'rt/assinatura-2.png' where id = v_novo;
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('a assinatura NÃO se troca', bloqueou, true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    update public.responsaveis_tecnicos set vigente_ate = null where id = (select v from t where k = 'rt');
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('RT encerrado NÃO volta a valer', bloqueou, true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'op'));
  begin
    set local role authenticated;
    insert into public.responsaveis_tecnicos (nome, conselho, registro) values ('[RLS] Intruso', 'CRQ', '0');
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('o técnico NÃO registra RT', bloqueou, true);
end $$;

-- ---------------------------------------------------------------------------
-- Certificado emitido
-- ---------------------------------------------------------------------------
do $$
declare n int; bloqueou boolean;
begin
  perform pg_temp.esperar('o certificado continua apontando para o RT da época',
    (select responsavel_tecnico_id = (select v from t where k = 'rt')
       from public.os_certificados where id = (select v from t where k = 'cert')), true);

  bloqueou := false;
  begin
    update public.os_certificados set validade = validade + 365 where id = (select v from t where k = 'cert');
  exception when others then bloqueou := true;
  end;
  perform pg_temp.esperar('a validade NÃO muda depois de emitido, nem pela chave de serviço', bloqueou, true);

  update public.os_certificados
     set pdf_path = 'os/' || (select v from t where k = 'os_a') || '/certificado/1-cert.pdf',
         pdf_sha256 = repeat('a', 64)
   where id = (select v from t where k = 'cert');
  perform pg_temp.esperar('o PDF é anexado depois da emissão', true, true);

  bloqueou := false;
  begin
    update public.os_certificados set pdf_sha256 = repeat('b', 64) where id = (select v from t where k = 'cert');
  exception when others then bloqueou := true;
  end;
  perform pg_temp.esperar('o PDF anexado NÃO se troca', bloqueou, true);

  bloqueou := false;
  begin
    delete from public.os_certificados where id = (select v from t where k = 'cert');
  exception when others then bloqueou := true;
  end;
  perform pg_temp.esperar('certificado NÃO se apaga', bloqueou, true);

  perform pg_temp.como((select v from t where k = 'cli_a'));
  set local role authenticated;
  select count(*) into n from public.os_certificados;
  reset role;
  perform pg_temp.esperar('o cliente vê o certificado da OS dele', n = 1, true);

  perform pg_temp.como((select v from t where k = 'cli_b'));
  set local role authenticated;
  select count(*) into n from public.os_certificados;
  reset role;
  perform pg_temp.esperar('o outro cliente NÃO vê', n = 0, true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    insert into public.os_certificados (os_id, numero, validade, responsavel_tecnico_id, snapshot)
    values ((select v from t where k = 'os_b'), 'X', current_date, (select v from t where k = 'rt_novo'), '{}');
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('nem o admin emite certificado pela API', bloqueou, true);
end $$;

-- ---------------------------------------------------------------------------
-- Portal abre o arquivo do certificado
-- ---------------------------------------------------------------------------
do $$
declare
  os_a uuid := (select v from t where k = 'os_a');
  n int;
begin
  -- Exatamente como o Backoffice grava hoje: tudo em `anexo/`.
  insert into storage.objects (bucket_id, name) values
    ('operacional-docs', 'os/'||os_a||'/anexo/1-certificado.pdf'),
    ('operacional-docs', 'os/'||os_a||'/anexo/2-foto.jpg'),
    ('operacional-docs', 'os/'||os_a||'/certificado/1-cert.pdf');
  insert into public.os_anexos (os_id, nome, tipo, arquivo_url) values
    (os_a, '[RLS] Certificado anexado', 'certificado', 'os/'||os_a||'/anexo/1-certificado.pdf'),
    (os_a, '[RLS] Foto interna', 'foto', 'os/'||os_a||'/anexo/2-foto.jpg');

  perform pg_temp.como((select v from t where k = 'cli_a'));
  set local role authenticated;
  select count(*) into n from storage.objects where name = 'os/'||os_a||'/anexo/1-certificado.pdf';
  reset role;
  perform pg_temp.esperar('cliente abre o certificado anexado, sem relatório publicado', n = 1, true);

  perform pg_temp.como((select v from t where k = 'cli_a'));
  set local role authenticated;
  select count(*) into n from storage.objects where name = 'os/'||os_a||'/certificado/1-cert.pdf';
  reset role;
  perform pg_temp.esperar('cliente abre o PDF do certificado emitido', n = 1, true);

  perform pg_temp.como((select v from t where k = 'cli_a'));
  set local role authenticated;
  select count(*) into n from storage.objects where name = 'os/'||os_a||'/anexo/2-foto.jpg';
  reset role;
  perform pg_temp.esperar('cliente NÃO abre a foto interna no mesmo caminho', n = 0, true);

  perform pg_temp.como((select v from t where k = 'cli_b'));
  set local role authenticated;
  select count(*) into n from storage.objects where name like 'os/'||os_a||'/%';
  reset role;
  perform pg_temp.esperar('o outro cliente NÃO abre nada da OS', n = 0, true);
end $$;

rollback;
