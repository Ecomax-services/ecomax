-- Seed do módulo Estoque (dados de demonstração), derivado do mock data/estoque.ts.

-- Bases
insert into public.bases (nome, cidade, uf, central, ativo, responsavel_id) values
  ('Ecomax Central', 'São Paulo', 'SP', true, true, null),
  ('Base São Paulo', 'São Paulo', 'SP', false, true, (select id from public.funcionarios where cpf = '405.118.227-66')),
  ('Base Rio de Janeiro', 'Rio de Janeiro', 'RJ', false, true, (select id from public.funcionarios where cpf = '512.667.013-29'))
on conflict (nome) do nothing;

-- Fornecedores
insert into public.fornecedores (razao_social, cnpj, email, categoria, avaliacao, ativo) values
  ('Química Brasil Ltda', '12.345.678/0001-90', 'comercial@quimicabrasil.com', 'Químicos', 4.6, true),
  ('PestControl Ltda', '98.765.432/0001-10', 'vendas@pestcontrol.com', 'Químicos', 4.2, true),
  ('AgroDefensivos S.A.', '45.111.222/0001-33', 'contato@agrodef.com', 'Químicos', 3.9, true),
  ('CleanMax Higienização', '77.888.999/0001-44', 'sac@cleanmax.com', 'Desinfetantes', 3.5, false),
  ('SafeWork EPIs', '33.222.111/0001-55', 'vendas@safework.com', 'EPIs', 4.4, true)
on conflict (cnpj) do nothing;

-- Produtos
insert into public.produtos (codigo, nome, categoria, unidade, estoque_min, estoque_max, ativo)
select v.codigo, v.nome, v.categoria, v.unidade, v.min, v.max, v.ativo
from (values
  ('INS-0500','Inseticida Permetrina 500ml','Inseticida','mL',20,120,true),
  ('RAT-0120','Raticida Brodifacoum Blocos','Raticida','kg',15,80,true),
  ('LAR-1000','Larvicida Pyriproxyfen 1L','Larvicida','L',10,60,true),
  ('CUP-0250','Cupinicida Fipronil 250ml','Inseticida','mL',30,120,true),
  ('GEL-0030','Gel Formicida Profissional','Inseticida','un',25,100,true),
  ('DES-5000','Desinfetante Quaternário 5L','Desinfetante','L',12,40,false),
  ('INS-1000','Inseticida Piretroide Concentrado 1L','Inseticida','L',15,70,true),
  ('MOS-5000','Mosquicida Aquoso 5L','Larvicida','L',10,45,true),
  ('ISC-0500','Isca Granulada Formicida 500g','Inseticida','g',100,600,true),
  ('RAT-0210','Raticida Bromadiolona Pellets','Raticida','kg',20,80,true),
  ('ARM-0012','Armadilha Adesiva para Roedores','Equipamento','un',60,400,true),
  ('EST-0025','Estação Porta-Isca Externa','Equipamento','un',30,150,true),
  ('CUP-2000','Cupinicida Injeção Solo 20L','Inseticida','L',8,40,true),
  ('BAC-5000','Bactericida Hospitalar 5L','Desinfetante','L',15,60,true),
  ('FUN-1000','Fungicida de Ambientes 1L','Desinfetante','L',8,30,true),
  ('GEL-0035','Gel Anti-Barata Seringa 35g','Inseticida','un',40,200,true),
  ('EPI-0101','Máscara Respiratória Semifacial (EPI)','EPI','un',40,250,true),
  ('EPI-0210','Macacão Descartável Tyvek (EPI)','EPI','un',50,300,true),
  ('EPI-0330','Luva Nitrílica Química (par)','EPI','par',80,400,true),
  ('EQP-0450','Termonebulizador Portátil (equip.)','Equipamento','un',4,12,true),
  ('EQP-0500','Pulverizador Costal 20L','Equipamento','un',6,25,false)
) as v(codigo, nome, categoria, unidade, min, max, ativo)
on conflict (codigo) do nothing;

-- Vínculo produto → fornecedor principal
update public.produtos set fornecedor_id = (select id from public.fornecedores where razao_social ilike 'Química Brasil%') where codigo in ('INS-0500','LAR-1000','INS-1000','CUP-2000');
update public.produtos set fornecedor_id = (select id from public.fornecedores where razao_social ilike 'PestControl%') where codigo in ('RAT-0120','ISC-0500','RAT-0210','ARM-0012');
update public.produtos set fornecedor_id = (select id from public.fornecedores where razao_social ilike 'AgroDefensivos%') where codigo in ('CUP-0250','MOS-5000','EST-0025','GEL-0035','EQP-0500');
update public.produtos set fornecedor_id = (select id from public.fornecedores where razao_social ilike 'CleanMax%') where codigo in ('DES-5000','BAC-5000','FUN-1000');
update public.produtos set fornecedor_id = (select id from public.fornecedores where razao_social ilike 'SafeWork%') where codigo in ('EPI-0101','EPI-0210','EPI-0330');

-- Lotes de estoque
insert into public.estoque_lotes (produto_id, base_id, lote, validade, quantidade)
select p.id, b.id, v.lote, v.validade::date, v.qtd
from (values
  ('Inseticida Permetrina 500ml','Ecomax Central','LP-2451','2026-08-01',8),
  ('Raticida Brodifacoum Blocos','Ecomax Central','RB-1180','2026-11-01',45),
  ('Larvicida Pyriproxyfen 1L','Ecomax Central','LY-0902','2026-03-01',12),
  ('Cupinicida Fipronil 250ml','Ecomax Central','CF-3320','2027-01-01',140),
  ('Gel Formicida Profissional','Ecomax Central','GF-7711','2027-06-01',60),
  ('Inseticida Piretroide Concentrado 1L','Ecomax Central','PC-4102','2026-09-01',34),
  ('Mosquicida Aquoso 5L','Ecomax Central','MA-2088','2026-04-01',7),
  ('Isca Granulada Formicida 500g','Ecomax Central','IG-5510','2027-12-01',320),
  ('Raticida Bromadiolona Pellets','Ecomax Central','BP-2290','2027-02-01',96),
  ('Fungicida de Ambientes 1L','Ecomax Central','FA-1204','2026-05-01',3),
  ('Inseticida Permetrina 500ml','Base São Paulo','LP-2455','2026-09-01',30),
  ('Gel Formicida Profissional','Base São Paulo','GF-7720','2027-06-01',4),
  ('Raticida Brodifacoum Blocos','Base Rio de Janeiro','RB-1190','2026-10-01',18)
) as v(prod, base, lote, validade, qtd)
join public.produtos p on p.nome = v.prod
join public.bases b on b.nome = v.base
on conflict (produto_id, base_id, lote) do nothing;

-- Movimentações
insert into public.movimentacoes (tipo, produto_id, quantidade, base_origem_id, base_destino_id, descricao)
select v.tipo::public.mov_tipo, p.id, v.qtd, bo.id, bd.id, v.descricao
from (values
  ('saida','Inseticida Permetrina 500ml',2,'Ecomax Central',null,'Saída (consumo OS) · OS #4232'),
  ('transferencia','Raticida Brodifacoum Blocos',10,'Ecomax Central','Base São Paulo','Transferência Central → Base SP'),
  ('entrada','Larvicida Pyriproxyfen 1L',20,null,'Ecomax Central','Entrada (NF 8841) · Química Brasil'),
  ('ajuste','Gel Formicida Profissional',-3,'Ecomax Central',null,'Ajuste manual · Correção de contagem')
) as v(tipo, prod, qtd, orig, dest, descricao)
join public.produtos p on p.nome = v.prod
left join public.bases bo on bo.nome = v.orig
left join public.bases bd on bd.nome = v.dest;

-- Cotações (código explícito; ajusta a sequence depois)
insert into public.cotacoes (codigo, produto_id, quantidade, status) values
  ('COT-0231', (select id from public.produtos where nome ilike 'Inseticida Permetrina%'), '100 mL', 'respondida'),
  ('COT-0229', (select id from public.produtos where nome ilike 'Raticida Brodifacoum%'), '50 kg', 'aguardando'),
  ('COT-0224', (select id from public.produtos where nome ilike 'Larvicida Pyriproxyfen%'), '40 L', 'aprovada')
on conflict (codigo) do nothing;
select setval('public.cotacao_seq', 232, false);

insert into public.cotacao_respostas (cotacao_id, fornecedor_id, valor, prazo, condicao, melhor)
select (select id from public.cotacoes where codigo = 'COT-0231'), f.id, v.valor, v.prazo, v.condicao, v.melhor
from (values
  ('Química Brasil%', 1180, '5 dias', '30 dias', true),
  ('AgroDefensivos%', 1340, '3 dias', 'À vista', false),
  ('PestControl%', 1420, '7 dias', '28 dias', false)
) as v(forn, valor, prazo, condicao, melhor)
join public.fornecedores f on f.razao_social ilike v.forn;

-- Requisições (código explícito; ajusta a sequence depois)
insert into public.requisicoes (codigo, produto_id, fornecedor_id, quantidade, valor, status) values
  ('REQ-0142', (select id from public.produtos where nome ilike 'Inseticida Permetrina%'), (select id from public.fornecedores where razao_social ilike 'Química Brasil%'), '100 mL', 1180, 'aguardando_aprovacao'),
  ('REQ-0140', (select id from public.produtos where nome ilike 'Raticida Brodifacoum%'), (select id from public.fornecedores where razao_social ilike 'PestControl%'), '50 kg', 2050, 'aprovada'),
  ('REQ-0138', (select id from public.produtos where nome ilike 'Larvicida Pyriproxyfen%'), (select id from public.fornecedores where razao_social ilike 'Química Brasil%'), '40 L', 980, 'enviada'),
  ('REQ-0131', (select id from public.produtos where nome ilike 'Desinfetante Quaternário%'), (select id from public.fornecedores where razao_social ilike 'CleanMax%'), '60 L', 1560, 'recebida')
on conflict (codigo) do nothing;
select setval('public.requisicao_seq', 143, false);
