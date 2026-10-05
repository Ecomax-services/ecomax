-- Conversão de unidade e lote escolhido na baixa de estoque.
--
-- Prova `20261005200000_conversao_de_unidade_e_lote_escolhido.sql`. O caso
-- que motivou tudo: 300 mL aplicados de um produto estocado em litros têm de
-- tirar 0,3 L do lote que o técnico escolheu — não 300 L, e não de outro lote.
--
-- E o contrário: OS antiga, sem unidade de campo nem lote escolhido, baixa
-- exatamente como antes.

begin;

create temporary table t (k text primary key, v uuid);
grant select on t to authenticated;

do $$
declare
  v_admin uuid := gen_random_uuid();
  v_cliente uuid; v_base uuid;
  v_litro uuid; v_kg uuid;
  v_lote_velho uuid; v_lote_novo uuid; v_lote_kg uuid;
  v_os_nova uuid; v_os_antiga uuid; v_os_curta uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'rls-conv-admin@teste.local', '', now(), '{"provider":"email"}', '{"role":"admin"}', now(), now());
  update public.profiles
     set perfil_acesso_id = (select id from public.perfis_acesso where nome = 'Administrador'), role = 'admin'
   where id = v_admin;

  insert into public.clientes (nome, cnpj) values ('[RLS] Conversão', '00000000001163') returning id into v_cliente;
  insert into public.bases (nome) values ('[RLS] Base conversão') returning id into v_base;

  insert into public.produtos (codigo, nome, categoria, unidade, unidade_aplicacao, fator_aplicacao)
  values ('[RLS]-CV1', '[RLS] Inseticida em litro', 'Inseticida', 'L', 'mL', 1000) returning id into v_litro;
  -- Produto sem unidade de aplicação: o caso de quem ainda não configurou.
  insert into public.produtos (codigo, nome, categoria, unidade)
  values ('[RLS]-CV2', '[RLS] Raticida em quilo', 'Raticida', 'KG') returning id into v_kg;

  -- Dois lotes do inseticida. O que vence antes seria o escolhido pelo FEFO;
  -- o técnico escolheu o outro.
  insert into public.estoque_lotes (produto_id, base_id, lote, validade, quantidade)
  values (v_litro, v_base, 'L-VELHO', current_date + 30, 5) returning id into v_lote_velho;
  insert into public.estoque_lotes (produto_id, base_id, lote, validade, quantidade)
  values (v_litro, v_base, 'L-NOVO', current_date + 300, 2) returning id into v_lote_novo;
  insert into public.estoque_lotes (produto_id, base_id, lote, validade, quantidade)
  values (v_kg, v_base, 'K-1', current_date + 100, 10) returning id into v_lote_kg;

  insert into public.ordens_servico (cliente_id, status) values (v_cliente, 'executada') returning id into v_os_nova;
  insert into public.ordens_servico (cliente_id, status) values (v_cliente, 'executada') returning id into v_os_antiga;
  insert into public.ordens_servico (cliente_id, status) values (v_cliente, 'executada') returning id into v_os_curta;

  insert into t values ('admin', v_admin), ('litro', v_litro), ('kg', v_kg),
    ('lote_velho', v_lote_velho), ('lote_novo', v_lote_novo), ('lote_kg', v_lote_kg),
    ('os_nova', v_os_nova), ('os_antiga', v_os_antiga), ('os_curta', v_os_curta);
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

create or replace function pg_temp.saldo(_k text) returns numeric language sql as $$
  select quantidade from public.estoque_lotes where id = (select v from t where k = _k);
$$;

-- ---------------------------------------------------------------------------
-- A conversão
-- ---------------------------------------------------------------------------
do $$
begin
  perform pg_temp.esperar('300 mL viram 0,3 L',
    public.qtd_em_unidade_de_estoque((select v from t where k = 'litro'), 300, 'mL') = 0.3, true);
  perform pg_temp.esperar('na unidade de estoque, não converte',
    public.qtd_em_unidade_de_estoque((select v from t where k = 'litro'), 2, 'L') = 2, true);
  perform pg_temp.esperar('sem unidade informada, vale a de estoque',
    public.qtd_em_unidade_de_estoque((select v from t where k = 'litro'), 2, null) = 2, true);
  perform pg_temp.esperar('caixa não importa: "kg" é "KG"',
    public.qtd_em_unidade_de_estoque((select v from t where k = 'kg'), 3, 'kg') = 3, true);
end $$;

-- ---------------------------------------------------------------------------
-- Travas na gravação
-- ---------------------------------------------------------------------------
do $$
declare bloqueou boolean; v_lote text;
begin
  bloqueou := false;
  begin
    insert into public.os_produtos (os_id, produto_id, qtd_recomendada, qtd_utilizada, unidade_utilizada)
    values ((select v from t where k = 'os_curta'), (select v from t where k = 'litro'), 1, 300, 'g');
  exception when others then bloqueou := true;
  end;
  perform pg_temp.esperar('unidade que não converte é recusada na gravação', bloqueou, true);

  bloqueou := false;
  begin
    insert into public.os_produtos (os_id, produto_id, qtd_recomendada, qtd_utilizada, unidade_utilizada)
    values ((select v from t where k = 'os_curta'), (select v from t where k = 'kg'), 1, 300, 'g');
  exception when others then bloqueou := true;
  end;
  perform pg_temp.esperar('produto sem fator só aceita a unidade de estoque', bloqueou, true);

  bloqueou := false;
  begin
    insert into public.os_produtos (os_id, produto_id, qtd_recomendada, estoque_lote_id)
    values ((select v from t where k = 'os_curta'), (select v from t where k = 'kg'), 1, (select v from t where k = 'lote_novo'));
  exception when others then bloqueou := true;
  end;
  perform pg_temp.esperar('lote de outro produto é recusado', bloqueou, true);

  insert into public.os_produtos (os_id, produto_id, qtd_recomendada, qtd_utilizada, unidade_utilizada, estoque_lote_id)
  values ((select v from t where k = 'os_nova'), (select v from t where k = 'litro'), 1, 300, 'mL', (select v from t where k = 'lote_novo'));
  select lote into v_lote from public.os_produtos where os_id = (select v from t where k = 'os_nova');
  perform pg_temp.esperar('o texto do lote vem do lote escolhido', v_lote = 'L-NOVO', true);
end $$;

-- ---------------------------------------------------------------------------
-- A baixa — como admin, que é quem baixa pelo Backoffice
-- ---------------------------------------------------------------------------
do $$
declare n int; v_descr text; bloqueou boolean;
begin
  perform pg_temp.como((select v from t where k = 'admin'));
  set local role authenticated;
  n := public.baixar_estoque_os((select v from t where k = 'os_nova'));
  reset role;
  perform pg_temp.esperar('o lote escolhido perde 0,3 L', pg_temp.saldo('lote_novo') = 1.7, true);
  perform pg_temp.esperar('o lote que venceria antes não é tocado', pg_temp.saldo('lote_velho') = 5, true);

  select descricao into v_descr from public.movimentacoes
   where produto_id = (select v from t where k = 'litro') order by created_at desc limit 1;
  perform pg_temp.esperar('a movimentação mostra as duas unidades', v_descr like '%300 mL = 0.3 L%', true);

  -- OS antiga: sem unidade de campo nem lote. FEFO, como sempre.
  insert into public.os_produtos (os_id, produto_id, qtd_recomendada, qtd_utilizada)
  values ((select v from t where k = 'os_antiga'), (select v from t where k = 'litro'), 1, 1);
  perform pg_temp.como((select v from t where k = 'admin'));
  set local role authenticated;
  n := public.baixar_estoque_os((select v from t where k = 'os_antiga'));
  reset role;
  perform pg_temp.esperar('OS antiga baixa pelo FEFO, como antes', pg_temp.saldo('lote_velho') = 4, true);

  -- Lote escolhido sem saldo: erro. Não pode completar com outro lote.
  insert into public.os_produtos (os_id, produto_id, qtd_recomendada, qtd_utilizada, unidade_utilizada, estoque_lote_id)
  values ((select v from t where k = 'os_curta'), (select v from t where k = 'litro'), 1, 2000, 'mL', (select v from t where k = 'lote_novo'));
  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    perform public.baixar_estoque_os((select v from t where k = 'os_curta'));
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('lote escolhido sem saldo é erro', bloqueou, true);
  perform pg_temp.esperar('e nenhum outro lote é usado no lugar', pg_temp.saldo('lote_velho') = 4, true);
  perform pg_temp.esperar('e o lote escolhido fica intacto', pg_temp.saldo('lote_novo') = 1.7, true);

  -- A proteção contra a segunda baixa segue valendo.
  bloqueou := false;
  perform pg_temp.como((select v from t where k = 'admin'));
  begin
    set local role authenticated;
    perform public.baixar_estoque_os((select v from t where k = 'os_nova'));
  exception when others then bloqueou := true;
  end;
  reset role;
  perform pg_temp.esperar('a mesma OS não baixa duas vezes', bloqueou, true);
end $$;

rollback;
