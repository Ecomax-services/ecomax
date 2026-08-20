-- "Último login" era `value="—"` escrito no JSX: nunca leu nada, para ninguém.
-- O dado vive em `auth.users.last_sign_in_at`, que o cliente não lê.
--
-- Substitui `acesso_bloqueado` em vez de somar uma segunda função: as duas
-- responderiam sobre o mesmo acesso, e é assim que uma passa a ser esquecida
-- quando a regra muda. Continua devolvendo só o necessário — nada de token,
-- senha ou metadado de autenticação.
create or replace function acesso_status(_profile_id uuid)
returns table (bloqueado boolean, ultimo_login timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not has_module_perm('gestao_usuarios', 'ler') then
    raise exception 'Sem permissão para consultar acessos.' using errcode = '42501';
  end if;

  if _profile_id is null then
    return query select false, null::timestamptz;
    return;
  end if;

  return query
  select coalesce(u.banned_until > now(), false), u.last_sign_in_at
    from auth.users u
   where u.id = _profile_id;
end;
$$;

revoke all on function acesso_status(uuid) from public;
grant execute on function acesso_status(uuid) to authenticated;

drop function if exists acesso_bloqueado(uuid);
