-- Seed de clientes (apenas se a tabela estiver vazia)
insert into public.clientes (nome, razao_social, tipo_pessoa, cnpj, cpf, regiao, logradouro, numero, cidade, uf, email, telefone, ativo)
select * from (values
  ('Supermercado BomPreço','BomPreço Comércio de Alimentos Ltda','pj','12.345.678/0001-90',null,'Zona Sul','Av. Paulista','1200','São Paulo','SP','contato@bompreco.com','(11) 3333-1000',true),
  ('Restaurante Sabor & Cia','Sabor e Cia Refeições Ltda','pj','23.456.789/0001-01',null,'Centro','Rua Augusta','540','São Paulo','SP','contato@saborecia.com','(11) 3333-2000',true),
  ('Padaria Pão Nosso','Pão Nosso Panificadora ME','pj','34.567.890/0001-12',null,'Zona Norte','Av. Braz Leme','88','São Paulo','SP','contato@paonosso.com','(11) 3333-3000',true),
  ('João Batista Silva',null,'pf',null,'321.654.987-00','Zona Leste','Rua das Flores','45','São Paulo','SP','joao.silva@email.com','(11) 98888-0001',true),
  ('Hospital Vida Plena','Vida Plena Serviços Hospitalares S.A.','pj','45.678.901/0001-23',null,'Zona Oeste','Av. Sumaré','2100','São Paulo','SP','contato@vidaplena.com','(11) 3333-4000',true),
  ('Colégio Novo Saber','Instituto Novo Saber Educacional Ltda','pj','56.789.012/0001-34',null,'Centro','Rua Sete de Abril','300','São Paulo','SP','contato@novosaber.com','(11) 3333-5000',true),
  ('Frigorífico Boi Forte','Boi Forte Frigorífico Ltda','pj','67.890.123/0001-45',null,'Zona Sul','Rod. Anchieta km 18',null,'São Bernardo','SP','contato@boiforte.com','(11) 3333-6000',true),
  ('Maria Aparecida Costa',null,'pf',null,'147.258.369-11','Zona Norte','Rua Voluntários','720','São Paulo','SP','maria.costa@email.com','(11) 98888-0002',true)
) as v(nome, razao_social, tipo_pessoa, cnpj, cpf, regiao, logradouro, numero, cidade, uf, email, telefone, ativo)
where not exists (select 1 from public.clientes);

with c as (select id from public.clientes where nome = 'Supermercado BomPreço' limit 1)
insert into public.cliente_contatos (cliente_id, tipo, nome, telefone, email, recebe_email, rel_tecnica, padrao, ativo)
select c.id, v.tipo, v.nome, v.telefone, v.email, v.recebe, v.rel, v.padrao, true from c, (values
  ('contato','Roberto Alves (Compras)',null,'roberto@bompreco.com',true,false,true),
  ('contato','Fernanda Lima (Qualidade)',null,'fernanda@bompreco.com',true,true,false),
  ('telefone','Recepção','(11) 3333-1000',null,false,false,false)
) as v(tipo, nome, telefone, email, recebe, rel, padrao)
where exists (select 1 from c) and not exists (select 1 from public.cliente_contatos);

with c as (select id from public.clientes where nome = 'Supermercado BomPreço' limit 1)
insert into public.orcamentos (cliente_id, status, observacao, valor_total)
select c.id, v.status, v.obs, v.valor from c, (values
  ('aprovado','Controle mensal de pragas — lojas 1 e 2', 4800),
  ('em_elaboracao','Proposta desratização anual', 12500)
) as v(status, obs, valor)
where exists (select 1 from c) and not exists (select 1 from public.orcamentos);

with c as (select id from public.clientes where nome = 'Supermercado BomPreço' limit 1)
insert into public.cliente_portal_usuarios (cliente_id, nome, email, perfil, status)
select c.id, 'Roberto Alves', 'roberto@bompreco.com', 'Gestor do cliente', 'ativo' from c
where exists (select 1 from c) and not exists (select 1 from public.cliente_portal_usuarios);

with c as (select id from public.clientes where nome = 'Supermercado BomPreço' limit 1),
     p as (select id from public.produtos where ativo order by nome limit 2)
insert into public.cliente_produtos_homologados (cliente_id, produto_id, validade)
select c.id, p.id, current_date + interval '180 days' from c, p
where exists (select 1 from c) and not exists (select 1 from public.cliente_produtos_homologados);
