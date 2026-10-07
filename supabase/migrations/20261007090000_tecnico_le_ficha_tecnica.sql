-- ============================================================================
-- O técnico abre a ficha técnica do produto em campo
-- ============================================================================
-- A etapa 1 da execução no App (aprovada em 28/09) lista as fichas técnicas
-- dos produtos. Elas ficam no bucket `portal-docs`, em `produto/<id>/…`, e
-- hoje só o escritório e o cliente as leem: o técnico, que é quem manuseia o
-- produto, tomava acesso negado.
--
-- Libera a leitura ao técnico dos produtos que ele pode usar — os previstos
-- nas OS dele e os que têm lote na base dele (as mesmas duas listas do App).
-- Só leitura, e só do escopo `produto`: documento de cliente e de
-- colaborador continuam fora.
-- ============================================================================

create policy portaldocs_tecnico_produto_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'portal-docs'
    and public.portal_doc_escopo(name) = 'produto'
    and (
      public.produto_in_my_os(public.portal_doc_id(name))
      or exists (
        select 1 from public.estoque_lotes l
         where l.produto_id = public.portal_doc_id(name)
           and l.base_id = public.minha_base_id()
      )
    )
  );
