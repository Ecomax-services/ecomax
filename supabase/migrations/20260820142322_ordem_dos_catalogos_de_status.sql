-- A `ordem` do catálogo é o que decide em que sequência os status aparecem em
-- Configurações e — desde que os seletores do Comercial passaram a ler o
-- catálogo — nos filtros dos módulos. Ela contradizia o fluxo real:
--
--   status_os      · "Em andamento" (2) vinha antes de "Emitida" e "Confirmada",
--                    e havia dois pares empatados (2 e 3), então a listagem
--                    desempatava por nome e mudava de lugar sem motivo.
--   status_garantia· os três rótulos antigos e desativados ("Vigente",
--                    "A vencer", "Expirada") disputavam as posições 1, 2 e 3
--                    com os que estão em uso.
--
-- O fluxo da OS é o de `lib/emitirOs.ts`: em aberto → emitida → confirmada →
-- em andamento → executada → concluída, e depois as saídas laterais.

update public.catalogo_itens set ordem = v.ordem
from (values
  ('em_aberto', 1), ('emitida', 2), ('confirmada', 3), ('em_andamento', 4),
  ('executada', 5), ('concluida', 6), ('remarcada', 7), ('nao_executada', 8),
  ('cancelada', 9)
) as v(valor, ordem)
where catalogo = 'status_os' and catalogo_itens.valor = v.valor;

-- Garantias: os 8 estágios em uso na ordem do Discovery, e os desativados no fim.
update public.catalogo_itens set ordem = v.ordem
from (values
  ('Em vigor', 1), ('A renovar', 2), ('Renovado', 3), ('Renovação Recusada', 4),
  ('Aguardando Retorno', 5), ('Novo Orçamento', 6), ('Enviado E-mail', 7),
  ('Não Aplicável', 8),
  ('Vigente', 9), ('A vencer', 10), ('Expirada', 11)
) as v(nome, ordem)
where catalogo = 'status_garantia' and catalogo_itens.nome = v.nome;
