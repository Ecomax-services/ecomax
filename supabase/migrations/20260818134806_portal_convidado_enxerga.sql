-- Usuário do portal recém-convidado passa a enxergar o próprio cliente.
--
-- `my_portal_cliente_ids()` exigia status = 'ativo', mas o convite grava
-- 'convidado'. O efeito era um portal que aceita o login e mostra tudo zerado —
-- pior que negar o acesso, porque parece defeito do sistema e não falta de
-- permissão, e ninguém sabe o que fazer a respeito.
--
-- Dos três status, só 'inativo' significa acesso revogado. 'convidado' é quem
-- ainda não entrou pela primeira vez, e não há razão para essa pessoa ver menos
-- do que verá cinco minutos depois.
create or replace function public.my_portal_cliente_ids()
returns setof uuid
language sql
stable security definer
set search_path to 'public'
as $$
  select cliente_id from public.cliente_portal_usuarios
  where lower(email) = lower(nullif(auth.jwt()->>'email',''))
    and status <> 'inativo';
$$;
