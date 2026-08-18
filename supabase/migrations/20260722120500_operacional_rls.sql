-- RLS do módulo Operacional: tudo gated por has_module_perm('operacional', ação).
do $$
declare t text;
begin
  foreach t in array array[
    'ordens_servico','os_funcionarios','os_produtos','os_equipamentos',
    'os_relatorios','os_anexos','os_historico','os_cronograma'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.has_module_perm(''operacional'',''ler''))', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_module_perm(''operacional'',''criar''))', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_module_perm(''operacional'',''editar'')) with check (public.has_module_perm(''operacional'',''editar''))', t||'_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.has_module_perm(''operacional'',''excluir''))', t||'_delete', t);
  end loop;
end $$;

-- Storage: documentos da OS (bucket privado 'operacional-docs').
create policy operacional_docs_read on storage.objects
  for select to authenticated
  using (bucket_id = 'operacional-docs' and public.has_module_perm('operacional', 'ler'));
create policy operacional_docs_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'operacional-docs' and public.has_module_perm('operacional', 'criar'));
create policy operacional_docs_update on storage.objects
  for update to authenticated
  using (bucket_id = 'operacional-docs' and public.has_module_perm('operacional', 'editar'));
create policy operacional_docs_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'operacional-docs' and public.has_module_perm('operacional', 'excluir'));
