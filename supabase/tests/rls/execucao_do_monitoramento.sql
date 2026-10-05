-- Execução do monitoramento: o que muda e, principalmente, o que não muda.
--
-- Prova `20261005160000_execucao_do_monitoramento.sql`.
--
-- O risco desta migration é quebrar o que já funciona: a situação do ponto é
-- lida pelo contador do Backoffice, pelo EmitirOs e pela aba Mapeamento do
-- Portal. Por isso metade dos casos é sobre o modelo antigo continuar igual —
-- cliente sem mapa, plano sem serviço, situação escrita à mão.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_admin uuid := gen_random_uuid();
  v_op_a  uuid := gen_random_uuid();
  v_op_b  uuid := gen_random_uuid();
  v_cli_a uuid := gen_random_uuid();
  v_func_a uuid := gen_random_uuid();
  v_func_b uuid := gen_random_uuid();
  v_cliente_a uuid; v_cliente_b uuid;
  v_fabrica uuid; v_cd uuid;
  v_os_a uuid; v_os_b uuid;
  v_produto uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-exec-admin@teste.local', '', now(), '{"provider":"email"}', '{"role":"admin"}', now(), now()),
    (v_op_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-exec-op-a@teste.local', '', now(), '{"provider":"email"}', '{"role":"operador"}', now(), now()),
    (v_op_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-exec-op-b@teste.local', '', now(), '{"provider":"email"}', '{"role":"operador"}', now(), now()),
    (v_cli_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-exec-cli-a@teste.local', '', now(), '{"provider":"email"}', '{"role":"cliente"}', now(), now());

  update public.profiles
     set perfil_acesso_id = (select id from public.perfis_acesso where nome = 'Administrador'), role = 'admin'
   where id = v_admin;

  insert into public.clientes (nome, cnpj) values ('[RLS] Exec com mapa', '00000000000868') returning id into v_cliente_a;
  insert into public.clientes (nome, cnpj) values ('[RLS] Exec sem mapa', '00000000000949') returning id into v_cliente_b;
  insert into public.cliente_portal_usuarios (cliente_id, nome, email, status)
  values (v_cliente_a, '[RLS] Portal exec', 'rls-exec-cli-a@teste.local', 'ativo');

  -- O mapa do cliente A. O ponto inativo não pode entrar na OS.
  insert into public.cliente_areas (cliente_id, nome, ordem) values (v_cliente_a, 'Fábrica', 1) returning id into v_fabrica;
  insert into public.cliente_areas (cliente_id, nome, ordem) values (v_cliente_a, 'CD', 2) returning id into v_cd;
  insert into public.cliente_pontos (cliente_id, area_id, servico_codigo, numero, local, ativo) values
    (v_cliente_a, v_fabrica, 'PI', 1, 'Área Externa', true),
    (v_cliente_a, v_fabrica, 'PI', 2, 'Doca 3', true),
    (v_cliente_a, v_cd,      'PI', 9, 'Desativado', false),
    (v_cliente_a, v_cd,      'PA', 1, 'Estoque seco', true),
    (v_cliente_a, v_fabrica, 'AL', 1, 'Recepção', true),
    (v_cliente_a, v_fabrica, 'OC', 1, 'Produção', true);

  insert into public.ordens_servico (cliente_id, status) values (v_cliente_a, 'em_aberto') returning id into v_os_a;
  insert into public.ordens_servico (cliente_id, status) values (v_cliente_b, 'em_aberto') returning id into v_os_b;

  -- Como `criarOsDeOrcamento` deixa a OS: um plano por tipo de controle, sem
  -- ponto. Globo de Moscas não tem mapeamento (aguarda o cliente).
  insert into public.os_planos_controle (os_id, tipo_controle, frequencia) values
    (v_os_a, 'Controle Roedores', 'Mensal'),
    (v_os_a, 'Armadilha Luminosa', 'Mensal'),
    (v_os_a, 'Monitoramento de Áreas', 'Mensal'),
    (v_os_a, 'Globo de Moscas', 'Mensal'),
    (v_os_b, 'Controle Roedores', 'Mensal');

  insert into public.funcionarios (id, nome_completo, cpf, cargo, setor, profile_id) values
    (v_func_a, '[RLS] Técnico exec A', '00000000021', 'Operador', 'Operacional', v_op_a),
    (v_func_b, '[RLS] Técnico exec B', '00000000022', 'Operador', 'Operacional', v_op_b);
  insert into public.os_funcionarios (os_id, funcionario_id) values (v_os_a, v_func_a), (v_os_b, v_func_b);

  insert into public.produtos (codigo, nome, categoria, unidade) values ('[RLS]-EX1', '[RLS] Raticida', 'Raticida', 'KG')
  returning id into v_produto;

  insert into t values
    ('admin', v_admin), ('op_a', v_op_a), ('op_b', v_op_b), ('cli_a', v_cli_a),
    ('os_a', v_os_a), ('os_b', v_os_b), ('produto', v_produto);
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

create or replace function pg_temp.plano(_os text, _servico text) returns uuid language sql as $$
  select id from public.os_planos_controle
   where os_id = (select v from t where k = _os) and servico_codigo is not distinct from _servico
   limit 1;
$$;

create or replace function pg_temp.ponto(_servico text, _numero int) returns uuid language sql as $$
  select pt.id from public.os_plano_pontos pt
   where pt.plano_id = pg_temp.plano('os_a', _servico) and pt.numero = _numero;
$$;

-- ---------------------------------------------------------------------------
-- Preparar a OS pelo mapa — como admin, com a RLS valendo
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  perform pg_temp.como((select v from t where k = 'admin'));
  set local role authenticated;
  n := public.preparar_monitoramento_os((select v from t where k = 'os_a'));
  reset role;
  perform pg_temp.esperar('cria um ponto por ponto ativo do mapa (2 PI, 1 PA, 1 AL, 1 OC)', n = 5, true);

  select count(*) into n from public.os_planos_controle
   where os_id = (select v from t where k = 'os_a') and tipo_controle = 'Controle Roedores';
  perform pg_temp.esperar('Controle Roedores vira dois planos, PI e PA', n = 2, true);

  select pontos_previstos into n from public.os_planos_controle where id = pg_temp.plano('os_a', 'PI');
  perform pg_temp.esperar('o plano do PI prevê os 2 pontos ativos', n = 2, true);

  perform pg_temp.esperar('o ponto copia área e local do mapa',
    exists (select 1 from public.os_plano_pontos
             where id = pg_temp.ponto('PI', 2) and area = 'Fábrica' and identificacao = 'Doca 3'), true);

  perform pg_temp.esperar('tipo sem mapeamento fica no modelo antigo',
    exists (select 1 from public.os_planos_controle
             where os_id = (select v from t where k = 'os_a') and tipo_controle = 'Globo de Moscas'
               and servico_codigo is null), true);

  perform pg_temp.como((select v from t where k = 'admin'));
  set local role authenticated;
  n := public.preparar_monitoramento_os((select v from t where k = 'os_a'));
  reset role;
  perform pg_temp.esperar('chamar de novo não cria nada', n = 0, true);

  perform pg_temp.como((select v from t where k = 'admin'));
  set local role authenticated;
  n := public.preparar_monitoramento_os((select v from t where k = 'os_b'));
  reset role;
  perform pg_temp.esperar('cliente sem mapa: nada muda', n = 0, true);
  perform pg_temp.esperar('cliente sem mapa: o plano continua antigo',
    (select servico_codigo is null from public.os_planos_controle where os_id = (select v from t where k = 'os_b')), true);

end $$;

-- ---------------------------------------------------------------------------
-- Situação calculada
-- ---------------------------------------------------------------------------
do $$
declare v_sit text; v_rot text; bloqueou boolean;
begin
  update public.os_plano_pontos set status_codigo = 1 where id = pg_temp.ponto('PI', 1);
  select situacao, status_rotulo into v_sit, v_rot from public.os_plano_pontos where id = pg_temp.ponto('PI', 1);
  perform pg_temp.esperar('PI status 1 é não conforme', v_sit = 'nao_conforme', true);
  perform pg_temp.esperar('o rótulo da legenda é copiado', v_rot = 'Isca Consumida', true);

  update public.os_plano_pontos set status_codigo = 3 where id = pg_temp.ponto('PI', 2);
  select situacao into v_sit from public.os_plano_pontos where id = pg_temp.ponto('PI', 2);
  perform pg_temp.esperar('PI status 3 é conforme', v_sit = 'conforme', true);

  update public.os_plano_pontos set status_codigo = 4 where id = pg_temp.ponto('PA', 1);
  select situacao, status_rotulo into v_sit, v_rot from public.os_plano_pontos where id = pg_temp.ponto('PA', 1);
  perform pg_temp.esperar('PA status 4 é inacessível', v_sit = 'inacessivel', true);
  perform pg_temp.esperar('o rótulo vem da legenda da placa, não do porta-isca', v_rot = 'Placa Obstruída (sem acesso)', true);

  -- O contador da tela, que lê só `situacao`, enxerga o registro novo.
  perform pg_temp.esperar('o contador antigo conta os pontos do plano novo',
    public.contar_pontos_preenchidos(pg_temp.plano('os_a', 'PI')) = 2, true);

  -- Mandar `situacao` direto não vale no plano novo: ela é calculada.
  update public.os_plano_pontos set situacao = 'conforme' where id = pg_temp.ponto('PI', 1);
  select situacao into v_sit from public.os_plano_pontos where id = pg_temp.ponto('PI', 1);
  perform pg_temp.esperar('situação escrita à mão é recalculada no plano novo', v_sit = 'nao_conforme', true);

  update public.os_plano_pontos set contagens = '{"Mosca Doméstica": 6, "Libélula": 0}' where id = pg_temp.ponto('AL', 1);
  select situacao into v_sit from public.os_plano_pontos where id = pg_temp.ponto('AL', 1);
  perform pg_temp.esperar('armadilha luminosa lida fica conforme (provisório)', v_sit = 'conforme', true);

  update public.os_plano_pontos set sem_ocorrencia = true where id = pg_temp.ponto('OC', 1);
  select situacao into v_sit from public.os_plano_pontos where id = pg_temp.ponto('OC', 1);
  perform pg_temp.esperar('setor sem ocorrência é conforme', v_sit = 'conforme', true);

  update public.os_plano_pontos set sem_ocorrencia = false, contagens = '{"Barata": 3}' where id = pg_temp.ponto('OC', 1);
  select situacao into v_sit from public.os_plano_pontos where id = pg_temp.ponto('OC', 1);
  perform pg_temp.esperar('setor com praga é não conforme', v_sit = 'nao_conforme', true);

  bloqueou := false;
  begin
    update public.os_plano_pontos set sem_ocorrencia = true where id = pg_temp.ponto('OC', 1);
  exception when others then bloqueou := true;
  end;
  perform pg_temp.esperar('setor NÃO fica sem ocorrência com praga contada', bloqueou, true);

  bloqueou := false;
  begin
    update public.os_plano_pontos set status_codigo = 1 where id = pg_temp.ponto('AL', 1);
  exception when others then bloqueou := true;
  end;
  perform pg_temp.esperar('armadilha luminosa NÃO recebe status 1–4', bloqueou, true);

  bloqueou := false;
  begin
    update public.os_plano_pontos set status_codigo = 5 where id = pg_temp.ponto('PI', 1);
  exception when others then bloqueou := true;
  end;
  perform pg_temp.esperar('status fora de 1–4 é recusado', bloqueou, true);

  bloqueou := false;
  begin
    update public.os_plano_pontos set contagens = '{"Mosca Doméstica": -1}' where id = pg_temp.ponto('AL', 1);
  exception when others then bloqueou := true;
  end;
  perform pg_temp.esperar('contagem negativa é recusada', bloqueou, true);

  bloqueou := false;
  begin
    update public.os_plano_pontos set contagens = '{"Mosca Doméstica": "seis"}' where id = pg_temp.ponto('AL', 1);
  exception when others then bloqueou := true;
  end;
  perform pg_temp.esperar('contagem em texto é recusada', bloqueou, true);
end $$;

-- ---------------------------------------------------------------------------
-- Modelo antigo intocado
-- ---------------------------------------------------------------------------
do $$
declare v_sit text; v_plano uuid; bloqueou boolean;
begin
  select id into v_plano from public.os_planos_controle
   where os_id = (select v from t where k = 'os_a') and tipo_controle = 'Globo de Moscas';

  insert into public.os_plano_pontos (plano_id, numero, situacao) values (v_plano, 1, 'nao_conforme');
  select situacao into v_sit from public.os_plano_pontos where plano_id = v_plano and numero = 1;
  perform pg_temp.esperar('plano antigo guarda a situação escrita à mão', v_sit = 'nao_conforme', true);

  bloqueou := false;
  begin
    insert into public.os_plano_pontos (plano_id, numero) values (v_plano, 1);
  exception when unique_violation then bloqueou := true;
  end;
  perform pg_temp.esperar('plano antigo continua recusando número repetido', bloqueou, true);
end $$;

-- ---------------------------------------------------------------------------
-- Travas
-- ---------------------------------------------------------------------------
do $$
declare bloqueou boolean; v_ponto_a uuid;
begin
  insert into public.os_produtos (os_id, produto_id, qtd_recomendada, lote) values
    ((select v from t where k = 'os_a'), (select v from t where k = 'produto'), 1, 'L-01'),
    ((select v from t where k = 'os_a'), (select v from t where k = 'produto'), 1, 'L-02');
  perform pg_temp.esperar('o mesmo produto entra com dois lotes', true, true);

  bloqueou := false;
  begin
    insert into public.os_produtos (os_id, produto_id, qtd_recomendada, lote)
    values ((select v from t where k = 'os_a'), (select v from t where k = 'produto'), 1, 'L-01');
  exception when unique_violation then bloqueou := true;
  end;
  perform pg_temp.esperar('o mesmo lote NÃO entra duas vezes', bloqueou, true);

  v_ponto_a := pg_temp.ponto('PI', 1);
  bloqueou := false;
  begin
    insert into public.os_anexos (os_id, nome, tipo, ponto_id)
    values ((select v from t where k = 'os_b'), '[RLS] Foto cruzada', 'foto', v_ponto_a);
  exception when others then bloqueou := true;
  end;
  perform pg_temp.esperar('foto NÃO se pendura em ponto de outra OS', bloqueou, true);

  insert into public.os_anexos (os_id, nome, tipo, ponto_id)
  values ((select v from t where k = 'os_a'), '[RLS] Foto do ponto', 'foto', v_ponto_a);
  perform pg_temp.esperar('foto entra no ponto da própria OS', true, true);

  bloqueou := false;
  begin
    insert into public.os_aplicacoes (os_id, plano_id, produto_id, tecnica, quantidade, unidade, areas)
    values ((select v from t where k = 'os_a'), pg_temp.plano('os_a', 'PI'), (select v from t where k = 'produto'),
            'Aplicação de Gel', 35, 'g', array['Fábrica']);
  exception when others then bloqueou := true;
  end;
  perform pg_temp.esperar('aplicação NÃO entra em plano que não é de Desinsetização', bloqueou, true);

  bloqueou := false;
  begin
    update public.os_planos_controle set lampada_validade = current_date where id = pg_temp.plano('os_a', 'PI');
  exception when others then bloqueou := true;
  end;
  perform pg_temp.esperar('lâmpada só no plano da Armadilha Luminosa', bloqueou, true);

  update public.ordens_servico set execucao_uuid = '11111111-1111-1111-1111-111111111111'
   where id = (select v from t where k = 'os_a');
  bloqueou := false;
  begin
    update public.ordens_servico set execucao_uuid = '11111111-1111-1111-1111-111111111111'
     where id = (select v from t where k = 'os_b');
  exception when unique_violation then bloqueou := true;
  end;
  perform pg_temp.esperar('o mesmo envio NÃO vale para duas OS', bloqueou, true);
end $$;

-- ---------------------------------------------------------------------------
-- RLS das tabelas novas
-- ---------------------------------------------------------------------------
do $$
declare n int; bloqueou boolean; v_rep uuid;
begin
  insert into public.os_reposicoes (os_id, observacao) values ((select v from t where k = 'os_a'), '[RLS] Repor raticida')
  returning id into v_rep;
  insert into public.os_reposicao_itens (reposicao_id, produto_id, quantidade)
  values (v_rep, (select v from t where k = 'produto'), 2);

  perform pg_temp.como((select v from t where k = 'op_a'));
  set local role authenticated;
  select count(*) into n from public.os_reposicao_itens;
  reset role;
  perform pg_temp.esperar('técnico vê a reposição da OS dele', n = 1, true);

  perform pg_temp.como((select v from t where k = 'op_b'));
  set local role authenticated;
  select count(*) into n from public.os_reposicoes where id = v_rep;
  reset role;
  perform pg_temp.esperar('técnico NÃO vê reposição de OS alheia', n = 0, true);

  perform pg_temp.como((select v from t where k = 'cli_a'));
  set local role authenticated;
  select count(*) into n from public.os_reposicoes where id = v_rep;
  reset role;
  perform pg_temp.esperar('cliente NÃO vê a reposição, mesmo da OS dele', n = 0, true);

  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'op_a'));
  begin
    set local role authenticated;
    insert into public.os_reposicoes (os_id) values ((select v from t where k = 'os_b'));
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('técnico NÃO grava reposição direto na tabela', bloqueou, true);
end $$;

rollback;
