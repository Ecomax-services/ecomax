-- Seed dos 12 catálogos auxiliares. Idempotente por unique(catalogo, nome).
insert into public.catalogo_itens (catalogo, nome, cor_bg, cor_fg, ativo, ordem) values
  -- 1. Status de OS (com cor)
  ('status_os','Em aberto','#e8eefc','#3056b5',true,1),
  ('status_os','Em andamento','#fdebd0','#b45309',true,2),
  ('status_os','Executada','#d3f7d3','#155015',true,3),
  ('status_os','Concluída','#a3eba3','#0f3f0f',true,4),
  ('status_os','Cancelada','#ffddd5','#a81400',true,5),
  -- 2. Status de garantia (com cor)
  ('status_garantia','Vigente','#d3f7d3','#155015',true,1),
  ('status_garantia','A vencer','#fdebd0','#b45309',true,2),
  ('status_garantia','Expirada','#ffddd5','#a81400',true,3)
on conflict (catalogo, nome) do nothing;

insert into public.catalogo_itens (catalogo, nome, ativo, ordem) values
  -- 3. Tipos de documento
  ('tipos_documento','Relatório técnico',true,1),
  ('tipos_documento','Certificado de execução',true,2),
  ('tipos_documento','Mapeamento',true,3),
  ('tipos_documento','Cronograma',false,4),
  -- 4. Tipos de produto (catálogo gerenciável; consumidor futuro)
  ('tipos_produto','Inseticida',true,1),
  ('tipos_produto','Raticida',true,2),
  ('tipos_produto','Larvicida',true,3),
  ('tipos_produto','Desinfetante',true,4),
  -- 5. Categorias de produto (consumido por produtos.categoria — valores reais)
  ('categorias_produto','Inseticida',true,1),
  ('categorias_produto','Raticida',true,2),
  ('categorias_produto','Larvicida',true,3),
  ('categorias_produto','Desinfetante',true,4),
  ('categorias_produto','Equipamento',true,5),
  ('categorias_produto','EPI',true,6),
  -- 6. Unidades de medida (consumido por produtos.unidade — valores literais)
  ('unidades','L',true,1),
  ('unidades','mL',true,2),
  ('unidades','kg',true,3),
  ('unidades','g',true,4),
  ('unidades','un',true,5),
  ('unidades','par',true,6),
  -- 8. Setores (consumido por funcionarios.setor)
  ('setores','Operações',true,1),
  ('setores','Comercial',true,2),
  ('setores','Administrativo',true,3),
  ('setores','Almoxarifado',true,4),
  -- 9. Cargos (consumido por funcionarios.cargo)
  ('cargos','Técnico de Campo',true,1),
  ('cargos','Supervisora',true,2),
  ('cargos','Analista Admin.',true,3),
  ('cargos','Almoxarife',true,4),
  ('cargos','Gestora Operacional',true,5),
  -- 10. Motivos de ajuste de estoque (consumido pelo Ajuste manual)
  ('motivos_ajuste','Correção de contagem',true,1),
  ('motivos_ajuste','Perda / avaria',true,2),
  ('motivos_ajuste','Vencimento',true,3),
  ('motivos_ajuste','Devolução',true,4),
  -- 11. Pragas-alvo
  ('pragas','Baratas',true,1),
  ('pragas','Roedores',true,2),
  ('pragas','Cupins',true,3),
  ('pragas','Mosquitos',true,4),
  -- 12. EPIs
  ('epis','Máscara respiratória',true,1),
  ('epis','Luvas nitrílicas',true,2),
  ('epis','Óculos de proteção',true,3),
  ('epis','Macacão impermeável',true,4)
on conflict (catalogo, nome) do nothing;

-- 7. Tipos de serviço (com template e prazo padrão do link público)
insert into public.catalogo_itens (catalogo, nome, ativo, ordem, prazo_padrao) values
  ('tipos_servico','Desinsetização',true,1,7),
  ('tipos_servico','Desratização',true,2,7),
  ('tipos_servico','Descupinização',true,3,15),
  ('tipos_servico','Sanitização',true,4,5)
on conflict (catalogo, nome) do nothing;
