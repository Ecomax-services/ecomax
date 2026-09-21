-- ============================================================================
-- Limpeza dos dados de teste, antes do cadastro real
-- ============================================================================
-- Operação única, pedida pelo cliente em 17/09/2026: o sistema saiu da fase de
-- demonstração e ia começar a receber produtos, clientes e OS de verdade.
--
-- Estas quatro tabelas não têm policy de DELETE de propósito. Inventário e
-- transferência são cancelados pelo aplicativo, nunca apagados, e a auditoria é
-- append-only — apagar linha de auditoria é justamente o que ela existe para
-- impedir. Por isso a remoção precisou do papel elevado, fora do caminho normal
-- do produto.
--
-- NUM BANCO RECRIADO DO ZERO ISTO NÃO FAZ NADA, e não é uma esperança: nenhuma
-- migration insere linha em `inventario_itens`, `inventarios`, `transferencias`
-- ou `auditoria`. A única escrita em `transferencias` dentro das migrations
-- está no corpo de uma função, que só roda quando alguém transfere estoque.
--
-- O arquivo existe porque a operação foi registrada no histórico de migrations
-- do projeto. Sem ele aqui, `supabase db push` recusa qualquer migration nova,
-- alegando versão remota sem correspondente local.
-- ============================================================================

delete from public.inventario_itens;
delete from public.inventarios;
delete from public.transferencias;
delete from public.auditoria;
