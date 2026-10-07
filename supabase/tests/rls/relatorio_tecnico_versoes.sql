-- Relatório técnico com versões.
--
-- Prova `20261007180000_relatorio_tecnico_versoes.sql`:
--   - a v1 nasce da execução da OS, do técnico que executou, uma vez só;
--   - salvar gera a versão seguinte, com as regras do protótipo;
--   - versão salva não muda nem some;
--   - lê quem tem o módulo Relatórios; edita quem tem "editar" nele (Gestor);
--     Almoxarifado só lê; perfil Operacional, técnico e cliente não leem.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_gestor uuid := gen_random_uuid();
  v_almox  uuid := gen_random_uuid();
  v_oper   uuid := gen_random_uuid();
  v_tec    uuid := gen_random_uuid();
  v_cli    uuid := gen_random_uuid();
  v_cliente uuid; v_func uuid; v_os uuid; v_os_aberta uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_gestor, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-rel-gestor@teste.local', '', now(), '{"provider":"email"}', '{"role":"operacional"}', now(), now()),
    (v_almox, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-rel-almox@teste.local', '', now(), '{"provider":"email"}', '{"role":"operacional"}', now(), now()),
    (v_oper, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-rel-oper@teste.local', '', now(), '{"provider":"email"}', '{"role":"operacional"}', now(), now()),
    (v_tec, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-rel-tec@teste.local', '', now(), '{"provider":"email"}', '{"role":"operador"}', now(), now()),
    (v_cli, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-rel-cli@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now());

  update public.profiles set role = 'operacional', perfil_acesso_id = (select id from public.perfis_acesso where nome = 'Gestor') where id = v_gestor;
  update public.profiles set role = 'operacional', perfil_acesso_id = (select id from public.perfis_acesso where nome = 'Almoxarifado') where id = v_almox;
  update public.profiles set role = 'operacional', perfil_acesso_id = (select id from public.perfis_acesso where nome = 'Operacional') where id = v_oper;

  insert into public.clientes (nome, cnpj) values ('[RLS] Cliente relatório', '00000000002291') returning id into v_cliente;
  insert into public.cliente_portal_usuarios (cliente_id, nome, email, status)
  values (v_cliente, '[RLS] Portal relatório', 'rls-rel-cli@teste.local', 'ativo');

  insert into public.funcionarios (nome_completo, cpf, cargo, setor, profile_id)
  values ('[RLS] Técnico relatório', '00000000081', 'Operador', 'Operacional', v_tec) returning id into v_func;

  insert into public.ordens_servico (cliente_id, status, tecnico_executor_id) values (v_cliente, 'em_andamento', v_func) returning id into v_os;
  insert into public.os_funcionarios (os_id, funcionario_id) values (v_os, v_func);
  insert into public.ordens_servico (cliente_id, status) values (v_cliente, 'em_aberto') returning id into v_os_aberta;

  -- Como o envio do App deixa a OS.
  update public.ordens_servico set status = 'executada' where id = v_os;

  insert into t values ('gestor', v_gestor), ('almox', v_almox), ('oper', v_oper), ('tec', v_tec), ('cli', v_cli),
    ('os', v_os), ('os_aberta', v_os_aberta);
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

-- SQLSTATE do erro, ou null se rodou sem erro.
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

-- Mesmo, sem trocar de papel: como a chave de serviço ou o dono do banco.
create or replace function pg_temp.erro_direto(_sql text) returns text language plpgsql as $$
begin
  execute _sql;
  return null;
exception when others then
  return sqlstate;
end $$;

create or replace function pg_temp.salvar(_quem text, _conteudo jsonb, _base int) returns text language plpgsql as $$
begin
  return pg_temp.erro(_quem, format('select public.salvar_versao_relatorio(%L, %L::jsonb, %L, %s)',
    (select v from t where k = 'os'), _conteudo, 'Combinado com o gestor da unidade.', _base));
end $$;

-- A v1 nasce da execução.
do $$
begin
  perform pg_temp.esperar('a OS executada ganha relatório e v1',
    exists (select 1 from public.os_relatorio_versoes v
             where v.os_id = (select v from t where k = 'os') and v.numero = 1
               and v.motivo = 'Criado a partir da execução da OS'
               and v.created_by = (select v from t where k = 'tec')), true);
  perform pg_temp.esperar('OS em aberto não tem relatório',
    exists (select 1 from public.os_relatorios_tecnicos where os_id = (select v from t where k = 'os_aberta')), false);

  update public.ordens_servico set status = 'concluida' where id = (select v from t where k = 'os');
  perform pg_temp.esperar('concluir depois de executar não cria outro relatório nem outra v1',
    (select count(*) from public.os_relatorio_versoes where os_id = (select v from t where k = 'os')) = 1, true);
end $$;

-- Ninguém de fora chama a função.
do $$
begin
  perform pg_temp.esperar('anon não executa salvar_versao_relatorio',
    has_function_privilege('anon', 'public.salvar_versao_relatorio(uuid, jsonb, text, integer)', 'execute'), false);
end $$;

-- Quem lê.
do $$
declare
  q constant text := format('select count(*) from public.os_relatorio_versoes where os_id = %L', (select v from t where k = 'os'));
begin
  perform pg_temp.esperar('o Gestor lê as versões', pg_temp.conta('gestor', q) = 1, true);
  perform pg_temp.esperar('o Almoxarifado lê as versões', pg_temp.conta('almox', q) = 1, true);
  perform pg_temp.esperar('o perfil Operacional NÃO lê', pg_temp.conta('oper', q) = 0, true);
  perform pg_temp.esperar('o técnico NÃO lê', pg_temp.conta('tec', q) = 0, true);
  perform pg_temp.esperar('o cliente do Portal NÃO lê', pg_temp.conta('cli', q) = 0, true);
end $$;

-- Salvar = nova versão, com as regras do protótipo.
do $$
declare
  ok constant jsonb := '{"observacoes": "Sem intercorrências.", "parecer": "Ambiente sob controle.", "blocos": {"fabrica-PI-f1": "Consumo na doca."}, "visibilidade": {"fabrica-captura": true}, "frequencias": {"fabrica-PI-f1": "quinzenal"}}';
begin
  perform pg_temp.esperar('o Almoxarifado NÃO salva', pg_temp.salvar('almox', ok, 1) = '42501', true);
  perform pg_temp.esperar('sem observações técnicas é recusado',
    pg_temp.salvar('gestor', '{"parecer": "x"}', 1) = '23514', true);
  perform pg_temp.esperar('sem parecer técnico é recusado',
    pg_temp.salvar('gestor', '{"observacoes": "x"}', 1) = '23514', true);
  perform pg_temp.esperar('frequência fora de semanal/quinzenal/mensal é recusada',
    pg_temp.salvar('gestor', '{"observacoes": "x", "parecer": "y", "frequencias": {"b": "diaria"}}', 1) = '22023', true);
  perform pg_temp.esperar('campo desconhecido é recusado',
    pg_temp.salvar('gestor', '{"observacoes": "x", "parecer": "y", "cpf": "1"}', 1) = '22023', true);

  perform pg_temp.esperar('o Gestor salva e gera a v2', pg_temp.salvar('gestor', ok, 1) is null, true);
  perform pg_temp.esperar('a v2 guarda o conteúdo, o autor e as notas internas à parte',
    exists (select 1 from public.os_relatorio_versoes v
             where v.os_id = (select v from t where k = 'os') and v.numero = 2
               and v.conteudo -> 'frequencias' ->> 'fabrica-PI-f1' = 'quinzenal'
               and not (v.conteudo ? 'notas_internas')
               and v.notas_internas = 'Combinado com o gestor da unidade.'
               and v.motivo = 'Edição de campos complementares'
               and v.created_by = (select v from t where k = 'gestor')), true);
  perform pg_temp.esperar('o relatório aponta para a v2',
    (select versao_atual from public.os_relatorios_tecnicos where os_id = (select v from t where k = 'os')) = 2, true);

  perform pg_temp.esperar('salvar sobre a v1 depois da v2 é recusado (outra pessoa salvou no meio)',
    pg_temp.salvar('gestor', ok, 1) = '40001', true);
end $$;

-- Versão salva não muda nem some.
do $$
begin
  perform pg_temp.esperar('pela API, ninguém altera versão (sem policy)',
    pg_temp.conta('gestor', format('with u as (update public.os_relatorio_versoes set motivo = %L where os_id = %L returning 1) select count(*) from u',
      'x', (select v from t where k = 'os'))) = 0, true);
  perform pg_temp.esperar('nem com a chave de serviço: o gatilho barra a alteração',
    pg_temp.erro_direto(format('update public.os_relatorio_versoes set motivo = %L where os_id = %L', 'x', (select v from t where k = 'os'))) = '42501', true);
  perform pg_temp.esperar('nem a exclusão',
    pg_temp.erro_direto(format('delete from public.os_relatorio_versoes where os_id = %L', (select v from t where k = 'os'))) = '42501', true);
end $$;

rollback;
