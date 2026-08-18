-- RLS do núcleo de auth. Reconstruída a partir do banco (ver auth_core_schema).

alter table public.profiles enable row level security;
alter table public.perfis_acesso enable row level security;
alter table public.permissoes_modulo enable row level security;

-- profiles: cada um enxerga e edita o próprio registro; admin enxerga todos.
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_self_or_admin on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
create policy profiles_insert_admin on public.profiles
  for insert to authenticated with check (public.is_admin());
create policy profiles_delete_admin on public.profiles
  for delete to authenticated using (public.is_admin());

-- Perfis e permissões são legíveis por qualquer autenticado (o front monta o
-- menu a partir deles), mas só o admin escreve.
create policy perfis_select_authenticated on public.perfis_acesso
  for select to authenticated using (true);
create policy perfis_write_admin on public.perfis_acesso
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy permissoes_select_authenticated on public.permissoes_modulo
  for select to authenticated using (true);
create policy permissoes_write_admin on public.permissoes_modulo
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
