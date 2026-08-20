-- Todo movimento de estoque somava no cliente: ler a quantidade do lote, somar
-- ou subtrair em JavaScript, escrever o resultado. Quatro operações faziam isso
-- e todas perdem escrita quando acontecem ao mesmo tempo — as duas leem o mesmo
-- valor e a segunda apaga a primeira.
--
-- Agora a soma acontece no banco, e o que se prova aqui é o efeito: somas
-- sucessivas se acumulam, saldo não fica negativo, e cada transferência só é
-- cancelada uma vez.

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
  v_perfil uuid; v_prod uuid; v_org uuid; v_dst uuid;
  v_saldo numeric; erro text;
begin
  select id into v_perfil from public.perfis_acesso where nome = 'Administrador';
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'rls-mov@teste.local', '', now(), '{"provider":"email"}', '{"role":"admin"}', now(), now());
  update public.profiles set perfil_acesso_id = v_perfil, role = 'admin' where id = v_admin;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated', 'email', 'rls-mov@teste.local')::text, true);

  insert into public.produtos (codigo, nome, categoria, unidade)
  values ('[RLS]-MOV', '[RLS] Produto do movimento', 'Inseticida', 'L') returning id into v_prod;
  insert into public.bases (nome, cidade, uf) values ('[RLS] Origem', 'São Paulo', 'SP') returning id into v_org;
  insert into public.bases (nome, cidade, uf) values ('[RLS] Destino', 'Rio de Janeiro', 'RJ') returning id into v_dst;

  -- Ajuste: entradas sucessivas se somam, e é isso que o cliente errava.
  v_saldo := public.ajuste_estoque(v_prod, v_org, 10, 'Correção de contagem');
  perform pg_temp.esperar('primeiro ajuste entra', v_saldo = 10, true);
  v_saldo := public.ajuste_estoque(v_prod, v_org, 5, 'Correção de contagem');
  perform pg_temp.esperar('segundo ajuste soma ao primeiro, não o substitui', v_saldo = 15, true);
  v_saldo := public.ajuste_estoque(v_prod, v_org, -4, 'Perda / avaria');
  perform pg_temp.esperar('saída subtrai', v_saldo = 11, true);

  -- E o saldo não vai a negativo.
  erro := null;
  begin
    perform public.ajuste_estoque(v_prod, v_org, -100, 'Perda / avaria');
  exception when others then erro := SQLERRM; end;
  perform pg_temp.esperar('ajuste que zeraria o saldo abaixo de zero é recusado',
    erro like 'Saldo insuficiente%', true);
  select quantidade into v_saldo from public.estoque_lotes
   where produto_id = v_prod and base_id = v_org and lote = 'AJUSTE';
  perform pg_temp.esperar('e o saldo fica como estava', v_saldo = 11, true);

  erro := null;
  begin
    perform public.ajuste_estoque(v_prod, v_org, 1, '  ');
  exception when others then erro := SQLERRM; end;
  perform pg_temp.esperar('ajuste sem motivo é recusado', erro = 'Informe o motivo do ajuste.', true);

  erro := null;
  begin
    perform public.ajuste_estoque(v_prod, v_org, 0, 'Correção de contagem');
  exception when others then erro := SQLERRM; end;
  perform pg_temp.esperar('ajuste de zero é recusado',
    erro = 'Informe uma quantidade diferente de zero.', true);
end $$;

-- Transferência: sai da origem, entra no destino, e cancelar devolve uma vez só.
do $$
declare
  v_prod uuid; v_org uuid; v_dst uuid; v_cod text; v_tr uuid; v_saldo numeric; erro text;
begin
  select id into v_prod from public.produtos where codigo = '[RLS]-MOV';
  select id into v_org from public.bases where nome = '[RLS] Origem';
  select id into v_dst from public.bases where nome = '[RLS] Destino';

  v_cod := public.criar_transferencia(v_prod, v_org, v_dst, 'AJUSTE', 4, 'teste');
  select quantidade into v_saldo from public.estoque_lotes
   where produto_id = v_prod and base_id = v_org and lote = 'AJUSTE';
  perform pg_temp.esperar('enviar abate a origem', v_saldo = 7, true);

  select id into v_tr from public.transferencias where codigo = v_cod;
  perform public.cancelar_transferencia(v_tr);
  select quantidade into v_saldo from public.estoque_lotes
   where produto_id = v_prod and base_id = v_org and lote = 'AJUSTE';
  perform pg_temp.esperar('cancelar devolve à origem', v_saldo = 11, true);

  erro := null;
  begin
    perform public.cancelar_transferencia(v_tr);
  exception when others then erro := SQLERRM; end;
  perform pg_temp.esperar('cancelar de novo é recusado',
    erro = 'Só transferências em trânsito podem ser canceladas.', true);
  select quantidade into v_saldo from public.estoque_lotes
   where produto_id = v_prod and base_id = v_org and lote = 'AJUSTE';
  perform pg_temp.esperar('e o saldo não é devolvido duas vezes', v_saldo = 11, true);

  -- Recebimento credita o destino.
  v_cod := public.criar_transferencia(v_prod, v_org, v_dst, 'AJUSTE', 3, null);
  select id into v_tr from public.transferencias where codigo = v_cod;
  perform public.receber_transferencia(v_tr, 3);
  select quantidade into v_saldo from public.estoque_lotes
   where produto_id = v_prod and base_id = v_dst and lote = 'AJUSTE';
  perform pg_temp.esperar('receber credita o destino', v_saldo = 3, true);

  -- Divergência sem justificativa não passa.
  v_cod := public.criar_transferencia(v_prod, v_org, v_dst, 'AJUSTE', 2, null);
  select id into v_tr from public.transferencias where codigo = v_cod;
  erro := null;
  begin
    perform public.receber_transferencia(v_tr, 1);
  exception when others then erro := SQLERRM; end;
  perform pg_temp.esperar('divergência sem justificativa é recusada',
    erro = 'Quantidade diverge da enviada: justificativa obrigatória.', true);

  perform public.receber_transferencia(v_tr, 1, 'Uma unidade avariada no transporte');
  select quantidade into v_saldo from public.estoque_lotes
   where produto_id = v_prod and base_id = v_dst and lote = 'AJUSTE';
  perform pg_temp.esperar('com justificativa, credita o que chegou', v_saldo = 4, true);
end $$;

rollback;
