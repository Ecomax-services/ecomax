-- O teste `views_herdam_rls.sql` falhou no CI com
--
--     ERROR: permission denied for view vw_produtos
--
-- e o que ele encontrou não foi o defeito que procurava: foi uma divergência
-- entre o banco remoto e um banco recriado a partir das migrations.
--
-- No remoto as três views têm ACL completo para anon, authenticated e
-- service_role — os privilégios padrão que o Supabase aplica ao objeto criado
-- pela CLI. Nenhuma migration concede isso, então `db reset` produz views que
-- ninguém consegue ler, e o Backoffice inteiro pararia num banco recriado do
-- zero. O job que compara schema não pegava: `db diff` não olha grants.
--
-- Aproveitando para estreitar em vez de copiar o que estava lá:
--
--   authenticated  precisa de SELECT — é como o Backoffice lê Produtos, Bases e
--                  Fornecedores. Só SELECT: as três têm agregação e não são
--                  atualizáveis, então insert/update/delete no ACL eram enfeite.
--   anon           não precisa de nada. Sem sessão, `auth.uid()` é null e o RLS
--                  já devolveria vazio — mas não há motivo para a porta existir.

revoke all on public.vw_produtos     from anon;
revoke all on public.vw_bases        from anon;
revoke all on public.vw_fornecedores from anon;

revoke all on public.vw_produtos     from authenticated;
revoke all on public.vw_bases        from authenticated;
revoke all on public.vw_fornecedores from authenticated;

grant select on public.vw_produtos     to authenticated;
grant select on public.vw_bases        to authenticated;
grant select on public.vw_fornecedores to authenticated;
