-- Quem pode chamar o quê.
--
-- Duas funções tinham `revoke` escrito no repositório e continuavam
-- executáveis por qualquer sessão autenticada, cada uma errando o alvo de um
-- jeito:
--
--   revoke ... from anon, authenticated  → não tira o EXECUTE que funções
--                                          nascem dando a PUBLIC;
--   revoke all ... from public           → não tira o grant direto que os
--                                          privilégios padrão do Supabase dão
--                                          a anon e authenticated.
--
-- Nenhum dos dois aparecia em teste nenhum, porque a proteção estava escrita —
-- só não estava valendo. É o motivo de este arquivo checar o **efeito**
-- (`has_function_privilege`) e não o texto da migration.

begin;

do $$
declare
  r record;
  vazando text := '';
begin
  -- Funções que só as rotinas internas e o service_role devem alcançar.
  for r in
    select oid, proname from pg_proc
     where pronamespace = 'public'::regnamespace
       and proname in ('garantias_marcar_a_renovar', 'catalogo_uso_interno')
  loop
    if has_function_privilege('authenticated', r.oid, 'execute')
       or has_function_privilege('anon', r.oid, 'execute') then
      vazando := vazando || r.proname || ' ';
    end if;
  end loop;

  if vazando <> '' then
    raise exception 'FALHOU: função interna executável por anon/authenticated: %', vazando;
  end if;
  raise notice 'ok: garantias_marcar_a_renovar e catalogo_uso_interno fora do alcance da sessão';
end $$;

-- O outro lado: o que precisa continuar ao alcance de quem usa o sistema.
-- `catalogo_uso` e `baixar_estoque_os` checam permissão por dentro; travá-las
-- aqui quebraria Configurações e a baixa de estoque da OS.
do $$
declare
  r record;
  bloqueada text := '';
begin
  for r in
    select oid, proname from pg_proc
     where pronamespace = 'public'::regnamespace
       and proname in ('catalogo_uso', 'baixar_estoque_os', 'acesso_status', 'has_module_perm')
  loop
    if not has_function_privilege('authenticated', r.oid, 'execute') then
      bloqueada := bloqueada || r.proname || ' ';
    end if;
  end loop;

  if bloqueada <> '' then
    raise exception 'FALHOU: função que a aplicação chama ficou sem EXECUTE: %', bloqueada;
  end if;
  raise notice 'ok: as funções com checagem interna seguem chamáveis pela aplicação';
end $$;

rollback;
