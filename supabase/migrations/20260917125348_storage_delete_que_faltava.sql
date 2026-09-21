-- ============================================================================
-- Exclusão de arquivo nos buckets que só sabiam receber
-- ============================================================================
-- `operacional-docs` e `comercial-docs` têm policy de DELETE desde o começo.
-- `funcionario-docs`, `estoque-docs` e `portal-docs` não tinham nenhuma — dava
-- para anexar ASO, CNH, nota fiscal e documento do portal, e nunca remover
-- pelo sistema. Não é decisão de desenho: é omissão, e só apareceu ao tentar
-- limpar a base para o cliente começar com dados reais.
--
-- O efeito prático do buraco: um documento anexado por engano — CNH do
-- funcionário errado, nota fiscal duplicada — ficava lá para sempre, e a única
-- saída era o painel do Supabase.
--
-- Cada policy espelha a de INSERT do mesmo bucket: quem pode pôr arquivo ali é
-- quem pode tirar. Uma regra diferente para apagar exigiria justificativa que
-- não existe.
-- ============================================================================

drop policy if exists funcionario_docs_delete on storage.objects;
create policy funcionario_docs_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'funcionario-docs'
    and public.has_module_perm('gestao_usuarios', 'excluir')
  );

drop policy if exists estoque_docs_delete on storage.objects;
create policy estoque_docs_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'estoque-docs'
    and public.has_module_perm('estoque', 'excluir')
  );

-- `portal-docs` recebe de três módulos (a policy de INSERT aceita qualquer um
-- dos três), então a de exclusão aceita os mesmos três. Restringir a um só
-- deixaria documento sem dono: quem subiu por Estoque não conseguiria remover.
drop policy if exists portaldocs_admin_delete on storage.objects;
create policy portaldocs_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'portal-docs'
    and (
      public.has_module_perm('gestao_clientes', 'excluir')
      or public.has_module_perm('gestao_usuarios', 'excluir')
      or public.has_module_perm('estoque', 'excluir')
    )
  );
