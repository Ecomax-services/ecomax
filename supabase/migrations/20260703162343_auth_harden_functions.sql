-- Endurecimento das funções de RBAC: SECURITY DEFINER com search_path fixo.
--
-- Sem `set search_path`, uma função SECURITY DEFINER pode ser induzida a
-- resolver nomes em um schema controlado pelo chamador. As definições em
-- auth_functions_and_triggers já nascem endurecidas (foram reconstruídas do
-- banco, que está no estado final); estes ALTERs mantêm a garantia explícita e
-- são idempotentes.

alter function public.current_user_role() security definer set search_path to '';
alter function public.is_admin() security definer set search_path to '';
alter function public.has_app_access(public.app_key) security definer set search_path to '';
alter function public.handle_new_user() security definer set search_path to '';
alter function public.apps_for_role(public.user_role) set search_path to '';
alter function public.set_updated_at() set search_path to '';
