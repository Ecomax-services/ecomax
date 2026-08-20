-- A baixa de estoque de uma OS acontece uma vez só.
--
-- A proteção original era uma leitura do histórico antes de escrever nele.
-- Isso segura dois cliques em sequência e não segura dois ao mesmo tempo: as
-- duas transações leem antes de qualquer uma escrever, as duas passam, e as
-- duas debitam. Medido com duas chamadas simultâneas ao RPC: as duas
-- devolveram 200, o saldo caiu 2 em vez de 1, e a OS ficou com dois registros
-- de baixa.
--
-- A correção tem duas camadas. O `for update` na OS serializa as chamadas —
-- e depende de eu ter raciocinado certo sobre concorrência. O índice único
-- não depende: torna o segundo registro impossível venha ele de onde vier.
-- É essa segunda camada que este arquivo prova, porque é a que dá para
-- verificar de forma determinística, sem depender de timing.

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
  v_cliente uuid;
  v_os uuid;
  v_outra uuid;
  n int;
  violou boolean := false;
begin
  insert into public.clientes (nome, cnpj) values ('[RLS] Cliente da baixa', '00000000000596') returning id into v_cliente;
  insert into public.ordens_servico (cliente_id, status) values (v_cliente, 'executada') returning id into v_os;
  insert into public.ordens_servico (cliente_id, status) values (v_cliente, 'executada') returning id into v_outra;

  insert into public.os_historico (os_id, campo, valor_novo)
  values (v_os, 'Baixa de estoque', '1 produto(s)');

  -- A segunda baixa da mesma OS não entra, venha de onde vier.
  begin
    insert into public.os_historico (os_id, campo, valor_novo)
    values (v_os, 'Baixa de estoque', '1 produto(s)');
  exception when unique_violation then
    violou := true;
  end;
  perform pg_temp.esperar('segunda baixa da mesma OS é recusada pelo banco', violou, true);

  select count(*) into n from public.os_historico
   where os_id = v_os and campo = 'Baixa de estoque';
  perform pg_temp.esperar('a OS fica com um registro de baixa, não dois', n = 1, true);

  -- E o índice é parcial: não pode atrapalhar o resto do histórico, que tem
  -- várias linhas por OS de propósito.
  insert into public.os_historico (os_id, campo, valor_anterior, valor_novo)
  values (v_os, 'Status', 'executada', 'concluida'),
         (v_os, 'Status', 'concluida', 'executada');
  select count(*) into n from public.os_historico where os_id = v_os and campo = 'Status';
  perform pg_temp.esperar('o histórico comum continua aceitando várias linhas por OS', n = 2, true);

  -- E outra OS pode ter a sua.
  insert into public.os_historico (os_id, campo, valor_novo)
  values (v_outra, 'Baixa de estoque', '2 produto(s)');
  select count(*) into n from public.os_historico where campo = 'Baixa de estoque' and os_id in (v_os, v_outra);
  perform pg_temp.esperar('cada OS tem a sua baixa', n = 2, true);
end $$;

-- O `for update` na OS precisa vir antes da checagem do histórico: é entre ler
-- e escrever que a segunda chamada se enfiava. Conferir a ordem no texto da
-- função é frágil, mas é o que dá para fazer sem duas sessões — e pega o caso
-- real de alguém reescrever a função e recolocar o lock no lugar errado.
do $$
declare def text;
begin
  select pg_get_functiondef(oid) into def from pg_proc where proname = 'baixar_estoque_os';
  perform pg_temp.esperar('a função trava a OS antes de consultar o histórico',
    position('for update' in def) > 0
      and position('for update' in def) < position('Baixa de estoque' in def),
    true);
end $$;

rollback;
