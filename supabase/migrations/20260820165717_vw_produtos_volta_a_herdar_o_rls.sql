-- Regressão de segurança introduzida em 20260819232431, que recriou
-- `vw_produtos` para expor `observacao`:
--
--   create or replace view vw_produtos as ...
--
-- sem repetir o `with (security_invoker = true)` que a view tinha desde
-- 20260716130258. `CREATE OR REPLACE VIEW` substitui as opções pelas
-- fornecidas — e nenhuma foi fornecida, então a opção sumiu.
--
-- Sem `security_invoker`, a view executa com os privilégios de quem a criou
-- (postgres) e **ignora o RLS das tabelas de base**. Como `authenticated` tem
-- select nela, qualquer sessão — cliente do Portal, operador em campo — lia o
-- catálogo inteiro de produtos e os saldos, contornando as policies de
-- `produtos` e `estoque_lotes`.
--
-- `vw_bases` e `vw_fornecedores` nunca perderam a opção; são a prova de que o
-- desenho certo já estava no projeto.

alter view public.vw_produtos set (security_invoker = true);
