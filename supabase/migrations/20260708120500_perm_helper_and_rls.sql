-- Helper de permissão por módulo (espelha o can() do front) + RLS de funcionarios/auditoria + storage.

create or replace function public.has_module_perm(_modulo public.module_key, _acao text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.profiles p
    join public.permissoes_modulo pm on pm.perfil_acesso_id = p.perfil_acesso_id
    where p.id = auth.uid()
      and pm.modulo = _modulo
      and case _acao
        when 'ler' then pm.pode_ler
        when 'criar' then pm.pode_criar
        when 'editar' then pm.pode_editar
        when 'excluir' then pm.pode_excluir
        else false
      end
  );
$$;

revoke execute on function public.has_module_perm(public.module_key, text) from anon, public;
grant execute on function public.has_module_perm(public.module_key, text) to authenticated;

-- RLS: funcionarios
create policy funcionarios_select on public.funcionarios
  for select to authenticated using (public.has_module_perm('gestao_usuarios', 'ler'));
create policy funcionarios_insert on public.funcionarios
  for insert to authenticated with check (public.has_module_perm('gestao_usuarios', 'criar'));
create policy funcionarios_update on public.funcionarios
  for update to authenticated
  using (public.has_module_perm('gestao_usuarios', 'editar'))
  with check (public.has_module_perm('gestao_usuarios', 'editar'));
create policy funcionarios_delete on public.funcionarios
  for delete to authenticated using (public.has_module_perm('gestao_usuarios', 'excluir'));

-- RLS: auditoria (leitura por quem lê o módulo; inserção só do próprio actor)
create policy auditoria_select on public.auditoria
  for select to authenticated using (public.has_module_perm('gestao_usuarios', 'ler'));
create policy auditoria_insert on public.auditoria
  for insert to authenticated
  with check (actor_id = auth.uid() and public.has_module_perm('gestao_usuarios', 'ler'));

-- Storage: bucket privado para documentos/foto dos funcionários
insert into storage.buckets (id, name, public)
values ('funcionario-docs', 'funcionario-docs', false)
on conflict (id) do nothing;

create policy funcionario_docs_read on storage.objects
  for select to authenticated
  using (bucket_id = 'funcionario-docs' and public.has_module_perm('gestao_usuarios', 'ler'));
create policy funcionario_docs_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'funcionario-docs' and public.has_module_perm('gestao_usuarios', 'criar'));
create policy funcionario_docs_update on storage.objects
  for update to authenticated
  using (bucket_id = 'funcionario-docs' and public.has_module_perm('gestao_usuarios', 'editar'));
