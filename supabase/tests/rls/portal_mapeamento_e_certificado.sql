-- Portal: aplicações no Mapeamento e aviso de certificado.
--
-- Prova `20261007140000_portal_mapeamento_e_certificado.sql`. O cliente lê as
-- aplicações (Desinsetização) das OS dele e o nome do produto aplicado — e só
-- das dele. Quando o PDF do certificado é anexado, o cliente recebe um aviso,
-- uma vez só.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_cli_a uuid := gen_random_uuid();
  v_cli_b uuid := gen_random_uuid();
  v_cliente_a uuid; v_cliente_b uuid; v_os_a uuid; v_os_b uuid;
  v_plano_a uuid; v_plano_b uuid; v_produto uuid; v_produto_b uuid; v_rt uuid; v_cert uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_cli_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-pmap-cli-a@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now()),
    (v_cli_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-pmap-cli-b@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now());

  insert into public.clientes (nome, cnpj) values ('[RLS] Portal mapa A', '00000000002011') returning id into v_cliente_a;
  insert into public.clientes (nome, cnpj) values ('[RLS] Portal mapa B', '00000000002100') returning id into v_cliente_b;
  insert into public.cliente_portal_usuarios (cliente_id, nome, email, status) values
    (v_cliente_a, '[RLS] Portal mapa A', 'rls-pmap-cli-a@teste.local', 'ativo'),
    (v_cliente_b, '[RLS] Portal mapa B', 'rls-pmap-cli-b@teste.local', 'ativo');

  insert into public.ordens_servico (cliente_id, status, codigo) values (v_cliente_a, 'executada', 'OS-RLS-PMAP-A') returning id into v_os_a;
  insert into public.ordens_servico (cliente_id, status) values (v_cliente_b, 'executada') returning id into v_os_b;

  insert into public.os_planos_controle (os_id, tipo_controle, frequencia, servico_codigo)
  values (v_os_a, '[RLS] Desinsetização', 'Mensal', 'DI') returning id into v_plano_a;
  insert into public.os_planos_controle (os_id, tipo_controle, frequencia, servico_codigo)
  values (v_os_b, '[RLS] Desinsetização', 'Mensal', 'DI') returning id into v_plano_b;

  -- Produtos só aplicados: não estão em os_produtos nem homologados.
  insert into public.produtos (codigo, nome, categoria, unidade) values ('[RLS]-PM1', '[RLS] Gel aplicado', 'Inseticida', 'G')
  returning id into v_produto;
  insert into public.produtos (codigo, nome, categoria, unidade) values ('[RLS]-PM2', '[RLS] Gel de outro cliente', 'Inseticida', 'G')
  returning id into v_produto_b;

  insert into public.os_aplicacoes (os_id, plano_id, produto_id, tecnica, quantidade, unidade, areas)
  values (v_os_a, v_plano_a, v_produto, 'Aplicação de Gel', 35, 'g', array['Cozinha']);
  insert into public.os_aplicacoes (os_id, plano_id, produto_id, tecnica, quantidade, unidade, areas)
  values (v_os_b, v_plano_b, v_produto_b, 'Aplicação de Gel', 10, 'g', array['Depósito']);

  insert into public.responsaveis_tecnicos (nome, formacao, conselho, registro)
  values ('[RLS] RT portal', 'Químico', 'CRQ', '04-0002') returning id into v_rt;
  -- Como a Edge Function grava: primeiro a linha, depois o PDF.
  insert into public.os_certificados (os_id, numero, validade, responsavel_tecnico_id, snapshot)
  values (v_os_a, 'OS-RLS-PMAP-A', current_date + 90, v_rt, '{"versao": 1}') returning id into v_cert;

  insert into t values ('cli_a', v_cli_a), ('cli_b', v_cli_b), ('os_a', v_os_a), ('os_b', v_os_b),
    ('produto', v_produto), ('produto_b', v_produto_b), ('cert', v_cert);
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
  perform pg_temp.esperar('o cliente lê a aplicação da OS dele',
    pg_temp.conta('cli_a', format('select count(*) from public.os_aplicacoes where os_id = %L', (select v from t where k = 'os_a'))) = 1, true);
  perform pg_temp.esperar('o cliente NÃO lê aplicação de OS de outro cliente',
    pg_temp.conta('cli_a', format('select count(*) from public.os_aplicacoes where os_id = %L', (select v from t where k = 'os_b'))) = 0, true);
  perform pg_temp.esperar('o cliente vê o produto que só foi aplicado na OS dele',
    pg_temp.conta('cli_a', format('select count(*) from public.produtos where id = %L', (select v from t where k = 'produto'))) = 1, true);
  perform pg_temp.esperar('o cliente NÃO vê o produto aplicado na OS de outro cliente',
    pg_temp.conta('cli_a', format('select count(*) from public.produtos where id = %L', (select v from t where k = 'produto_b'))) = 0, true);

  perform pg_temp.esperar('sem PDF, o cliente ainda não foi avisado',
    (select count(*) from public.notificacoes where os_id = (select v from t where k = 'os_a') and titulo = 'Certificado de execução disponível') = 0, true);

  update public.os_certificados set pdf_path = 'os/' || (select v from t where k = 'os_a') || '/certificado/c.pdf',
    pdf_sha256 = repeat('a', 64) where id = (select v from t where k = 'cert');

  perform pg_temp.esperar('com o PDF anexado, o cliente recebe o aviso',
    pg_temp.conta('cli_a', format('select count(*) from public.notificacoes where os_id = %L and titulo = %L',
      (select v from t where k = 'os_a'), 'Certificado de execução disponível')) = 1, true);
  perform pg_temp.esperar('o aviso não chega ao cliente de outra OS',
    pg_temp.conta('cli_b', 'select count(*) from public.notificacoes where titulo = ''Certificado de execução disponível''') = 0, true);
end $$;

rollback;
