-- O Backoffice bloqueia o login de um funcionário (ban em auth.users), mas nunca
-- conseguia saber se alguém estava bloqueado: a tela só checava se existe
-- credencial e mostrava "Com acesso" para sempre. Sem esse estado não havia como
-- oferecer "Desbloquear" — quem bloqueasse por engano ficava sem desfazer.
--
-- O cliente não lê `auth.users` (o schema não é exposto), daí a função: devolve
-- só o booleano, nada de dado de autenticação.
create or replace function acesso_bloqueado(_profile_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ate timestamptz;
begin
  if not has_module_perm('gestao_usuarios', 'ler') then
    raise exception 'Sem permissão para consultar acessos.' using errcode = '42501';
  end if;
  if _profile_id is null then return false; end if;

  select u.banned_until into v_ate from auth.users u where u.id = _profile_id;
  return coalesce(v_ate > now(), false);
end;
$$;

revoke all on function acesso_bloqueado(uuid) from public;
grant execute on function acesso_bloqueado(uuid) to authenticated;
