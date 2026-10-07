-- registrar_execucao: o envio único da execução feita em campo.
--
-- Prova `20261006090000_registrar_execucao.sql`. Os casos que importam:
--   - reenvio com o mesmo identificador não grava nada de novo — é o que
--     acontece toda vez que a confirmação se perde no sinal ruim;
--   - técnico de outra OS não registra;
--   - envio recusado não deixa nada para trás: ou tudo, ou nada.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_op_a  uuid := gen_random_uuid();
  v_op_b  uuid := gen_random_uuid();
  v_cli_a uuid := gen_random_uuid();
  v_cli_b uuid := gen_random_uuid();
  v_func_a uuid := gen_random_uuid();
  v_func_b uuid := gen_random_uuid();
  v_cliente uuid; v_cliente_b uuid; v_area uuid; v_base uuid; v_produto uuid; v_lote uuid; v_lote_alheio uuid;
  v_os uuid; v_os_b uuid; v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_op_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-reg-op-a@teste.local', '', now(), '{"provider":"email"}', '{"role":"operador"}', now(), now()),
    (v_op_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-reg-op-b@teste.local', '', now(), '{"provider":"email"}', '{"role":"operador"}', now(), now()),
    (v_cli_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-reg-cli-a@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now()),
    (v_cli_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-reg-cli-b@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now());

  insert into public.clientes (nome, cnpj) values ('[RLS] Registro A', '00000000001406') returning id into v_cliente;
  insert into public.clientes (nome, cnpj) values ('[RLS] Registro B', '00000000001597') returning id into v_cliente_b;
  insert into public.cliente_portal_usuarios (cliente_id, nome, email, status) values
    (v_cliente, '[RLS] Portal reg A', 'rls-reg-cli-a@teste.local', 'ativo'),
    (v_cliente_b, '[RLS] Portal reg B', 'rls-reg-cli-b@teste.local', 'ativo');

  insert into public.cliente_areas (cliente_id, nome) values (v_cliente, 'Fábrica') returning id into v_area;
  insert into public.cliente_pontos (cliente_id, area_id, servico_codigo, numero, local) values
    (v_cliente, v_area, 'PI', 1, 'Doca 1'),
    (v_cliente, v_area, 'PI', 2, 'Doca 2');

  insert into public.bases (nome) values ('[RLS] Base registro') returning id into v_base;
  insert into public.produtos (codigo, nome, categoria, unidade, unidade_aplicacao, fator_aplicacao)
  values ('[RLS]-RG1', '[RLS] Raticida registro', 'Raticida', 'KG', 'g', 1000) returning id into v_produto;
  insert into public.estoque_lotes (produto_id, base_id, lote, validade, quantidade)
  values (v_produto, v_base, 'RG-01', v_hoje + 200, 3) returning id into v_lote;

  insert into public.ordens_servico (cliente_id, status, data_programada) values (v_cliente, 'confirmada', v_hoje)
  returning id into v_os;
  insert into public.ordens_servico (cliente_id, status, data_programada) values (v_cliente_b, 'confirmada', v_hoje)
  returning id into v_os_b;
  insert into public.os_planos_controle (os_id, tipo_controle, frequencia) values (v_os, 'Controle Roedores', 'Mensal');
  perform public.preparar_monitoramento_os(v_os);

  -- O técnico A trabalha na base onde está o lote: é dela a lista do App.
  insert into public.funcionarios (id, nome_completo, cpf, cargo, setor, profile_id, base_id) values
    (v_func_a, '[RLS] Técnico reg A', '00000000041', 'Operador', 'Operacional', v_op_a, v_base),
    (v_func_b, '[RLS] Técnico reg B', '00000000042', 'Operador', 'Operacional', v_op_b, v_base);
  insert into public.os_funcionarios (os_id, funcionario_id) values (v_os, v_func_a), (v_os_b, v_func_b);

  -- Os arquivos que o App sobe antes de chamar a função.
  insert into storage.objects (bucket_id, name) values
    ('operacional-docs', 'os/'||v_os||'/assinatura/1-cliente.png'),
    ('operacional-docs', 'os/'||v_os||'/assinatura/2-tecnico.png'),
    ('operacional-docs', 'os/'||v_os||'/foto/1-ponto.jpg');

  -- Um lote do mesmo produto em outra base: o técnico não pode usá-lo.
  insert into public.bases (nome) values ('[RLS] Outra base registro') returning id into v_base;
  insert into public.estoque_lotes (produto_id, base_id, lote, validade, quantidade)
  values (v_produto, v_base, 'RG-ALHEIO', v_hoje + 200, 3) returning id into v_lote_alheio;

  insert into t values ('op_a', v_op_a), ('op_b', v_op_b), ('cli_a', v_cli_a), ('cli_b', v_cli_b),
    ('os', v_os), ('os_b', v_os_b), ('produto', v_produto), ('lote', v_lote), ('func_a', v_func_a),
    ('lote_alheio', v_lote_alheio);
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

-- O envio completo, como o App monta. Cada caso altera um pedaço.
create or replace function pg_temp.envio(_uuid uuid) returns jsonb language sql as $$
  select jsonb_build_object(
    'execucao_uuid', _uuid,
    'inicio', now() - interval '1 hour',
    'termino', now(),
    'produtos', jsonb_build_array(jsonb_build_object(
      'produto_id', (select v from t where k = 'produto'), 'estoque_lote_id', (select v from t where k = 'lote'),
      'quantidade', 150, 'unidade', 'g')),
    'pontos', (
      select jsonb_agg(jsonb_build_object('ponto_id', pt.id, 'status_codigo', case pt.numero when 1 then 1 else 3 end,
                                          'observacao', 'Lido'))
        from public.os_plano_pontos pt join public.os_planos_controle p on p.id = pt.plano_id
       where p.os_id = (select v from t where k = 'os')),
    'fotos', jsonb_build_array(jsonb_build_object(
      'caminho', 'os/' || (select v from t where k = 'os') || '/foto/1-ponto.jpg', 'nome', 'Isca consumida')),
    'reposicao', jsonb_build_object('observacao', 'Consumo alto', 'itens', jsonb_build_array(
      jsonb_build_object('produto_id', (select v from t where k = 'produto'), 'quantidade', 1))),
    -- Só nome e assinatura: CPF e cargo saíram na aprovação da Release 4 (06/10).
    'assinante', jsonb_build_object('nome', 'Maria Souza',
      'assinatura', 'os/' || (select v from t where k = 'os') || '/assinatura/1-cliente.png'),
    'tecnico_assinatura', 'os/' || (select v from t where k = 'os') || '/assinatura/2-tecnico.png'
  );
$$;

create or replace function pg_temp.enviar(_quem text, _dados jsonb) returns text language plpgsql as $$
declare r jsonb;
begin
  perform pg_temp.como((select v from t where k = _quem));
  set local role authenticated;
  r := public.registrar_execucao((select v from t where k = 'os'), _dados);
  reset role;
  return r ->> 'status';
exception when others then
  reset role;
  return 'erro: ' || sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- Recusas — e nada fica para trás
-- ---------------------------------------------------------------------------
do $$
declare r text;
begin
  r := pg_temp.enviar('op_b', pg_temp.envio(gen_random_uuid()));
  perform pg_temp.esperar('técnico de outra OS NÃO registra', r like 'erro: Esta OS não está atribuída%', true);

  r := pg_temp.enviar('op_a', pg_temp.envio(gen_random_uuid()) - 'produtos');
  perform pg_temp.esperar('sem produto é recusado', r like 'erro: Registre pelo menos um produto%', true);

  r := pg_temp.enviar('op_a', jsonb_set(pg_temp.envio(gen_random_uuid()), '{pontos}',
                                        (pg_temp.envio(gen_random_uuid()) -> 'pontos') - 0));
  perform pg_temp.esperar('ponto sem avaliação é recusado', r like 'erro: Avalie todos os pontos%Faltam 1%', true);

  -- Este envio passou dos produtos antes de falhar nos pontos. Se a função não
  -- fosse atômica, o consumo teria ficado gravado.
  perform pg_temp.esperar('envio recusado não deixa consumo gravado',
    not exists (select 1 from public.os_produtos where os_id = (select v from t where k = 'os')), true);

  r := pg_temp.enviar('op_a', jsonb_set(pg_temp.envio(gen_random_uuid()), '{assinante,assinatura}',
                                        '"os/00000000-0000-0000-0000-000000000000/assinatura/x.png"'));
  perform pg_temp.esperar('assinatura que não está no armazenamento é recusada', r like 'erro: Colete a assinatura%', true);

  r := pg_temp.enviar('op_a', pg_temp.envio(gen_random_uuid()) - 'tecnico_assinatura');
  perform pg_temp.esperar('sem a assinatura do técnico é recusado', r like 'erro: Assine antes de concluir%', true);

  r := pg_temp.enviar('op_a', jsonb_set(pg_temp.envio(gen_random_uuid()), '{inicio}',
                                        to_jsonb(now() - interval '2 days')));
  perform pg_temp.esperar('fora da data programada é recusado', r like 'erro: Só é possível iniciar na data programada%', true);

  r := pg_temp.enviar('op_a', jsonb_set(pg_temp.envio(gen_random_uuid()), '{produtos,0,estoque_lote_id}',
                                        to_jsonb((select v from t where k = 'lote_alheio'))));
  perform pg_temp.esperar('lote de outra base é recusado', r like 'erro: O lote escolhido não é da sua base%', true);

  update public.funcionarios set base_id = null where id = (select v from t where k = 'func_a');
  r := pg_temp.enviar('op_a', pg_temp.envio(gen_random_uuid()));
  perform pg_temp.esperar('técnico sem base no cadastro é recusado', r like 'erro: Seu cadastro não tem base%', true);
  update public.funcionarios set base_id = (select base_id from public.estoque_lotes where id = (select v from t where k = 'lote'))
   where id = (select v from t where k = 'func_a');

  perform pg_temp.esperar('nada disso mudou a situação da OS',
    (select status = 'confirmada' and execucao_uuid is null from public.ordens_servico where id = (select v from t where k = 'os')), true);
end $$;

-- ---------------------------------------------------------------------------
-- O envio que vale, e o reenvio
-- ---------------------------------------------------------------------------
do $$
declare r text; v_uuid uuid := gen_random_uuid(); n_anexos int; n_repos int;
begin
  r := pg_temp.enviar('op_a', pg_temp.envio(v_uuid));
  perform pg_temp.esperar('o envio completo é registrado', r = 'registrada', true);

  perform pg_temp.esperar('a OS fica executada, com assinante e técnico — sem pedir CPF nem cargo',
    exists (select 1 from public.ordens_servico where id = (select v from t where k = 'os')
             and status = 'executada' and assinante_nome = 'Maria Souza'
             and tecnico_executor_id = (select v from t where k = 'func_a') and execucao_uuid = v_uuid), true);

  perform pg_temp.esperar('o ponto com status 1 fica não conforme',
    exists (select 1 from public.os_plano_pontos pt join public.os_planos_controle p on p.id = pt.plano_id
             where p.os_id = (select v from t where k = 'os') and pt.numero = 1 and pt.situacao = 'nao_conforme'), true);

  perform pg_temp.esperar('o produto fica com lote, quantidade e unidade de campo',
    exists (select 1 from public.os_produtos where os_id = (select v from t where k = 'os')
             and estoque_lote_id = (select v from t where k = 'lote') and lote = 'RG-01'
             and qtd_utilizada = 150 and unidade_utilizada = 'g'), true);

  select count(*) into n_anexos from public.os_anexos where os_id = (select v from t where k = 'os');
  select count(*) into n_repos from public.os_reposicoes where os_id = (select v from t where k = 'os');
  perform pg_temp.esperar('foto e reposição registradas', n_anexos = 1 and n_repos = 1, true);

  r := pg_temp.enviar('op_a', pg_temp.envio(v_uuid));
  perform pg_temp.esperar('o reenvio do mesmo envio responde "já registrada"', r = 'ja_registrada', true);
  perform pg_temp.esperar('e não grava nada de novo',
    (select count(*) from public.os_anexos where os_id = (select v from t where k = 'os')) = n_anexos
    and (select count(*) from public.os_produtos where os_id = (select v from t where k = 'os')) = 1, true);

  r := pg_temp.enviar('op_a', pg_temp.envio(gen_random_uuid()));
  perform pg_temp.esperar('um segundo envio diferente é recusado', r like 'erro: Esta OS já tem uma execução%', true);
end $$;

-- ---------------------------------------------------------------------------
-- Histórico por ponto
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  perform pg_temp.como((select v from t where k = 'cli_a'));
  set local role authenticated;
  select count(*) into n from public.vw_monitoramento_historico where status_codigo is not null;
  reset role;
  perform pg_temp.esperar('o cliente vê as leituras dos pontos dele', n = 2, true);

  perform pg_temp.como((select v from t where k = 'cli_b'));
  set local role authenticated;
  select count(*) into n from public.vw_monitoramento_historico;
  reset role;
  perform pg_temp.esperar('o outro cliente NÃO vê', n = 0, true);

  perform pg_temp.como((select v from t where k = 'op_b'));
  set local role authenticated;
  select count(*) into n from public.vw_monitoramento_historico;
  reset role;
  perform pg_temp.esperar('técnico de outra OS NÃO vê', n = 0, true);
end $$;

rollback;
