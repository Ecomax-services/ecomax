-- Liga o profile ao perfil de acesso.
--
-- A coluna nasce em auth_core_schema sem FK (perfis_acesso é populada só no
-- seed); aqui a integridade é fechada. ON DELETE SET NULL para que apagar um
-- perfil não apague usuários — eles ficam sem matriz até serem reatribuídos.

alter table public.profiles
  add constraint profiles_perfil_acesso_id_fkey
  foreign key (perfil_acesso_id) references public.perfis_acesso(id) on delete set null;
