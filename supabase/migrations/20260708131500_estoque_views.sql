-- Views auxiliares (security_invoker → herdam o RLS das tabelas base).

create or replace view public.vw_produtos with (security_invoker = true) as
select p.*,
  f.razao_social as fornecedor_razao,
  coalesce((select sum(l.quantidade) from public.estoque_lotes l where l.produto_id = p.id), 0) as estoque_total
from public.produtos p
left join public.fornecedores f on f.id = p.fornecedor_id;

create or replace view public.vw_fornecedores with (security_invoker = true) as
select f.*,
  coalesce((select count(*) from public.produtos p where p.fornecedor_id = f.id), 0) as num_produtos,
  coalesce((select sum(r.valor) from public.requisicoes r where r.fornecedor_id = f.id and r.status = 'recebida'), 0) as compras_total
from public.fornecedores f;

create or replace view public.vw_bases with (security_invoker = true) as
select b.*,
  fu.nome_completo as responsavel_nome,
  coalesce((select count(distinct l.produto_id) from public.estoque_lotes l where l.base_id = b.id), 0) as num_produtos,
  coalesce((select sum(l.quantidade) from public.estoque_lotes l where l.base_id = b.id), 0) as itens_total
from public.bases b
left join public.funcionarios fu on fu.id = b.responsavel_id;
