-- O cliente enxerga quem foi escalado nas OS dele.
--
-- Faltava para a tela Colaboradores conseguir se restringir a essas pessoas.
-- Sem isto a consulta tinha de pedir `funcionarios` solto, e aí a policy
-- `funcionarios_self_select` (profile_id = auth.uid()) entrava em cena e o
-- próprio usuário do portal aparecia na lista de colaboradores da Ecomax —
-- porque a conta dele nasce com uma linha em `funcionarios`, criada pela tela
-- de Gestão de Usuários.
--
-- Aquela policy está certa e é necessária: é dela que a tela Perfil do app do
-- operador depende. O que faltava era o vínculo explícito, para a consulta
-- poder pedir "os escalados nas minhas OS" em vez de "todos que eu enxergo".

create policy osfunc_portal_select on public.os_funcionarios
  for select to authenticated
  using (public.os_is_my_cliente(os_id));
