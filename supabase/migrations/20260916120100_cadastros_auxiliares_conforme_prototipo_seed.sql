-- ============================================================================
-- Conteúdo inicial dos catálogos que o protótipo tem e o sistema não tinha
-- ============================================================================
-- Vive em migration, e não no seed de QA, pelo mesmo motivo dos outros
-- `*_seed.sql`: são dados de referência que o sistema precisa para funcionar,
-- inclusive em produção. Tudo idempotente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tipos de produto
-- ----------------------------------------------------------------------------
-- O protótipo lista este catálogo separado de "Categorias de produto": a
-- categoria diz onde o item fica no almoxarifado (Químicos, Equipamentos,
-- EPIs); o tipo diz o que ele faz (Inseticida, Raticida). São eixos diferentes
-- e o desenho mostra os dois.
insert into public.catalogo_itens (catalogo, nome, valor, ordem, ativo)
values
  ('tipos_produto', 'Inseticida',   'inseticida',   1, true),
  ('tipos_produto', 'Raticida',     'raticida',     2, true),
  ('tipos_produto', 'Larvicida',    'larvicida',    3, true),
  ('tipos_produto', 'Cupinicida',   'cupinicida',   4, true),
  ('tipos_produto', 'Desinfetante', 'desinfetante', 5, true),
  ('tipos_produto', 'Fungicida',    'fungicida',    6, true)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Categorias de relatório
-- ----------------------------------------------------------------------------
insert into public.catalogo_itens (catalogo, nome, valor, ordem, ativo)
values
  ('categorias_relatorio', 'Estoque',                  'estoque',     1, true),
  ('categorias_relatorio', 'Movimentações',            'movimentacoes', 2, true),
  ('categorias_relatorio', 'Produtos',                 'produtos',    3, true),
  ('categorias_relatorio', 'Operacional',              'operacional', 4, true),
  ('categorias_relatorio', 'Comercial',                'comercial',   5, true),
  ('categorias_relatorio', 'Financeiro',               'financeiro',  6, true),
  ('categorias_relatorio', 'Sugestões de melhoria',    'sugestoes',   7, false)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Planilha de execução por tipo de serviço
-- ----------------------------------------------------------------------------
-- As legendas do protótipo, adaptadas aos tipos de serviço que existem de
-- verdade no catálogo `tipos_servico` — o desenho usou nomes de exemplo
-- ("Dedetização", "Praga de Grãos") que não são os nossos.
--
-- Cada conjunto é diferente de propósito: o que se registra num ponto de
-- controle de roedores não é o que se registra numa sanitização. Era essa a
-- razão de a planilha ser "por tipo de serviço" e não uma lista única.
insert into public.planilha_itens (tipo_servico, nome, cor_bg, cor_fg, ordem, ativo)
values
  ('Desinsetização', 'Aplicado',                '#d3f7d3', '#155015', 1, true),
  ('Desinsetização', 'Reaplicação necessária',  '#fdebd0', '#b45309', 2, true),
  ('Desinsetização', 'Área bloqueada',          '#e8eefc', '#3056b5', 3, true),
  ('Desinsetização', 'Sem acesso ao ponto',     '#eeeff1', '#686f7d', 4, true),
  ('Desinsetização', 'Não executado',           '#ffddd5', '#a81400', 5, true),

  ('Desratização',   'Sem consumo',             '#d3f7d3', '#155015', 1, true),
  ('Desratização',   'Consumo parcial',         '#fdebd0', '#b45309', 2, true),
  ('Desratização',   'Consumo total',           '#ffddd5', '#a81400', 3, true),
  ('Desratização',   'Isca íntegra',            '#e8eefc', '#3056b5', 4, true),
  ('Desratização',   'Dispositivo avariado',    '#eeeff1', '#686f7d', 5, true),

  ('Descupinização', 'Sem infestação',          '#d3f7d3', '#155015', 1, true),
  ('Descupinização', 'Infestação baixa',        '#fdebd0', '#b45309', 2, true),
  ('Descupinização', 'Infestação alta',         '#ffddd5', '#a81400', 3, true),
  ('Descupinização', 'Barreira aplicada',       '#e8eefc', '#3056b5', 4, true),

  ('Sanitização',    'Executado',               '#d3f7d3', '#155015', 1, true),
  ('Sanitização',    'Executado parcialmente',  '#fdebd0', '#b45309', 2, true),
  ('Sanitização',    'Área não liberada',       '#ffddd5', '#a81400', 3, true)
on conflict (tipo_servico, nome) do nothing;

-- ----------------------------------------------------------------------------
-- Produtos padrão por tipo de serviço
-- ----------------------------------------------------------------------------
-- Ligados por NOME, não por id: ids de produto variam entre ambientes, e uma
-- migration com uuid fixo quebra no próximo `db reset`. O `join` também faz o
-- vínculo simplesmente não existir onde o produto não existe, em vez de falhar.
insert into public.tipo_servico_produtos (tipo_servico, produto_id, qtd_padrao)
select v.tipo, p.id, v.qtd
  from (values
    ('Desinsetização', 'Inseticida Permetrina 500ml',    2),
    ('Desinsetização', 'Gel Formicida Profissional',     1),
    ('Desratização',   'Raticida Brodifacoum Blocos',    3),
    ('Desratização',   'Armadilha Adesiva para Roedores', 10),
    ('Descupinização', 'Cupinicida Fipronil 250ml',      2),
    ('Sanitização',    'Bactericida Hospitalar 5L',      3)
  ) as v(tipo, produto, qtd)
  join public.produtos p on p.nome = v.produto
on conflict (tipo_servico, produto_id) do nothing;
