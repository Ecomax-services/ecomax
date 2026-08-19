-- Catálogos que a grade do orçamento e o fluxo da OS consomem.
-- Os 4 status novos entram aqui porque a tela lê rótulo e cor do catálogo:
-- sem estas linhas o chip da OS aparece sem cor para metade dos estados.

insert into public.catalogo_itens (catalogo, nome, ordem, ativo) values
  ('tipos_controle', 'Armadilha Luminosa',     1, true),
  ('tipos_controle', 'Controle Roedores',      2, true),
  ('tipos_controle', 'Globo de Moscas',        3, true),
  ('tipos_controle', 'Praga de Grãos',         4, true),
  ('tipos_controle', 'Monitoramento de Áreas', 5, true),
  ('tipos_controle', 'Caixa D''água',          6, true),

  ('frequencias', 'Mensal',     1, true),
  ('frequencias', 'Bimestral',  2, true),
  ('frequencias', 'Trimestral', 3, true),
  ('frequencias', 'Semestral',  4, true),
  ('frequencias', 'Anual',      5, true),

  ('etapas_os', 'Planejamento', 1, true),
  ('etapas_os', 'Execução',     2, true),
  ('etapas_os', 'Revisão',      3, true)
on conflict (catalogo, nome) do nothing;

insert into public.catalogo_itens (catalogo, nome, ordem, ativo, cor_bg, cor_fg) values
  ('status_os', 'Emitida',       2, true, '#e8eefc', '#3056b5'),
  ('status_os', 'Confirmada',    3, true, '#e8eefc', '#3056b5'),
  ('status_os', 'Remarcada',     7, true, '#fdebd0', '#b45309'),
  ('status_os', 'Não executada', 8, true, '#eeeff1', '#5b6470')
on conflict (catalogo, nome) do nothing;
