-- Histórico mês a mês do relatório técnico.
--
-- Prova `20261008110000_relatorio_historico.sql`: `relatorio_dados` devolve o
-- histórico do cliente agregado por mês, do 1º de janeiro do ano anterior até
-- a execução — status por código, contagem por espécie, ocorrências, capturas
-- e os meses com visita de cada bloco. Visita de outro cliente, de dois anos
-- atrás ou posterior à execução fica fora.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_gestor uuid := gen_random_uuid();
  v_cliente uuid; v_outro uuid; v_area uuid; v_pi uuid; v_al uuid; v_pa uuid;
  v_os uuid; v_plano uuid;
  r record;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v_gestor, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'rls-rh-gestor@teste.local', '', now(), '{"provider":"email"}', '{"role":"operacional"}', now(), now());
  update public.profiles set role = 'operacional', perfil_acesso_id = (select id from public.perfis_acesso where nome = 'Gestor') where id = v_gestor;

  insert into public.clientes (nome, cnpj) values ('[RLS] Cliente histórico', '00000000002534') returning id into v_cliente;
  insert into public.clientes (nome, cnpj) values ('[RLS] Outro histórico', '00000000002615') returning id into v_outro;
  insert into public.cliente_areas (cliente_id, nome, ordem) values (v_cliente, 'Fábrica', 1) returning id into v_area;
  insert into public.cliente_pontos (cliente_id, area_id, servico_codigo, fase, numero, local) values (v_cliente, v_area, 'PI', 1, 1, 'Doca') returning id into v_pi;
  insert into public.cliente_pontos (cliente_id, area_id, servico_codigo, numero, local) values (v_cliente, v_area, 'AL', 1, 'Refeitório') returning id into v_al;
  insert into public.cliente_pontos (cliente_id, area_id, servico_codigo, numero, local) values (v_cliente, v_area, 'PA', 1, 'Expedição') returning id into v_pa;

  -- (data, status do PI-01, moscas na AL-01, código): a última é a OS do relatório.
  for r in select * from (values
      ('2024-12-10'::date, 1, 9, 'OS-RLS-RH-2024'),
      ('2025-11-12'::date, 1, 4, 'OS-RLS-RH-2025'),
      ('2026-07-21'::date, 2, 1, 'OS-RLS-RH-JUL'),
      ('2026-08-20'::date, 3, 2, 'OS-RLS-RH-AGO1'),
      ('2026-08-30'::date, 1, 3, 'OS-RLS-RH-AGO2'),
      ('2026-09-05'::date, 1, 7, 'OS-RLS-RH-SET')) as x(data, status, moscas, codigo)
  loop
    insert into public.ordens_servico (cliente_id, status, codigo, termino_execucao)
    values (v_cliente, 'executada', r.codigo, (r.data + time '12:00') at time zone 'America/Sao_Paulo') returning id into v_os;
    insert into public.os_planos_controle (os_id, tipo_controle, frequencia, servico_codigo)
    values (v_os, '[RLS] Roedores', 'Semanal', 'PI') returning id into v_plano;
    insert into public.os_plano_pontos (plano_id, numero, cliente_ponto_id, fase, status_codigo) values (v_plano, 1, v_pi, 1, r.status);
    insert into public.os_planos_controle (os_id, tipo_controle, frequencia, servico_codigo)
    values (v_os, '[RLS] Luminosa', 'Quinzenal', 'AL') returning id into v_plano;
    insert into public.os_plano_pontos (plano_id, numero, cliente_ponto_id, contagens) values (v_plano, 1, v_al, jsonb_build_object('Mosca Doméstica', r.moscas));
    insert into public.os_planos_controle (os_id, tipo_controle, frequencia, servico_codigo)
    values (v_os, '[RLS] Placas', 'Semanal', 'PA') returning id into v_plano;
    insert into public.os_plano_pontos (plano_id, numero, cliente_ponto_id, status_codigo) values (v_plano, 1, v_pa, 3);
    if r.codigo = 'OS-RLS-RH-AGO2' then
      insert into t values ('os', v_os);
      insert into public.os_capturas_nao_alvo (os_id, cliente_ponto_id, especie) values (v_os, v_pa, 'Grilo');
    end if;
  end loop;

  -- Outro cliente, mesmo mês: não entra.
  insert into public.ordens_servico (cliente_id, status, codigo, termino_execucao)
  values (v_outro, 'executada', 'OS-RLS-RH-OUTRO', '2026-08-25T15:00:00Z');

  insert into t values ('gestor', v_gestor), ('area', v_area);
end $$;

create or replace function pg_temp.esperar(_caso text, _obtido boolean, _esperado boolean)
returns void language plpgsql as $$
begin
  if _obtido is distinct from _esperado then
    raise exception 'FALHOU: % — esperado %, obteve %', _caso, _esperado, coalesce(_obtido::text, 'null');
  end if;
  raise notice 'ok: %', _caso;
end $$;

create or replace function pg_temp.dados() returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select v from t where k = 'gestor'), 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.relatorio_dados((select v from t where k = 'os'));
  reset role;
  return r;
end $$;

do $$
declare
  h jsonb := pg_temp.dados() -> 'historico';
  n int;
begin
  perform pg_temp.esperar('ano e mês de referência são os da execução',
    (h ->> 'ano')::int = 2026 and (h ->> 'mes_atual')::int = 8, true);

  perform pg_temp.esperar('PI: agosto tem 2 visitas; julho, 1; novembro do ano anterior, 1',
    (select jsonb_agg(jsonb_build_array(x ->> 'ano', x ->> 'mes', x ->> 'n') order by x ->> 'ano', (x ->> 'mes')::int)
       from jsonb_array_elements(h -> 'visitas') x where x ->> 'servico' = 'PI')
    = '[["2025","11","1"],["2026","7","1"],["2026","8","2"]]'::jsonb, true);

  perform pg_temp.esperar('dois anos atrás e depois da execução ficam fora',
    not exists (select 1 from jsonb_array_elements(h -> 'visitas') x
                 where (x ->> 'ano')::int = 2024 or ((x ->> 'ano')::int = 2026 and (x ->> 'mes')::int = 9)), true);

  select (x ->> 'n')::int into n from jsonb_array_elements(h -> 'status') x
   where x ->> 'servico' = 'PI' and (x ->> 'mes')::int = 8 and (x ->> 'codigo')::int = 1 and x ->> 'area_id' = (select v from t where k = 'area')::text;
  perform pg_temp.esperar('status por código e mês, na área e fase do bloco', n = 1, true);
  perform pg_temp.esperar('a fase vem nos status da Desratização',
    (select bool_and((x ->> 'fase')::int = 1) from jsonb_array_elements(h -> 'status') x where x ->> 'servico' = 'PI'), true);

  perform pg_temp.esperar('AL: moscas somadas por mês (agosto = 2 + 3)',
    (select (x ->> 'total')::numeric from jsonb_array_elements(h -> 'contagens') x
      where x ->> 'servico' = 'AL' and (x ->> 'mes')::int = 8 and (x ->> 'ano')::int = 2026) = 5, true);

  perform pg_temp.esperar('capturas não-alvo por mês e espécie',
    (select (x ->> 'n')::int from jsonb_array_elements(h -> 'capturas') x where x ->> 'especie' = 'Grilo' and (x ->> 'mes')::int = 8) = 1, true);
end $$;

rollback;
