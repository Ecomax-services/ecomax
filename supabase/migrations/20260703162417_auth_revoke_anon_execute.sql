-- Tira do anônimo (e do PUBLIC) o direito de executar as funções de RBAC.
--
-- Por padrão o Postgres concede EXECUTE a PUBLIC em toda função criada. Como
-- estas são SECURITY DEFINER e leem profiles, deixá-las abertas ao papel `anon`
-- permitiria sondar o estado de contas sem estar autenticado.
-- ACLs conferidas no banco em 2026-08-17.

revoke execute on function public.current_user_role() from anon, public;
grant  execute on function public.current_user_role() to authenticated, service_role;

revoke execute on function public.is_admin() from anon, public;
grant  execute on function public.is_admin() to authenticated, service_role;

revoke execute on function public.has_app_access(public.app_key) from anon, public;
grant  execute on function public.has_app_access(public.app_key) to authenticated, service_role;

-- handle_new_user só roda pelo trigger (contexto do owner); ninguém precisa chamá-la.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
grant  execute on function public.handle_new_user() to service_role;
