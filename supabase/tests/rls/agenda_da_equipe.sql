-- Agenda da equipe: o gestor vê a agenda dos técnicos dele, e só ela.
--
-- Prova `20261007110000_agenda_da_equipe.sql`. Gestor é quem é gestor imediato
-- de algum colaborador ativo. Ele lê as OS da equipe pela função — nunca pela
-- tabela, que continua fechada para ele —, e técnico sem equipe é recusado.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_gestor uuid := gen_random_uuid();
  v_tec uuid := gen_random_uuid();
  v_fora uuid := gen_random_uuid();
  f_gestor uuid; f_tec uuid; f_fora uuid; f_inativo uuid;
  v_cliente uuid;
  v_os_tec uuid; v_os_gestor uuid; v_os_fora uuid; v_os_cancelada uuid; v_os_inativo uuid; v_os_mes_que_vem uuid;
  v_crono uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_gestor, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-equipe-gestor@teste.local', '', now(), '{"provider":"email"}', '{"role":"operador"}', now(), now()),
    (v_tec, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-equipe-tec@teste.local', '', now(), '{"provider":"email"}', '{"role":"operador"}', now(), now()),
    (v_fora, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-equipe-fora@teste.local', '', now(), '{"provider":"email"}', '{"role":"operador"}', now(), now());

  insert into public.funcionarios (nome_completo, cpf, cargo, setor, profile_id)
  values ('[RLS] Gestor de campo', '00000000071', 'Operador', 'Operacional', v_gestor) returning id into f_gestor;
  insert into public.funcionarios (nome_completo, cpf, cargo, setor, profile_id, gestor_id)
  values ('[RLS] Técnico da equipe', '00000000072', 'Operador', 'Operacional', v_tec, f_gestor) returning id into f_tec;
  insert into public.funcionarios (nome_completo, cpf, cargo, setor, profile_id)
  values ('[RLS] Técnico de outra equipe', '00000000073', 'Operador', 'Operacional', v_fora) returning id into f_fora;
  insert into public.funcionarios (nome_completo, cpf, cargo, setor, gestor_id, ativo)
  values ('[RLS] Técnico desligado', '00000000074', 'Operador', 'Operacional', f_gestor, false) returning id into f_inativo;

  insert into public.clientes (nome, cnpj, logradouro, numero, cidade, uf)
  values ('[RLS] Cliente equipe', '00000000001930', 'Rua A', '10', 'Campinas', 'SP') returning id into v_cliente;

  insert into public.ordens_servico (cliente_id, status, data_programada, hora_prevista, tipos_servico)
  values (v_cliente, 'confirmada', '2026-08-04', '08:30', '{Desratização}') returning id into v_os_tec;
  insert into public.ordens_servico (cliente_id, status, data_programada) values (v_cliente, 'confirmada', '2026-08-05')
  returning id into v_os_gestor;
  insert into public.ordens_servico (cliente_id, status, data_programada) values (v_cliente, 'confirmada', '2026-08-04')
  returning id into v_os_fora;
  insert into public.ordens_servico (cliente_id, status, data_programada) values (v_cliente, 'cancelada', '2026-08-04')
  returning id into v_os_cancelada;
  insert into public.ordens_servico (cliente_id, status, data_programada) values (v_cliente, 'confirmada', '2026-08-06')
  returning id into v_os_inativo;
  insert into public.ordens_servico (cliente_id, status, data_programada) values (v_cliente, 'confirmada', '2026-09-20')
  returning id into v_os_mes_que_vem;

  insert into public.os_funcionarios (os_id, funcionario_id) values
    (v_os_tec, f_tec), (v_os_tec, f_gestor), (v_os_gestor, f_gestor), (v_os_fora, f_fora),
    (v_os_cancelada, f_tec), (v_os_inativo, f_inativo), (v_os_mes_que_vem, f_tec);

  -- Cronograma antigo, de antes das visitas virarem OS: entra na agenda pela data.
  insert into public.os_cronograma (os_id, data_prevista, status, ordem) values (v_os_mes_que_vem, '2026-08-07', 'previsto', 1)
  returning id into v_crono;
  -- Visita antiga já feita: aparece como concluída, mesmo com a OS de origem aberta.
  insert into public.os_cronograma (os_id, data_prevista, status, ordem) values (v_os_mes_que_vem, '2026-08-08', 'concluida', 2);

  insert into t values ('gestor', v_gestor), ('tec', v_tec), ('fora', v_fora),
    ('f_gestor', f_gestor), ('f_tec', f_tec), ('f_inativo', f_inativo),
    ('os_tec', v_os_tec), ('os_gestor', v_os_gestor), ('os_fora', v_os_fora),
    ('os_cancelada', v_os_cancelada), ('os_inativo', v_os_inativo), ('os_mes_que_vem', v_os_mes_que_vem),
    ('crono', v_crono);
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

-- O SQLSTATE do erro, ou null se rodou sem erro.
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

do $$
declare
  semana constant text := 'select count(*) from public.agenda_da_equipe(''2026-08-03'', ''2026-08-09'')';
begin
  perform pg_temp.esperar('o gestor tem equipe: ele e o técnico ativo (o desligado fica fora)',
    pg_temp.conta('gestor', 'select count(*) from public.minha_equipe()') = 2, true);
  perform pg_temp.esperar('na equipe, o gestor vem marcado como "eu"',
    pg_temp.conta('gestor', format('select count(*) from public.minha_equipe() where sou_eu and funcionario_id = %L',
      (select v from t where k = 'f_gestor'))) = 1, true);
  perform pg_temp.esperar('técnico sem equipe tem só a si mesmo',
    pg_temp.conta('tec', 'select count(*) from public.minha_equipe()') = 1, true);

  perform pg_temp.esperar('o gestor vê, na semana, a OS do técnico, a dele e as duas datas de cronograma antigo',
    pg_temp.conta('gestor', semana) = 4, true);
  perform pg_temp.esperar('data de cronograma antigo já feita vem como concluída',
    pg_temp.conta('gestor', 'select count(*) from public.agenda_da_equipe(''2026-08-03'', ''2026-08-09'') where data = ''2026-08-08'' and status = ''concluida''') = 1, true);
  perform pg_temp.esperar('OS com o gestor e o técnico aparece uma vez, com os dois',
    pg_temp.conta('gestor', format('select count(*) from public.agenda_da_equipe(''2026-08-03'', ''2026-08-09'') where os_id = %L and cardinality(funcionarios) = 2',
      (select v from t where k = 'os_tec'))) = 1, true);
  perform pg_temp.esperar('o endereço vem do cadastro do cliente quando a OS não tem um',
    pg_temp.conta('gestor', format('select count(*) from public.agenda_da_equipe(''2026-08-03'', ''2026-08-09'') where os_id = %L and endereco = %L',
      (select v from t where k = 'os_tec'), 'Rua A, 10 - Campinas/SP')) = 1, true);
  perform pg_temp.esperar('a data de cronograma antigo vem com o id do cronograma',
    pg_temp.conta('gestor', format('select count(*) from public.agenda_da_equipe(''2026-08-03'', ''2026-08-09'') where cronograma_id = %L and data = ''2026-08-07''',
      (select v from t where k = 'crono'))) = 1, true);
  perform pg_temp.esperar('o gestor NÃO vê OS de técnico de outra equipe',
    pg_temp.conta('gestor', format('select count(*) from public.agenda_da_equipe(''2026-08-03'', ''2026-08-09'') where os_id = %L',
      (select v from t where k = 'os_fora'))) = 0, true);
  perform pg_temp.esperar('OS cancelada não entra na agenda',
    pg_temp.conta('gestor', format('select count(*) from public.agenda_da_equipe(''2026-08-03'', ''2026-08-09'') where os_id = %L',
      (select v from t where k = 'os_cancelada'))) = 0, true);
  perform pg_temp.esperar('OS de técnico desligado não entra',
    pg_temp.conta('gestor', format('select count(*) from public.agenda_da_equipe(''2026-08-03'', ''2026-08-09'') where os_id = %L',
      (select v from t where k = 'os_inativo'))) = 0, true);

  perform pg_temp.esperar('a função NÃO abre a tabela: o gestor continua sem ler a OS do técnico',
    pg_temp.conta('gestor', format('select count(*) from public.ordens_servico where id = %L',
      (select v from t where k = 'os_mes_que_vem'))) = 0, true);

  perform pg_temp.esperar('técnico sem equipe é recusado',
    pg_temp.erro('tec', semana) = '42501', true);
  perform pg_temp.esperar('técnico de outra equipe é recusado',
    pg_temp.erro('fora', semana) = '42501', true);
  perform pg_temp.esperar('período acima de 62 dias é recusado',
    pg_temp.erro('gestor', 'select count(*) from public.agenda_da_equipe(''2026-01-01'', ''2026-08-09'')') = '22023', true);
  perform pg_temp.esperar('período invertido é recusado',
    pg_temp.erro('gestor', 'select count(*) from public.agenda_da_equipe(''2026-08-09'', ''2026-08-03'')') = '22023', true);
end $$;

-- Sessão sem login não chama nenhuma das duas.
do $$
declare ok boolean;
begin
  ok := not has_function_privilege('anon', 'public.agenda_da_equipe(date, date)', 'execute')
    and not has_function_privilege('anon', 'public.minha_equipe()', 'execute');
  perform pg_temp.esperar('anon não executa as funções da equipe', ok, true);
end $$;

rollback;
