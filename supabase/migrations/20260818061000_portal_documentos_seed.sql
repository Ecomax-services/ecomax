-- Catálogos dos dois módulos novos.
--
-- Entram como catálogo, e não como check constraint, porque é assim que o resto
-- do sistema trata lista de valores: `catalogo_itens.catalogo` é texto livre e
-- a tela de Configurações é a fonte da verdade. Uma norma nova (NR-6, NR-12) vai
-- ser cadastrada pela tela, sem migration e sem deploy.

insert into public.catalogo_itens (catalogo, nome, ordem, ativo)
values
  ('categorias_documento_cliente', 'Manual do Usuário',           1, true),
  ('categorias_documento_cliente', 'Procedimentos Operacionais',  2, true),
  ('categorias_documento_cliente', 'Registros e Licenças',        3, true),
  ('categorias_documento_cliente', 'SSMA',                        4, true),

  ('documentos_colaborador', 'Capacitação Técnica', 1, true),
  ('documentos_colaborador', 'ASO',                 2, true),
  ('documentos_colaborador', 'EPIs',                3, true),
  ('documentos_colaborador', 'NR33',                4, true),
  ('documentos_colaborador', 'NR35',                5, true),
  ('documentos_colaborador', 'NR1',                 6, true),
  -- Não está na matriz do design, mas já existe como coluna em funcionarios e
  -- foi migrada para funcionario_documentos. Sem a linha aqui, o valor apareceria
  -- na tabela sem constar do catálogo.
  ('documentos_colaborador', 'CNH',                 7, true)
on conflict (catalogo, nome) do nothing;
