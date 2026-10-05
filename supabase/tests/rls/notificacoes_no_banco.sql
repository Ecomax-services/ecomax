-- Notificações: uma linha por destinatário, e só o banco cria.
--
-- Prova `20261006110000_notificacoes_no_banco.sql`. Os dois defeitos de
-- segurança do modelo antigo têm caso próprio:
--   - qualquer sessão criava notificação para qualquer pessoa;
--   - quem apagava a notificação de um papel ou cliente apagava para todos.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_admin uuid := gen_random_uuid();
  v_com   uuid := gen_random_uuid();
  v_op    uuid := gen_random_uuid();
  v_a1    uuid := gen_random_uuid();
  v_a2    uuid := gen_random_uuid();
  v_ainat uuid := gen_random_uuid();
  v_b     uuid := gen_random_uuid();
  v_func  uuid := gen_random_uuid();
  v_cliente_a uuid; v_cliente_b uuid; v_os uuid; v_rel uuid; v_rec uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email, '', now(),
         '{"provider":"email"}', json_build_object('role', papel)::jsonb, now(), now()
    from (values
      (v_admin, 'rls-notif-admin@teste.local', 'admin'),
      (v_com,   'rls-notif-com@teste.local',   'comercial'),
      (v_op,    'rls-notif-op@teste.local',    'operador'),
      (v_a1,    'rls-notif-a1@teste.local',    'cliente'),
      (v_a2,    'rls-notif-a2@teste.local',    'cliente'),
      (v_ainat, 'rls-notif-ainat@teste.local', 'cliente'),
      (v_b,     'rls-notif-b@teste.local',     'cliente')
    ) as x (id, email, papel);

  update public.profiles
     set perfil_acesso_id = (select id from public.perfis_acesso where nome = 'Administrador'), role = 'admin'
   where id = v_admin;
  update public.profiles set role = 'comercial' where id = v_com;

  insert into public.clientes (nome, cnpj) values ('[RLS] Notif A', '00000000001678') returning id into v_cliente_a;
  insert into public.clientes (nome, cnpj) values ('[RLS] Notif B', '00000000001759') returning id into v_cliente_b;
  insert into public.cliente_portal_usuarios (cliente_id, nome, email, status) values
    (v_cliente_a, '[RLS] A1', 'rls-notif-a1@teste.local', 'ativo'),
    (v_cliente_a, '[RLS] A2', 'RLS-Notif-A2@teste.local', 'ativo'),
    (v_cliente_a, '[RLS] A inativo', 'rls-notif-ainat@teste.local', 'inativo'),
    (v_cliente_b, '[RLS] B', 'rls-notif-b@teste.local', 'ativo');

  insert into public.funcionarios (id, nome_completo, cpf, cargo, setor, profile_id)
  values (v_func, '[RLS] Técnico notif', '00000000051', 'Operador', 'Operacional', v_op);

  insert into public.ordens_servico (cliente_id, status, data_programada, recorrencia)
  values (v_cliente_a, 'executada', current_date, 'mensal') returning id into v_os;
  insert into public.os_relatorios (os_id, titulo, publicado) values (v_os, '[RLS] Relatório', false)
  returning id into v_rel;

  -- OS recorrente para o resumo de visitas.
  insert into public.ordens_servico (cliente_id, status, data_programada, recorrencia)
  values (v_cliente_a, 'emitida', current_date + 1, 'mensal') returning id into v_rec;
  insert into public.os_cronograma (os_id, data_prevista, ordem) values
    (v_rec, current_date + 31, 0), (v_rec, current_date + 61, 1), (v_rec, current_date + 91, 2);

  insert into t values ('admin', v_admin), ('com', v_com), ('op', v_op), ('a1', v_a1), ('a2', v_a2),
    ('ainat', v_ainat), ('b', v_b), ('func', v_func), ('os', v_os), ('rel', v_rel), ('rec', v_rec),
    ('cliente_a', v_cliente_a);
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

create or replace function pg_temp.minhas(_k text) returns int language plpgsql as $$
declare n int;
begin
  perform pg_temp.como((select v from t where k = _k));
  set local role authenticated;
  select count(*) into n from public.notificacoes;
  reset role;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Ninguém cria notificação pela API
-- ---------------------------------------------------------------------------
do $$
declare bloqueou boolean;
begin
  -- Sem erro, de propósito (a migration explica): a linha simplesmente não existe.
  perform pg_temp.como((select v from t where k = 'b'));
  set local role authenticated;
  insert into public.notificacoes (para_profile_id, titulo, link, created_by)
  values ((select v from t where k = 'admin'), 'Sua senha expirou', 'https://golpe.example', auth.uid());
  reset role;
  perform pg_temp.esperar('cliente NÃO cria notificação para o admin', pg_temp.minhas('admin') = 0, true);

  -- O Backoffice antigo, criando a notificação dele pela API: descartada, e
  -- sem erro para a tela.
  perform pg_temp.como((select v from t where k = 'admin'));
  set local role authenticated;
  insert into public.notificacoes (para_profile_id, tipo, titulo, created_by)
  values ((select v from t where k = 'op'), 'os', 'Nova OS atribuída', auth.uid());
  reset role;
  perform pg_temp.esperar('a tela antiga NÃO cria linha pela API, e não quebra', pg_temp.minhas('op') = 0, true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    perform public.notificar_perfis(array[(select v from t where k = 'op')], 'info', 'Forjada', null, null, null);
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('nem o admin chama notificar_perfis direto', bloqueou, true);
end $$;

-- ---------------------------------------------------------------------------
-- Vínculo e desvínculo do técnico
-- ---------------------------------------------------------------------------
do $$
declare v_desc text;
begin
  insert into public.os_funcionarios (os_id, funcionario_id)
  values ((select v from t where k = 'os'), (select v from t where k = 'func'));
  perform pg_temp.esperar('vincular o técnico avisa o técnico', pg_temp.minhas('op') = 1, true);
  select descricao into v_desc from public.notificacoes where para_profile_id = (select v from t where k = 'op');
  perform pg_temp.esperar('o aviso diz qual OS', v_desc like 'Você foi vinculado à ordem de serviço OS-%', true);
  perform pg_temp.esperar('e não avisa mais ninguém', pg_temp.minhas('admin') = 0, true);

  delete from public.os_funcionarios where os_id = (select v from t where k = 'os');
  perform pg_temp.esperar('desvincular também avisa',
    exists (select 1 from public.notificacoes where para_profile_id = (select v from t where k = 'op')
             and titulo = 'Você saiu de uma OS' and os_id is null), true);
end $$;

-- ---------------------------------------------------------------------------
-- Relatório publicado: uma linha por usuário ativo do Portal
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  update public.os_relatorios set publicado = true, publicado_at = now() where id = (select v from t where k = 'rel');

  perform pg_temp.esperar('cada usuário ativo do cliente recebe a sua',
    pg_temp.minhas('a1') = 1 and pg_temp.minhas('a2') = 1, true);
  perform pg_temp.esperar('usuário desativado no Portal NÃO recebe', pg_temp.minhas('ainat') = 0, true);
  perform pg_temp.esperar('o outro cliente NÃO recebe', pg_temp.minhas('b') = 0, true);

  -- A1 lê e apaga a dele. A de A2 continua lá, não lida.
  perform pg_temp.como((select v from t where k = 'a1'));
  set local role authenticated;
  update public.notificacoes set lida = true;
  delete from public.notificacoes;
  reset role;
  perform pg_temp.esperar('apagar a minha NÃO apaga a do colega', pg_temp.minhas('a2') = 1, true);
  perform pg_temp.esperar('ler a minha NÃO marca a do colega',
    (select not lida from public.notificacoes where para_profile_id = (select v from t where k = 'a2')), true);

  -- Republicar não duplica.
  update public.os_relatorios set titulo = '[RLS] Relatório revisto' where id = (select v from t where k = 'rel');
  select count(*) into n from public.notificacoes where para_profile_id = (select v from t where k = 'a2');
  perform pg_temp.esperar('editar o relatório publicado NÃO avisa de novo', n = 1, true);
end $$;

-- ---------------------------------------------------------------------------
-- O destinatário só muda `lida`
-- ---------------------------------------------------------------------------
do $$
declare bloqueou boolean := false;
begin
  perform pg_temp.como((select v from t where k = 'a2'));
  begin
    set local role authenticated;
    update public.notificacoes set link = 'https://golpe.example';
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('o destinatário NÃO reescreve o link', bloqueou, true);
end $$;

-- ---------------------------------------------------------------------------
-- Garantia a renovar: cada pessoa do Comercial
-- ---------------------------------------------------------------------------
do $$
begin
  insert into public.comercial_garantias (os_id, cliente_id, data_execucao, data_validade, status)
  values ((select v from t where k = 'os'), (select v from t where k = 'cliente_a'), current_date - 300, current_date + 30, 'Em vigor');
  perform public.garantias_marcar_a_renovar();
  perform pg_temp.esperar('o Comercial recebe o aviso de garantia',
    exists (select 1 from public.notificacoes where para_profile_id = (select v from t where k = 'com')
             and tipo = 'expired' and para_role = 'comercial'), true);
end $$;

-- ---------------------------------------------------------------------------
-- Visitas recorrentes: um resumo, não um aviso por visita
-- ---------------------------------------------------------------------------
do $$
declare n int; v_desc text;
begin
  insert into public.os_funcionarios (os_id, funcionario_id)
  values ((select v from t where k = 'rec'), (select v from t where k = 'func'));
  delete from public.notificacoes where para_profile_id = (select v from t where k = 'op');

  perform pg_temp.como((select v from t where k = 'admin'));
  set local role authenticated;
  n := public.gerar_visitas_da_os((select v from t where k = 'rec'));
  reset role;
  perform pg_temp.esperar('três visitas geradas', n = 3, true);

  select count(*), max(descricao) into n, v_desc from public.notificacoes
   where para_profile_id = (select v from t where k = 'op');
  perform pg_temp.esperar('o técnico recebe UM aviso, não três', n = 1, true);
  perform pg_temp.esperar('o aviso conta as visitas', v_desc like '3 visitas da ordem de serviço OS-% foram agendadas para você.', true);

  -- O intermediário não forja aviso: fora da transação que criou visitas, não há o que avisar.
  perform pg_temp.como((select v from t where k = 'op'));
  begin
    set local role authenticated;
    perform public.notificar_visitas_agendadas((select v from t where k = 'rec'));
    n := -1;
  exception when others then n := 0;
  end;
  reset role;
  perform pg_temp.esperar('o técnico NÃO dispara o resumo', n = 0, true);
end $$;

rollback;
