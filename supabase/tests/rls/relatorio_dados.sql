-- Dados do relatório técnico e Captura Não-Alvo.
--
-- Prova `20261008090000_relatorio_dados.sql`:
--   - relatorio_dados lê as visitas do cliente nos 28 dias até a execução, e
--     segue o mesmo ponto do mapa de uma visita para a outra;
--   - só quem tem Relatórios › ler chama; OS sem execução não tem relatório;
--   - a Captura Não-Alvo só entra em placa adesiva do cliente da OS, com
--     espécie do catálogo, e só quem edita Relatórios lança.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_gestor uuid := gen_random_uuid();
  v_almox  uuid := gen_random_uuid();
  v_oper   uuid := gen_random_uuid();
  v_cli    uuid := gen_random_uuid();
  v_cliente uuid; v_outro uuid; v_area uuid;
  v_pi1 uuid; v_pa1 uuid; v_pa2 uuid; v_pa_outro uuid;
  v_os_hoje uuid; v_os_antes uuid; v_os_velha uuid; v_os_aberta uuid;
  v_plano uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_gestor, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-rd-gestor@teste.local', '', now(), '{"provider":"email"}', '{"role":"operacional"}', now(), now()),
    (v_almox, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-rd-almox@teste.local', '', now(), '{"provider":"email"}', '{"role":"operacional"}', now(), now()),
    (v_oper, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-rd-oper@teste.local', '', now(), '{"provider":"email"}', '{"role":"operacional"}', now(), now()),
    (v_cli, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-rd-cli@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now());

  update public.profiles set role = 'operacional', perfil_acesso_id = (select id from public.perfis_acesso where nome = 'Gestor') where id = v_gestor;
  update public.profiles set role = 'operacional', perfil_acesso_id = (select id from public.perfis_acesso where nome = 'Almoxarifado') where id = v_almox;
  update public.profiles set role = 'operacional', perfil_acesso_id = (select id from public.perfis_acesso where nome = 'Operacional') where id = v_oper;

  insert into public.clientes (nome, cnpj) values ('[RLS] Cliente dados', '00000000002372') returning id into v_cliente;
  insert into public.clientes (nome, cnpj) values ('[RLS] Outro cliente dados', '00000000002453') returning id into v_outro;
  insert into public.cliente_portal_usuarios (cliente_id, nome, email, status)
  values (v_cliente, '[RLS] Portal dados', 'rls-rd-cli@teste.local', 'ativo');

  insert into public.cliente_areas (cliente_id, nome, ordem) values (v_cliente, 'Fábrica', 1) returning id into v_area;
  insert into public.cliente_pontos (cliente_id, area_id, servico_codigo, fase, numero, local)
  values (v_cliente, v_area, 'PI', 1, 1, 'Doca') returning id into v_pi1;
  insert into public.cliente_pontos (cliente_id, area_id, servico_codigo, numero, local)
  values (v_cliente, v_area, 'PA', 1, 'Expedição') returning id into v_pa1;
  insert into public.cliente_pontos (cliente_id, area_id, servico_codigo, numero, local)
  values (v_cliente, v_area, 'PA', 2, 'Vestiário') returning id into v_pa2;
  insert into public.cliente_areas (cliente_id, nome, ordem) values (v_outro, 'Outra', 1);
  insert into public.cliente_pontos (cliente_id, area_id, servico_codigo, numero, local)
  values (v_outro, (select id from public.cliente_areas where cliente_id = v_outro), 'PA', 1, 'Outra placa') returning id into v_pa_outro;

  -- Três execuções: hoje, 10 dias antes (dentro dos 28) e 40 dias antes (fora).
  insert into public.ordens_servico (cliente_id, status, codigo, termino_execucao, tipos_servico)
  values (v_cliente, 'executada', 'OS-RLS-RD-1', '2026-08-30T15:00:00Z', '{Desratização}') returning id into v_os_hoje;
  insert into public.ordens_servico (cliente_id, status, codigo, termino_execucao)
  values (v_cliente, 'executada', 'OS-RLS-RD-2', '2026-08-20T15:00:00Z') returning id into v_os_antes;
  insert into public.ordens_servico (cliente_id, status, codigo, termino_execucao)
  values (v_cliente, 'concluida', 'OS-RLS-RD-3', '2026-07-21T15:00:00Z') returning id into v_os_velha;
  insert into public.ordens_servico (cliente_id, status) values (v_cliente, 'em_aberto') returning id into v_os_aberta;

  -- O mesmo PI-01 lido nas três visitas.
  insert into public.os_planos_controle (os_id, tipo_controle, frequencia, servico_codigo)
  values (v_os_hoje, '[RLS] Controle Roedores', 'Semanal', 'PI') returning id into v_plano;
  insert into public.os_plano_pontos (plano_id, numero, cliente_ponto_id, fase, status_codigo, status_rotulo)
  values (v_plano, 1, v_pi1, 1, 1, 'Isca Consumida');
  insert into public.os_planos_controle (os_id, tipo_controle, frequencia, servico_codigo)
  values (v_os_antes, '[RLS] Controle Roedores', 'Semanal', 'PI') returning id into v_plano;
  insert into public.os_plano_pontos (plano_id, numero, cliente_ponto_id, fase, status_codigo, status_rotulo)
  values (v_plano, 1, v_pi1, 1, 3, 'Isca Intacta');
  insert into public.os_planos_controle (os_id, tipo_controle, frequencia, servico_codigo)
  values (v_os_velha, '[RLS] Controle Roedores', 'Semanal', 'PI') returning id into v_plano;
  insert into public.os_plano_pontos (plano_id, numero, cliente_ponto_id, fase, status_codigo, status_rotulo)
  values (v_plano, 1, v_pi1, 1, 2, 'Isca Mofada');

  insert into t values ('gestor', v_gestor), ('almox', v_almox), ('oper', v_oper), ('cli', v_cli),
    ('os_hoje', v_os_hoje), ('os_antes', v_os_antes), ('os_velha', v_os_velha), ('os_aberta', v_os_aberta),
    ('pi1', v_pi1), ('pa1', v_pa1), ('pa2', v_pa2), ('pa_outro', v_pa_outro);
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

create or replace function pg_temp.dados(_quem text, _os text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform pg_temp.como((select v from t where k = _quem));
  set local role authenticated;
  r := public.relatorio_dados((select v from t where k = _os));
  reset role;
  return r;
end $$;

create or replace function pg_temp.lista(_quem text, _codigo text) returns int language plpgsql as $$
declare n int;
begin
  perform pg_temp.como((select v from t where k = _quem));
  set local role authenticated;
  select count(*) into n from public.listar_relatorios_tecnicos() l where l.codigo = _codigo and l.versao_atual = 1;
  reset role;
  return n;
end $$;

create or replace function pg_temp.erro(_quem text, _sql text) returns text language plpgsql as $$
begin
  perform pg_temp.como((select v from t where k = _quem));
  set local role authenticated;
  execute _sql;
  reset role;
  return null;
exception when others then
  reset role;
  return sqlstate;
end $$;

-- Capturas lançadas pelo Gestor (Relatórios › editar).
do $$
begin
  perform pg_temp.esperar('o Gestor lança captura não-alvo numa placa adesiva do cliente',
    pg_temp.erro('gestor', format('insert into public.os_capturas_nao_alvo (os_id, cliente_ponto_id, especie) values (%L, %L, %L)',
      (select v from t where k = 'os_hoje'), (select v from t where k = 'pa1'), 'Aranha')) is null, true);
  perform pg_temp.esperar('captura em porta-isca é recusada',
    pg_temp.erro('gestor', format('insert into public.os_capturas_nao_alvo (os_id, cliente_ponto_id, especie) values (%L, %L, %L)',
      (select v from t where k = 'os_hoje'), (select v from t where k = 'pi1'), 'Aranha')) = '23514', true);
  perform pg_temp.esperar('captura em placa de outro cliente é recusada',
    pg_temp.erro('gestor', format('insert into public.os_capturas_nao_alvo (os_id, cliente_ponto_id, especie) values (%L, %L, %L)',
      (select v from t where k = 'os_hoje'), (select v from t where k = 'pa_outro'), 'Aranha')) = '23514', true);
  perform pg_temp.esperar('espécie fora do catálogo é recusada',
    pg_temp.erro('gestor', format('insert into public.os_capturas_nao_alvo (os_id, cliente_ponto_id, especie) values (%L, %L, %L)',
      (select v from t where k = 'os_hoje'), (select v from t where k = 'pa2'), 'Dragão')) = '23514', true);
  perform pg_temp.esperar('o Almoxarifado (só leitura) NÃO lança captura',
    pg_temp.erro('almox', format('insert into public.os_capturas_nao_alvo (os_id, cliente_ponto_id, especie) values (%L, %L, %L)',
      (select v from t where k = 'os_hoje'), (select v from t where k = 'pa2'), 'Grilo')) = '42501', true);
end $$;

-- relatorio_dados
do $$
declare d jsonb;
begin
  d := pg_temp.dados('gestor', 'os_hoje');
  perform pg_temp.esperar('a janela são os 28 dias até a execução, em Brasília',
    d -> 'janela' ->> 'de' = '2026-08-03' and d -> 'janela' ->> 'ate' = '2026-08-30', true);
  perform pg_temp.esperar('entram as duas visitas do período; a de 40 dias antes fica fora',
    jsonb_array_length(d -> 'visitas') = 2
    and not exists (select 1 from jsonb_array_elements(d -> 'visitas') x where x ->> 'codigo' = 'OS-RLS-RD-3'), true);
  perform pg_temp.esperar('o mesmo PI-01 aparece nas duas visitas, pelo ponto do mapa',
    (select count(*) from jsonb_array_elements(d -> 'pontos') x
      where x ->> 'cliente_ponto_id' = (select v from t where k = 'pi1')::text) = 2, true);
  perform pg_temp.esperar('a área do ponto vem do mapa do cliente',
    (select bool_and(x ->> 'area_id' is not null) from jsonb_array_elements(d -> 'pontos') x), true);
  perform pg_temp.esperar('as placas adesivas do mapa vêm, para as linhas da Captura Não-Alvo',
    jsonb_array_length(d -> 'placas') = 2, true);
  perform pg_temp.esperar('a captura lançada vem nos dados',
    (select count(*) from jsonb_array_elements(d -> 'capturas') x where x ->> 'especie' = 'Aranha') = 1, true);
  perform pg_temp.esperar('a capa traz a empresa do cadastro',
    d -> 'empresa' ->> 'razao_social' is not null and jsonb_typeof(d -> 'licencas') = 'array', true);
  perform pg_temp.esperar('o relatório (v1) vem junto',
    (d -> 'relatorio' ->> 'versao_atual')::int = 1, true);

  perform pg_temp.esperar('o Almoxarifado (Relatórios › ler) também lê',
    jsonb_array_length(pg_temp.dados('almox', 'os_hoje') -> 'visitas') = 2, true);
  perform pg_temp.esperar('o perfil Operacional NÃO lê',
    pg_temp.erro('oper', format('select public.relatorio_dados(%L)', (select v from t where k = 'os_hoje'))) = '42501', true);
  perform pg_temp.esperar('o cliente do Portal NÃO lê',
    pg_temp.erro('cli', format('select public.relatorio_dados(%L)', (select v from t where k = 'os_hoje'))) = '42501', true);
  perform pg_temp.esperar('OS em aberto não tem relatório',
    pg_temp.erro('gestor', format('select public.relatorio_dados(%L)', (select v from t where k = 'os_aberta'))) = 'P0002', true);
  perform pg_temp.esperar('a lista traz a OS com a versão do relatório',
    pg_temp.lista('almox', 'OS-RLS-RD-1') = 1, true);
  perform pg_temp.esperar('a lista é recusada ao perfil Operacional',
    pg_temp.erro('oper', 'select count(*) from public.listar_relatorios_tecnicos()') = '42501', true);
  perform pg_temp.esperar('anon não executa relatorio_dados',
    has_function_privilege('anon', 'public.relatorio_dados(uuid)', 'execute'), false);
end $$;

rollback;
