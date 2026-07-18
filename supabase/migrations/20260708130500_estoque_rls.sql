-- RLS do módulo Estoque: todas as tabelas gated por has_module_perm('estoque', ação).
do $$
declare t text;
begin
  foreach t in array array[
    'bases','fornecedores','produtos','estoque_lotes',
    'movimentacoes','cotacoes','cotacao_respostas','requisicoes'
  ]
  loop
    execute format('create policy %I on public.%I for select to authenticated using (public.has_module_perm(''estoque'',''ler''))', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_module_perm(''estoque'',''criar''))', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_module_perm(''estoque'',''editar'')) with check (public.has_module_perm(''estoque'',''editar''))', t||'_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.has_module_perm(''estoque'',''excluir''))', t||'_delete', t);
  end loop;
end $$;

-- Bucket privado para notas fiscais de recebimento de requisições.
insert into storage.buckets (id, name, public)
values ('estoque-docs', 'estoque-docs', false)
on conflict (id) do nothing;

create policy estoque_docs_read on storage.objects
  for select to authenticated
  using (bucket_id = 'estoque-docs' and public.has_module_perm('estoque', 'ler'));
create policy estoque_docs_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'estoque-docs' and public.has_module_perm('estoque', 'editar'));
