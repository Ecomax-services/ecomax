-- ============================================================================
-- Seed de DEMONSTRAÇÃO — releases 1/2/3
-- ============================================================================
-- Existe por um motivo específico: sem ele a agenda do operador abre vazia.
-- O banco de QA só tem OS no passado (a última `data_programada` era 10/09) e
-- nenhuma das cinco OS da conta `qa.operador` está num estado em que dê para
-- fazer check-in. Numa apresentação ao vivo, a parte de campo — a mais visual
-- do produto — não teria o que mostrar.
--
-- Regras que este arquivo respeita (as mesmas de supabase/seed.sql):
--   • idempotente: rodar de novo reposiciona as datas para "hoje" em vez de
--     duplicar linhas — os ids são fixos;
--   • identificável: toda OS criada aqui tem `[DEMO]` em `observacoes`;
--   • reversível: supabase/seed/demo_seed_rollback.sql desfaz tudo;
--   • aditivo: não altera OS, clientes nem lotes que já existiam. A única
--     exceção está no bloco 4, e está marcada lá.
--
-- Ids fixos das OS de demonstração: de000000-0000-4000-8000-00000000000N
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. As quatro OS
-- ----------------------------------------------------------------------------
-- `confirmada` e `em_aberto` são os dois estados que o app aceita para
-- check-in (ANTES_DA_EXECUCAO em mobile-operador/src/lib/operacional.ts).
-- `rascunho = false` é obrigatório: o trigger os_funcionario_recusa_rascunho
-- impede vincular operador a rascunho.
insert into ordens_servico
  (id, cliente_id, status, rascunho, tipos_servico, pragas, epis, descricao,
   data_programada, hora_prevista, duracao_estimada, endereco_execucao,
   contato, necessita_relatorio, responsavel_admin_id, created_by, observacoes)
values
  ('de000000-0000-4000-8000-000000000001', '92bf2b56-b3a8-42e4-a830-e0017b0395e6',
   'confirmada', false, array['Desratização'], array['Roedores'],
   array['Luvas nitrílicas','Máscara respiratória'],
   'Desratização preventiva do estoque seco e da doca de recebimento.',
   current_date, '08:00', '2h', 'Av. das Nações, 1200 — Depósito, São Paulo/SP',
   'Roberto Meireles (gerente de loja)', true,
   '7bf593f3-b8d7-423b-adad-529bef4fa12d', '7bf593f3-b8d7-423b-adad-529bef4fa12d',
   '[DEMO] Roteiro de apresentação — check-in ao vivo.'),

  ('de000000-0000-4000-8000-000000000002', '1c480bfe-c296-4168-aecb-d9ef9b59e38c',
   'em_aberto', false, array['Sanitização'], array['Baratas'],
   array['Macacão impermeável','Óculos de proteção'],
   'Sanitização da cozinha industrial e do refeitório, fora do horário de aula.',
   current_date, '13:30', '3h', 'R. dos Estudantes, 45 — Bloco B, São Paulo/SP',
   'Coordenação pedagógica', true,
   '7bf593f3-b8d7-423b-adad-529bef4fa12d', '7bf593f3-b8d7-423b-adad-529bef4fa12d',
   '[DEMO] Tem plano de controle com pontos — usar para mostrar o progresso.'),

  ('de000000-0000-4000-8000-000000000003', '0d4130d9-ff87-4f71-9550-d4ccb9c92079',
   'confirmada', false, array['Desinsetização'], array['Baratas'],
   array['Luvas nitrílicas'],
   'Desinsetização da área de manipulação e do depósito de secos.',
   current_date, '10:30', '1h30', 'R. Augusta, 980, São Paulo/SP',
   'Chef Ana Paula', false,
   '7bf593f3-b8d7-423b-adad-529bef4fa12d', '7bf593f3-b8d7-423b-adad-529bef4fa12d',
   '[DEMO] Atribuída ao segundo operador — mostra a agenda de outra pessoa.'),

  ('de000000-0000-4000-8000-000000000004', 'b8831856-96ce-424a-9ebd-733d18a89be5',
   'confirmada', false, array['Desinsetização'], array['Baratas'],
   array['Luvas nitrílicas','Máscara respiratória'],
   'Desinsetização mensal contratada — área de produção.',
   current_date + 1, '09:00', '2h', 'R. do Forno, 77, São Paulo/SP',
   'Sr. Antônio (proprietário)', true,
   '7bf593f3-b8d7-423b-adad-529bef4fa12d', '7bf593f3-b8d7-423b-adad-529bef4fa12d',
   '[DEMO] Amanhã — mostra que a agenda tem continuidade.')
on conflict (id) do update set
  cliente_id = excluded.cliente_id,
  status = excluded.status,
  rascunho = false,
  tipos_servico = excluded.tipos_servico,
  pragas = excluded.pragas,
  epis = excluded.epis,
  descricao = excluded.descricao,
  data_programada = excluded.data_programada,
  hora_prevista = excluded.hora_prevista,
  duracao_estimada = excluded.duracao_estimada,
  endereco_execucao = excluded.endereco_execucao,
  contato = excluded.contato,
  necessita_relatorio = excluded.necessita_relatorio,
  observacoes = excluded.observacoes,
  -- Reexecutar devolve a OS ao começo do fluxo: é o que torna o seed
  -- reaproveitável entre um ensaio e a apresentação de verdade.
  check_in_at = null, check_in_lat = null, check_in_lng = null,
  check_out_at = null, check_out_lat = null, check_out_lng = null,
  assinatura_url = null,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 2. Operador responsável
-- ----------------------------------------------------------------------------
delete from os_funcionarios
 where os_id in ('de000000-0000-4000-8000-000000000001',
                 'de000000-0000-4000-8000-000000000002',
                 'de000000-0000-4000-8000-000000000003',
                 'de000000-0000-4000-8000-000000000004');

insert into os_funcionarios (os_id, funcionario_id) values
  ('de000000-0000-4000-8000-000000000001', 'd29bfd57-78d0-4de5-ad67-7f04fbe8be3c'),
  ('de000000-0000-4000-8000-000000000002', 'd29bfd57-78d0-4de5-ad67-7f04fbe8be3c'),
  ('de000000-0000-4000-8000-000000000003', '34038bd3-fbbf-4e51-9c2d-1d8d02545da7'),
  ('de000000-0000-4000-8000-000000000004', 'd29bfd57-78d0-4de5-ad67-7f04fbe8be3c');

-- ----------------------------------------------------------------------------
-- 3. Produtos previstos
-- ----------------------------------------------------------------------------
-- Escolhidos entre os que NÃO têm lote vencido, e com `base_id` fixado na
-- Ecomax Central, onde o saldo está. Sem isso a baixa de estoque na frente do
-- cliente poderia consumir lote fora da validade (ver nota no relatório).
delete from os_produtos
 where os_id in ('de000000-0000-4000-8000-000000000001',
                 'de000000-0000-4000-8000-000000000002',
                 'de000000-0000-4000-8000-000000000003',
                 'de000000-0000-4000-8000-000000000004');

insert into os_produtos (os_id, produto_id, base_id, qtd_recomendada, unidade) values
  ('de000000-0000-4000-8000-000000000001', 'c5e706f2-e15f-4b0f-8052-6676813e2143',
   'b3748e4b-ef57-4100-ba78-3cdd714239d7', 12, 'un'),
  ('de000000-0000-4000-8000-000000000002', '7ad4d747-336d-4a9b-b6db-7e2547bb0e27',
   'b3748e4b-ef57-4100-ba78-3cdd714239d7', 3, 'L'),
  ('de000000-0000-4000-8000-000000000003', 'c5e706f2-e15f-4b0f-8052-6676813e2143',
   'b3748e4b-ef57-4100-ba78-3cdd714239d7', 6, 'un'),
  ('de000000-0000-4000-8000-000000000004', 'c5e706f2-e15f-4b0f-8052-6676813e2143',
   'b3748e4b-ef57-4100-ba78-3cdd714239d7', 8, 'un');

-- ----------------------------------------------------------------------------
-- 4. Plano de controle com pontos de verdade
-- ----------------------------------------------------------------------------
-- Os 7 planos que já existiam estão todos com `pontos_previstos = 0` e a
-- tabela os_plano_pontos está vazia — o chip de progresso mostra "0/0".
-- ESTE É O ÚNICO BLOCO QUE TOCA EM DADO PREEXISTENTE: ele preenche os pontos
-- dos planos que não têm nenhum. O rollback devolve `pontos_previstos` a 0 e
-- apaga os pontos criados.
insert into os_planos_controle (id, os_id, tipo_controle, frequencia, pontos_previstos)
values ('de000000-0000-4000-8000-0000000000a1',
        'de000000-0000-4000-8000-000000000002',
        'Monitoramento de Áreas', 'Mensal', 6)
on conflict (id) do update set
  tipo_controle = excluded.tipo_controle,
  frequencia = excluded.frequencia,
  pontos_previstos = excluded.pontos_previstos;

update os_planos_controle p
   set pontos_previstos = 5
 where coalesce(p.pontos_previstos, 0) = 0
   and not exists (select 1 from os_plano_pontos pt where pt.plano_id = p.id);

insert into os_plano_pontos (plano_id, numero, identificacao, situacao)
select p.id, g.n,
       'PC-' || lpad(g.n::text, 2, '0'),
       case when g.n <= greatest(1, p.pontos_previstos / 2) then 'conforme' else 'pendente' end
  from os_planos_controle p
 cross join lateral generate_series(1, p.pontos_previstos) as g(n)
 where p.pontos_previstos > 0
   and not exists (select 1 from os_plano_pontos pt where pt.plano_id = p.id);

-- ----------------------------------------------------------------------------
-- 5. Níveis de estoque
-- ----------------------------------------------------------------------------
-- A tabela estava vazia: a coluna mínimo/máximo aparecia em branco e o KPI
-- "abaixo do mínimo" era sempre 0 — não porque estivesse tudo certo, mas
-- porque não havia parâmetro nenhum. Os níveis saem do saldo atual da base
-- Central, de modo que a maioria fique saudável e um ou dois itens fiquem
-- abaixo do mínimo — que é o que torna o alerta demonstrável.
insert into estoque_niveis (produto_id, base_id, estoque_min, estoque_max)
select l.produto_id,
       'b3748e4b-ef57-4100-ba78-3cdd714239d7',
       greatest(1, round(sum(l.quantidade) * 0.30)),
       greatest(2, round(sum(l.quantidade) * 1.50))
  from estoque_lotes l
 where l.base_id = 'b3748e4b-ef57-4100-ba78-3cdd714239d7'
   and l.quantidade > 0
 group by l.produto_id
on conflict (produto_id, base_id) do nothing;

commit;
