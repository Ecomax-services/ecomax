-- Receber uma requisição é a operação que traz mercadoria para dentro, e era a
-- menos protegida do sistema. Três defeitos conviviam no cliente:
--
--   • nenhuma checagem de que já tinha sido recebida — a tela escondia o botão,
--     mas a tela não é a regra;
--   • a soma do saldo feita no cliente (ler, somar, escrever), então duas
--     recepções simultâneas liam o mesmo valor e a segunda apagava a primeira.
--     Medido: duas entradas de 100 mL deixaram o lote com 100;
--   • só o último passo checava erro, então uma falha no estoque ainda marcava
--     a requisição como recebida.
--
-- Agora é uma transação no banco. O que se prova aqui é o estado final, que é
-- o que importa: recebe uma vez, soma no lote existente, e recusa a segunda.

begin;

create or replace function pg_temp.esperar(_caso text, _obtido boolean, _esperado boolean)
returns void language plpgsql as $$
begin
  if _obtido is distinct from _esperado then
    raise exception 'FALHOU: % — esperado %, obteve %', _caso, _esperado, coalesce(_obtido::text, 'null');
  end if;
  raise notice 'ok: %', _caso;
end $$;

do $$
declare
  v_admin uuid := gen_random_uuid();
  v_perfil uuid;
  v_prod uuid; v_base uuid; v_req uuid; v_req2 uuid;
  v_qtd numeric; n int; erro text;
begin
  select id into v_perfil from public.perfis_acesso where nome = 'Administrador';
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'rls-req@teste.local', '', now(), '{"provider":"email"}', '{"role":"admin"}', now(), now());
  update public.profiles set perfil_acesso_id = v_perfil, role = 'admin' where id = v_admin;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated', 'email', 'rls-req@teste.local')::text, true);

  insert into public.produtos (codigo, nome, categoria, unidade)
  values ('[RLS]-REQ', '[RLS] Produto da requisição', 'Inseticida', 'L') returning id into v_prod;
  insert into public.bases (nome, cidade, uf) values ('[RLS] Base da requisição', 'São Paulo', 'SP') returning id into v_base;

  insert into public.requisicoes (codigo, produto_id, status, quantidade)
  values ('[RLS]-R1', v_prod, 'enviada', '10 L') returning id into v_req;
  insert into public.requisicoes (codigo, produto_id, status, quantidade)
  values ('[RLS]-R2', v_prod, 'aprovada', '10 L') returning id into v_req2;

  -- Primeira recepção: cria o lote.
  perform public.receber_requisicao(v_req, v_base, 'L-1', 10);
  select quantidade into v_qtd from public.estoque_lotes
   where produto_id = v_prod and base_id = v_base and lote = 'L-1';
  perform pg_temp.esperar('a primeira recepção dá entrada no estoque', v_qtd = 10, true);

  select status::text into erro from public.requisicoes where id = v_req;
  perform pg_temp.esperar('e fecha a requisição', erro = 'recebida', true);

  select count(*) into n from public.movimentacoes
   where produto_id = v_prod and tipo = 'entrada';
  perform pg_temp.esperar('com uma movimentação de entrada', n = 1, true);

  -- Segunda recepção da mesma requisição: recusada.
  erro := null;
  begin
    perform public.receber_requisicao(v_req, v_base, 'L-1', 10);
  exception when others then
    erro := SQLERRM;
  end;
  perform pg_temp.esperar('a segunda recepção da mesma requisição é recusada',
    erro = 'Esta requisição já foi recebida.', true);

  select quantidade into v_qtd from public.estoque_lotes
   where produto_id = v_prod and base_id = v_base and lote = 'L-1';
  perform pg_temp.esperar('e o estoque não muda', v_qtd = 10, true);

  -- Requisição que ainda não foi enviada não pode ser recebida.
  erro := null;
  begin
    perform public.receber_requisicao(v_req2, v_base, 'L-2', 5);
  exception when others then
    erro := SQLERRM;
  end;
  perform pg_temp.esperar('requisição não enviada é recusada',
    erro = 'Só é possível receber uma requisição que esteja enviada.', true);

  -- Duas requisições diferentes no mesmo lote somam, não sobrescrevem: é o
  -- caso que o `read-modify-write` do cliente errava.
  update public.requisicoes set status = 'enviada' where id = v_req2;
  perform public.receber_requisicao(v_req2, v_base, 'L-1', 7);
  select quantidade into v_qtd from public.estoque_lotes
   where produto_id = v_prod and base_id = v_base and lote = 'L-1';
  perform pg_temp.esperar('entrada no mesmo lote soma ao que já havia', v_qtd = 17, true);

  -- Quantidade zero ou lote em branco não passam.
  update public.requisicoes set status = 'enviada' where id = v_req;
  erro := null;
  begin
    perform public.receber_requisicao(v_req, v_base, '  ', 5);
  exception when others then erro := SQLERRM; end;
  perform pg_temp.esperar('lote em branco é recusado', erro = 'Informe o lote recebido.', true);

  erro := null;
  begin
    perform public.receber_requisicao(v_req, v_base, 'L-3', 0);
  exception when others then erro := SQLERRM; end;
  perform pg_temp.esperar('quantidade zero é recusada',
    erro = 'A quantidade recebida precisa ser maior que zero.', true);
end $$;

rollback;
