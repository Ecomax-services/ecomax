-- A lista de produtos lê `vw_produtos`, não a tabela. Sem projetar a coluna
-- nova, o campo Observações gravava e voltava vazio ao reabrir a ficha — o
-- mesmo sintoma de campo morto que a coluna veio corrigir.
--
-- `observacao` entra no fim: `create or replace view` não aceita inserir coluna
-- no meio da lista, renomeia as seguintes e recusa.
create or replace view vw_produtos as
 select p.id,
    p.codigo,
    p.nome,
    p.categoria,
    p.unidade,
    p.estoque_min,
    p.estoque_max,
    p.fornecedor_id,
    p.ativo,
    p.created_at,
    p.updated_at,
    f.razao_social as fornecedor_razao,
    coalesce(( select sum(l.quantidade) as sum
           from estoque_lotes l
          where l.produto_id = p.id), 0::numeric) as estoque_total,
    p.observacao
   from produtos p
     left join fornecedores f on f.id = p.fornecedor_id;
