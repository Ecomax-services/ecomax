-- Visitas viram OS: cada data do cronograma ganha a sua OS na emissão.
--
-- Prova `20261005180000_visitas_viram_os.sql`. Três riscos guiam os casos:
--   - duplicar: dois cliques em Emitir não podem gerar doze visitas;
--   - herdar demais: a visita não pode nascer com a execução da origem;
--   - multiplicar efeitos: seis visitas não podem gerar seis garantias.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_admin uuid := gen_random_uuid();
  v_op    uuid := gen_random_uuid();
  v_cli   uuid := gen_random_uuid();
  v_func  uuid := gen_random_uuid();
  v_cliente uuid; v_os uuid; v_rasc uuid; v_produto uuid; v_plano uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-visita-admin@teste.local', '', now(), '{"provider":"email"}', '{"role":"admin"}', now(), now()),
    (v_op, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-visita-op@teste.local', '', now(), '{"provider":"email"}', '{"role":"operador"}', now(), now()),
    (v_cli, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-visita-cli@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now());

  update public.profiles
     set perfil_acesso_id = (select id from public.perfis_acesso where nome = 'Administrador'), role = 'admin'
   where id = v_admin;

  insert into public.clientes (nome, cnpj) values ('[RLS] Visitas', '00000000001082') returning id into v_cliente;
  insert into public.cliente_portal_usuarios (cliente_id, nome, email, status)
  values (v_cliente, '[RLS] Portal visitas', 'rls-visita-cli@teste.local', 'ativo');

  -- Garantia de 3 meses para o serviço, para o trigger de garantia ter o que
  -- gerar. Avulsa (sem orçamento) é justamente o caso que multiplicaria.
  update public.catalogo_itens set garantia_meses = 3 where catalogo = 'tipos_servico' and nome = 'Desratização';

  insert into public.ordens_servico (cliente_id, status, rascunho, tipos_servico, data_programada,
                                     recorrencia, hora_prevista, endereco_execucao, check_in_at, assinatura_url)
  values (v_cliente, 'em_aberto', false, array['Desratização'], current_date + 1,
          'mensal', '08:00', 'Unidade Central', now(), 'assinatura-da-origem.png')
  returning id into v_os;

  insert into public.funcionarios (id, nome_completo, cpf, cargo, setor, profile_id)
  values (v_func, '[RLS] Técnico visitas', '00000000031', 'Operador', 'Operacional', v_op);
  insert into public.os_funcionarios (os_id, funcionario_id) values (v_os, v_func);

  insert into public.produtos (codigo, nome, categoria, unidade) values ('[RLS]-VS1', '[RLS] Raticida visitas', 'Raticida', 'KG')
  returning id into v_produto;
  insert into public.os_produtos (os_id, produto_id, qtd_recomendada, unidade, lote, qtd_utilizada)
  values (v_os, v_produto, 2, 'KG', 'L-ORIGEM', 1.5);

  insert into public.os_planos_controle (os_id, tipo_controle, frequencia, pontos_previstos)
  values (v_os, 'Globo de Moscas', 'Mensal', 2) returning id into v_plano;
  insert into public.os_plano_pontos (plano_id, numero, identificacao, situacao) values
    (v_plano, 1, 'Recepção', 'conforme'), (v_plano, 2, 'Copa', 'nao_conforme');

  insert into public.os_cronograma (os_id, data_prevista, ordem, status) values
    (v_os, current_date + 31, 0, 'previsto'),
    (v_os, current_date + 61, 1, 'previsto'),
    (v_os, current_date + 91, 2, 'cancelada');

  insert into public.ordens_servico (cliente_id, status, rascunho, recorrencia, data_programada)
  values (v_cliente, 'em_aberto', true, 'mensal', current_date + 1) returning id into v_rasc;
  insert into public.os_cronograma (os_id, data_prevista, ordem) values (v_rasc, current_date + 31, 0);

  insert into t values ('admin', v_admin), ('op', v_op), ('cli', v_cli), ('os', v_os), ('rasc', v_rasc),
                       ('produto', v_produto), ('cliente', v_cliente);
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

create or replace function pg_temp.visita(_n int) returns uuid language sql as $$
  select o.id from public.ordens_servico o
   where o.recorrencia_origem_id = (select v from t where k = 'os')
   order by o.data_programada offset _n - 1 limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Geração — como admin, com a RLS valendo
-- ---------------------------------------------------------------------------
do $$
declare n int; bloqueou boolean;
begin
  perform pg_temp.como((select v from t where k = 'admin'));
  set local role authenticated;
  n := public.gerar_visitas_da_os((select v from t where k = 'os'));
  reset role;
  perform pg_temp.esperar('uma OS por data prevista (a cancelada não conta)', n = 2, true);

  perform pg_temp.como((select v from t where k = 'admin'));
  set local role authenticated;
  n := public.gerar_visitas_da_os((select v from t where k = 'os'));
  reset role;
  perform pg_temp.esperar('emitir de novo não duplica visitas', n = 0, true);

  select count(*) into n from public.os_cronograma
   where os_id = (select v from t where k = 'os') and visita_os_id is not null;
  perform pg_temp.esperar('cada data aponta para a sua OS', n = 2, true);

  perform pg_temp.esperar('a visita nasce emitida, na data do cronograma',
    exists (select 1 from public.ordens_servico where id = pg_temp.visita(1)
             and status = 'emitida' and not rascunho and data_programada = current_date + 31), true);

  perform pg_temp.esperar('a visita herda horário, endereço e serviços',
    exists (select 1 from public.ordens_servico where id = pg_temp.visita(1)
             and hora_prevista = '08:00' and endereco_execucao = 'Unidade Central'
             and tipos_servico = array['Desratização']), true);

  perform pg_temp.esperar('a visita NÃO herda execução nem assinatura',
    exists (select 1 from public.ordens_servico where id = pg_temp.visita(1)
             and check_in_at is null and assinatura_url is null), true);

  perform pg_temp.esperar('a visita herda o técnico',
    exists (select 1 from public.os_funcionarios where os_id = pg_temp.visita(1)), true);

  perform pg_temp.esperar('o produto vem previsto, sem lote e sem consumo',
    exists (select 1 from public.os_produtos where os_id = pg_temp.visita(1)
             and qtd_recomendada = 2 and lote is null and qtd_utilizada is null), true);

  select count(*) into n from public.os_plano_pontos pt
    join public.os_planos_controle p on p.id = pt.plano_id
   where p.os_id = pg_temp.visita(1) and pt.situacao = 'pendente' and pt.identificacao in ('Recepção', 'Copa');
  perform pg_temp.esperar('os pontos manuais vêm em branco', n = 2, true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    perform public.gerar_visitas_da_os((select v from t where k = 'rasc'));
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('rascunho NÃO gera visitas', bloqueou, true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    perform public.gerar_visitas_da_os(pg_temp.visita(1));
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('visita NÃO gera visitas', bloqueou, true);

  -- O técnico não emite OS: a RLS barra a criação.
  bloqueou := false;
  update public.os_cronograma set visita_os_id = null, status = 'previsto'
   where os_id = (select v from t where k = 'os') and status = 'cancelada';
  perform pg_temp.como((select v from t where k = 'op'));
  begin
    set local role authenticated;
    perform public.gerar_visitas_da_os((select v from t where k = 'os'));
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('técnico NÃO gera visitas', bloqueou, true);
  update public.os_cronograma set status = 'cancelada'
   where os_id = (select v from t where k = 'os') and data_prevista = current_date + 91;
end $$;

-- ---------------------------------------------------------------------------
-- A visita reflete no cronograma da origem
-- ---------------------------------------------------------------------------
do $$
declare v_status text; v_data date;
begin
  -- Quem conclui no campo é o técnico, que não escreve no cronograma.
  perform pg_temp.como((select v from t where k = 'op'));
  set local role authenticated;
  update public.ordens_servico set status = 'executada' where id = pg_temp.visita(1);
  reset role;
  select status into v_status from public.os_cronograma where visita_os_id = pg_temp.visita(1);
  perform pg_temp.esperar('visita executada pelo técnico marca a data como concluída', v_status = 'concluida', true);

  update public.ordens_servico set data_programada = current_date + 65 where id = pg_temp.visita(2);
  select data_prevista into v_data from public.os_cronograma where visita_os_id = pg_temp.visita(2);
  perform pg_temp.esperar('remarcar a visita move a data no cronograma', v_data = current_date + 65, true);

  update public.ordens_servico set status = 'cancelada' where id = pg_temp.visita(2);
  select status into v_status from public.os_cronograma where visita_os_id = pg_temp.visita(2);
  perform pg_temp.esperar('cancelar a visita cancela a data', v_status = 'cancelada', true);
end $$;

-- ---------------------------------------------------------------------------
-- Portal e garantia
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  perform pg_temp.como((select v from t where k = 'cli'));
  set local role authenticated;
  select count(*) into n from public.ordens_servico where recorrencia_origem_id = (select v from t where k = 'os');
  reset role;
  perform pg_temp.esperar('o cliente vê as visitas como OS dele', n = 2, true);

  update public.ordens_servico set status = 'concluida' where id = pg_temp.visita(1);
  select count(*) into n from public.comercial_garantias where os_id = pg_temp.visita(1);
  perform pg_temp.esperar('visita concluída NÃO gera garantia própria', n = 0, true);

  update public.ordens_servico set status = 'concluida' where id = (select v from t where k = 'os');
  select count(*) into n from public.comercial_garantias where os_id = (select v from t where k = 'os');
  perform pg_temp.esperar('a OS de origem continua gerando a garantia', n = 1, true);
end $$;

rollback;
