-- RLS do detalhe da ordem de serviço no Portal do Cliente.
--
-- Prova as policies de `20260921150000_portal_ve_o_detalhe_da_os.sql`: o
-- cliente lê o plano de controle, os pontos e o certificado das OS dele, e não
-- lê os de mais ninguém.
--
-- Os casos negativos valem mais que os positivos. Um portal que mostra o
-- mapeamento de outro cliente entrega onde ficam as iscas de um concorrente —
-- é vazamento, não defeito de tela.
--
-- Também prova o recorte por tipo de anexo: foto e autorização são material de
-- trabalho da equipe e não aparecem para o cliente, mesmo sendo da OS dele.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_cli_a uuid := gen_random_uuid();
  v_cli_b uuid := gen_random_uuid();
  v_cliente_a uuid; v_cliente_b uuid;
  v_os_a uuid; v_os_b uuid;
  v_plano_a uuid; v_plano_b uuid;
  v_ponto_a uuid; v_ponto_b uuid;
  v_cert_a uuid; v_cert_b uuid; v_foto_a uuid; v_compr_a uuid;
  v_crono_a uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_cli_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-detalhe-a@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now()),
    (v_cli_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-detalhe-b@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now());

  insert into public.clientes (nome, cnpj) values ('[RLS] Detalhe A', '00000000000353') returning id into v_cliente_a;
  insert into public.clientes (nome, cnpj) values ('[RLS] Detalhe B', '00000000000434') returning id into v_cliente_b;

  insert into public.cliente_portal_usuarios (cliente_id, nome, email, status)
  values (v_cliente_a, '[RLS] Portal detalhe A', 'rls-detalhe-a@teste.local', 'ativo'),
         (v_cliente_b, '[RLS] Portal detalhe B', 'rls-detalhe-b@teste.local', 'ativo');

  insert into public.ordens_servico (cliente_id, status) values (v_cliente_a, 'executada') returning id into v_os_a;
  insert into public.ordens_servico (cliente_id, status) values (v_cliente_b, 'executada') returning id into v_os_b;

  -- Mapeamento
  insert into public.os_planos_controle (os_id, tipo_controle, frequencia, pontos_previstos)
  values (v_os_a, 'Roedores', 'Mensal', 2) returning id into v_plano_a;
  insert into public.os_planos_controle (os_id, tipo_controle, frequencia, pontos_previstos)
  values (v_os_b, 'Roedores', 'Mensal', 2) returning id into v_plano_b;

  insert into public.os_plano_pontos (plano_id, numero, identificacao, situacao)
  values (v_plano_a, 1, '[RLS] Ponto do A', 'conforme') returning id into v_ponto_a;
  insert into public.os_plano_pontos (plano_id, numero, identificacao, situacao)
  values (v_plano_b, 1, '[RLS] Ponto do B', 'conforme') returning id into v_ponto_b;

  -- Anexos: o que o cliente deve ver e o que não deve
  insert into public.os_anexos (os_id, nome, tipo) values (v_os_a, '[RLS] Certificado do A', 'certificado') returning id into v_cert_a;
  insert into public.os_anexos (os_id, nome, tipo) values (v_os_b, '[RLS] Certificado do B', 'certificado') returning id into v_cert_b;
  insert into public.os_anexos (os_id, nome, tipo) values (v_os_a, '[RLS] Foto interna do A', 'foto') returning id into v_foto_a;
  insert into public.os_anexos (os_id, nome, tipo) values (v_os_a, '[RLS] Comprovante do A', 'comprovante') returning id into v_compr_a;

  -- Cronograma, que já tinha policy — aqui só para o detalhe ficar completo
  insert into public.os_cronograma (os_id, data_prevista, status)
  values (v_os_a, current_date + 30, 'previsto') returning id into v_crono_a;

  insert into t values
    ('cli_a', v_cli_a), ('cli_b', v_cli_b),
    ('plano_a', v_plano_a), ('plano_b', v_plano_b),
    ('ponto_a', v_ponto_a), ('ponto_b', v_ponto_b),
    ('cert_a', v_cert_a), ('cert_b', v_cert_b),
    ('foto_a', v_foto_a), ('compr_a', v_compr_a), ('crono_a', v_crono_a);
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
-- Mapeamento
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.os_planos_controle where id = (select v from t where k='plano_a');
  reset role;
  perform pg_temp.esperar('cliente vê o plano de controle da OS dele', n = 1, true);

  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.os_planos_controle where id = (select v from t where k='plano_b');
  reset role;
  perform pg_temp.esperar('cliente NÃO vê o plano de outro cliente', n = 0, true);

  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.os_plano_pontos where id = (select v from t where k='ponto_a');
  reset role;
  perform pg_temp.esperar('cliente vê os pontos do plano dele', n = 1, true);

  -- O ponto não tem cliente_id nem os_id: o vínculo passa pelo plano. Se a
  -- policy do ponto olhasse só o próprio registro, este caso vazaria.
  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.os_plano_pontos where id = (select v from t where k='ponto_b');
  reset role;
  perform pg_temp.esperar('cliente NÃO vê ponto de plano alheio', n = 0, true);

  perform pg_temp.como((select v from t where k='cli_b'));
  set local role authenticated;
  select count(*) into n from public.os_plano_pontos where id = (select v from t where k='ponto_a');
  reset role;
  perform pg_temp.esperar('o outro cliente também NÃO vê o ponto do primeiro', n = 0, true);
end $$;

-- ---------------------------------------------------------------------------
-- Certificado e o recorte por tipo de anexo
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.os_anexos where id = (select v from t where k='cert_a');
  reset role;
  perform pg_temp.esperar('cliente vê o certificado da OS dele', n = 1, true);

  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.os_anexos where id = (select v from t where k='cert_b');
  reset role;
  perform pg_temp.esperar('cliente NÃO vê certificado de outro cliente', n = 0, true);

  -- Material de trabalho da equipe. Está na OS do próprio cliente, e ainda
  -- assim não aparece — o recorte é por tipo, não só por dono.
  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.os_anexos where id = (select v from t where k='foto_a');
  reset role;
  perform pg_temp.esperar('cliente NÃO vê foto interna, mesmo sendo da OS dele', n = 0, true);

  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.os_anexos where id = (select v from t where k='compr_a');
  reset role;
  perform pg_temp.esperar('cliente vê o comprovante da OS dele', n = 1, true);
end $$;

-- ---------------------------------------------------------------------------
-- Cronograma — já tinha policy; aqui garante que o detalhe fecha inteiro
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  perform pg_temp.como((select v from t where k='cli_a'));
  set local role authenticated;
  select count(*) into n from public.os_cronograma where id = (select v from t where k='crono_a');
  reset role;
  perform pg_temp.esperar('cliente vê o cronograma da OS dele', n = 1, true);

  perform pg_temp.como((select v from t where k='cli_b'));
  set local role authenticated;
  select count(*) into n from public.os_cronograma where id = (select v from t where k='crono_a');
  reset role;
  perform pg_temp.esperar('outro cliente NÃO vê esse cronograma', n = 0, true);
end $$;

rollback;
