-- Remove do histórico de migrations as entradas que nunca foram schema.
--
-- Ao verificar o módulo Comercial usei `apply_migration` para inserir dados de
-- demonstração, rodar o alerta e limpar depois. Cada chamada virou uma versão no
-- histórico remoto sem arquivo correspondente no repositório — o mesmo drift que
-- a reconciliação do F1 resolveu, recriado por mim.
--
-- Não há nada a preservar: são operações sobre dados, já desfeitas. A entrada
-- `comercial_seed_desativa_status_antigos` também sai, porque seu conteúdo vive
-- dentro do arquivo local de seed, como uma migration só.
--
-- Num banco criado do zero isto é inofensivo: apaga zero linhas, porque nenhum
-- desses nomes existe.
delete from supabase_migrations.schema_migrations
where name in (
  'comercial_dados_demo_qa',
  'comercial_garantia_demo_vencendo',
  'teste_alerta_60_dias_primeira_execucao',
  'teste_alerta_60_dias_segunda_execucao',
  'limpeza_dados_demo_comercial',
  'limpeza_contas_teste_portal',
  'comercial_seed_desativa_status_antigos'
);
