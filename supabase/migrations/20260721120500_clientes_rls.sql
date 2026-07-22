-- RLS do módulo Gestão de Clientes: tudo gated por has_module_perm('gestao_clientes', ação).
do $$
declare t text;
begin
  foreach t in array array[
    'clientes','cliente_contatos','cliente_portal_usuarios',
    'cliente_funcionarios','orcamentos','cliente_produtos_homologados'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.has_module_perm(''gestao_clientes'',''ler''))', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_module_perm(''gestao_clientes'',''criar''))', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_module_perm(''gestao_clientes'',''editar'')) with check (public.has_module_perm(''gestao_clientes'',''editar''))', t||'_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.has_module_perm(''gestao_clientes'',''excluir''))', t||'_delete', t);
  end loop;
end $$;
