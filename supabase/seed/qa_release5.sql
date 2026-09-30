-- ============================================================================
-- Massa de QA do Release 5 — Portal do Cliente
-- ============================================================================
-- Tudo que este arquivo cria leva o prefixo [QA] no nome, e
-- `qa_release5_remover.sql` apaga exatamente isto e nada mais.
--
-- O desenho não é "alguns dados": cada linha existe para exercitar um estado
-- ou uma fronteira. Dois clientes, porque a afirmação que mais importa no
-- Portal é negativa — um cliente não pode ver o do outro, e isso só se prova
-- com dois.
--
-- O que cada peça cobre:
--
--   Alfa      cliente completo, com as quatro abas do detalhe cheias
--   Beta      o vizinho; existe para o Alfa não enxergar
--   rascunho  OS que não pode aparecer no Portal
--   inativo   documento que não pode aparecer
--   foto      anexo interno que não pode aparecer, mesmo na OS do dono
--   vencido   documento de colaborador em cada um dos quatro estados
--
-- Rodar:    supabase db query --linked -f supabase/seed/qa_release5.sql
-- Remover:  supabase db query --linked -f supabase/seed/qa_release5_remover.sql
-- ============================================================================

do $$
declare
  v_alfa uuid; v_beta uuid;
  v_os_alfa uuid; v_os_alfa_aberta uuid; v_os_alfa_rascunho uuid; v_os_beta uuid;
  v_tec1 uuid; v_tec2 uuid; v_tec_beta uuid;
  v_prod_ok uuid; v_prod_vencido uuid; v_prod_aplicado uuid; v_prod_alheio uuid;
  v_plano_alfa uuid; v_plano_beta uuid;
begin
  -- --------------------------------------------------------------------------
  -- Clientes e acesso ao Portal
  -- --------------------------------------------------------------------------
  insert into public.clientes (nome, razao_social, tipo_pessoa, cnpj, cidade, uf, ativo)
  values ('[QA] Alfa Alimentos', '[QA] Alfa Alimentos Ltda', 'pj', '11222333000181', 'São Paulo', 'SP', true)
  returning id into v_alfa;

  insert into public.clientes (nome, razao_social, tipo_pessoa, cnpj, cidade, uf, ativo)
  values ('[QA] Beta Logística', '[QA] Beta Logística S.A.', 'pj', '11222333000262', 'Campinas', 'SP', true)
  returning id into v_beta;

  -- O vínculo do Portal casa por e-mail: é `my_portal_cliente_ids()` que lê
  -- esta tabela. Sem a linha aqui, a conta faz login e não vê absolutamente
  -- nada — foi assim que o fluxo quebrou antes.
  insert into public.cliente_portal_usuarios (cliente_id, nome, email, status) values
    (v_alfa, '[QA] Responsável Alfa', 'qa.alfa@ecomax.com.br', 'ativo'),
    (v_beta, '[QA] Responsável Beta', 'qa.beta@ecomax.com.br', 'ativo');

  -- --------------------------------------------------------------------------
  -- Ordens de serviço
  -- --------------------------------------------------------------------------
  insert into public.ordens_servico (cliente_id, status, data_programada, tipos_servico, endereco_execucao, rascunho)
  values (v_alfa, 'concluida', current_date - 12, array['Desinsetização', 'Desratização'], 'Unidade Central', false)
  returning id into v_os_alfa;

  -- OS sem nada pendurado: prova que cada aba sabe dizer que está vazia.
  insert into public.ordens_servico (cliente_id, status, data_programada, tipos_servico, endereco_execucao, rascunho)
  values (v_alfa, 'em_aberto', current_date + 7, array['Sanitização'], 'Filial Norte', false)
  returning id into v_os_alfa_aberta;

  -- Rascunho não chega ao Portal. A policy filtra por `not rascunho`.
  insert into public.ordens_servico (cliente_id, status, data_programada, tipos_servico, endereco_execucao, rascunho)
  values (v_alfa, 'em_aberto', current_date + 20, array['Desratização'], 'Filial Sul', true)
  returning id into v_os_alfa_rascunho;

  insert into public.ordens_servico (cliente_id, status, data_programada, tipos_servico, endereco_execucao, rascunho)
  values (v_beta, 'concluida', current_date - 9, array['Desinsetização'], 'Centro de Distribuição', false)
  returning id into v_os_beta;

  -- --------------------------------------------------------------------------
  -- Colaboradores
  -- --------------------------------------------------------------------------
  insert into public.funcionarios (nome_completo, cpf, cargo, setor, ativo) values
    ('[QA] Carlos Henrique Souza', '52998224725', 'Técnico', 'Operações', true) returning id into v_tec1;
  insert into public.funcionarios (nome_completo, cpf, cargo, setor, ativo) values
    ('[QA] Marina Lopes Ferreira', '15350946056', 'Técnica', 'Operações', true) returning id into v_tec2;
  insert into public.funcionarios (nome_completo, cpf, cargo, setor, ativo) values
    ('[QA] Rafael Oliveira Lima', '11144477735', 'Técnico', 'Operações', true) returning id into v_tec_beta;

  insert into public.os_funcionarios (os_id, funcionario_id) values
    (v_os_alfa, v_tec1), (v_os_alfa, v_tec2), (v_os_beta, v_tec_beta);

  -- Os quatro estados da matriz de validade, na mesma tela:
  --   válido       vence daqui a muito tempo
  --   vence breve  dentro dos 30 dias de alerta
  --   vencido      já passou
  --   indisponível o tipo existe no catálogo e a pessoa não tem o documento
  insert into public.funcionario_documentos (funcionario_id, tipo, validade) values
    (v_tec1, 'ASO', current_date + 300),
    (v_tec1, 'NR35', current_date + 12),
    (v_tec1, 'NR33', current_date - 5),
    (v_tec2, 'ASO', current_date + 180),
    (v_tec_beta, 'ASO', current_date + 200);

  -- --------------------------------------------------------------------------
  -- Produtos
  -- --------------------------------------------------------------------------
  insert into public.produtos (codigo, nome, categoria, unidade, ativo, registro_anvisa, anvisa_url)
  values ('[QA]-P1', '[QA] Inseticida Permetrina 500ml', 'Inseticida', 'L', true, '3.0123.4567', 'https://consultas.anvisa.gov.br/')
  returning id into v_prod_ok;

  insert into public.produtos (codigo, nome, categoria, unidade, ativo)
  values ('[QA]-P2', '[QA] Raticida Brodifacoum Blocos', 'Raticida', 'KG', true)
  returning id into v_prod_vencido;

  insert into public.produtos (codigo, nome, categoria, unidade, ativo)
  values ('[QA]-P3', '[QA] Larvicida Pyriproxyfen 1L', 'Larvicida', 'L', true)
  returning id into v_prod_aplicado;

  -- Homologado só para a Beta: o Alfa não pode vê-lo.
  insert into public.produtos (codigo, nome, categoria, unidade, ativo)
  values ('[QA]-P4', '[QA] Cupinicida Fipronil 250ml', 'Cupinicida', 'L', true)
  returning id into v_prod_alheio;

  -- Homologação vencida vira "Indisponível" na tela, e é o caso que o cliente
  -- precisa notar — por isso a legenda existe.
  insert into public.cliente_produtos_homologados (cliente_id, produto_id, data_homologacao, validade) values
    (v_alfa, v_prod_ok, current_date - 60, current_date + 365),
    (v_alfa, v_prod_vencido, current_date - 400, current_date - 10),
    (v_beta, v_prod_alheio, current_date - 30, current_date + 365);

  -- Produto sem homologação, mas aplicado numa OS do Alfa: aparece pelo outro
  -- caminho de `produto_do_meu_cliente`.
  insert into public.os_produtos (os_id, produto_id, qtd_recomendada, unidade)
  values (v_os_alfa, v_prod_aplicado, 2, 'L');

  -- --------------------------------------------------------------------------
  -- Documentos do cliente
  -- --------------------------------------------------------------------------
  insert into public.cliente_documentos (cliente_id, categoria, titulo, descricao, validade, ativo) values
    (v_alfa, 'Contrato', '[QA] Contrato de prestação de serviços', 'Assinado em janeiro', null, true),
    (v_alfa, 'Registros e Licenças', '[QA] Licença de operação ambiental', null, current_date + 20, true),
    (v_alfa, 'SSMA', '[QA] Documento arquivado', 'Não deve aparecer no Portal', null, false),
    (v_beta, 'Contrato', '[QA] Contrato da Beta', null, null, true),
    (null,   'Manual do Usuário', '[QA] Manual institucional', 'Vale para todos os clientes', null, true);

  -- --------------------------------------------------------------------------
  -- Detalhe da OS: as quatro abas
  -- --------------------------------------------------------------------------
  -- Relatório não publicado não chega ao Portal, mesmo sendo da OS do cliente.
  insert into public.os_relatorios (os_id, titulo, publicado, publicado_at) values
    (v_os_alfa, '[QA] Relatório técnico da visita', true, now() - interval '10 days'),
    (v_os_alfa, '[QA] Rascunho do relatório', false, null),
    (v_os_beta, '[QA] Relatório técnico da Beta', true, now() - interval '8 days');

  insert into public.os_planos_controle (os_id, tipo_controle, frequencia, pontos_previstos)
  values (v_os_alfa, 'Controle de roedores', 'Mensal', 4) returning id into v_plano_alfa;
  insert into public.os_planos_controle (os_id, tipo_controle, frequencia, pontos_previstos)
  values (v_os_beta, 'Controle de roedores', 'Mensal', 2) returning id into v_plano_beta;

  -- As quatro situações que a aba Mapeamento sabe pintar.
  insert into public.os_plano_pontos (plano_id, numero, identificacao, situacao, observacao) values
    (v_plano_alfa, 1, 'Doca de recebimento', 'conforme', null),
    (v_plano_alfa, 2, 'Depósito seco', 'nao_conforme', 'Isca consumida, reposta na visita'),
    (v_plano_alfa, 3, 'Casa de máquinas', 'inacessivel', 'Sala trancada no dia'),
    (v_plano_alfa, 4, 'Área externa - fundos', 'pendente', null),
    (v_plano_beta, 1, 'Portaria', 'conforme', null);

  -- Foto é material interno: está na OS do Alfa e ainda assim não pode
  -- aparecer para ele. É o recorte por tipo, não por dono.
  insert into public.os_anexos (os_id, nome, tipo) values
    (v_os_alfa, '[QA] Certificado de execução', 'certificado'),
    (v_os_alfa, '[QA] Comprovante de aplicação', 'comprovante'),
    (v_os_alfa, '[QA] Foto interna da equipe', 'foto'),
    (v_os_beta, '[QA] Certificado da Beta', 'certificado');

  insert into public.os_cronograma (os_id, data_prevista, status, ordem) values
    (v_os_alfa, current_date - 12, 'concluida', 1),
    (v_os_alfa, current_date + 18, 'previsto', 2),
    (v_os_beta, current_date + 25, 'previsto', 1);

  raise notice 'Massa de QA criada. Alfa=% Beta=%', v_alfa, v_beta;
  raise notice 'OS do Alfa: completa=% aberta=% rascunho=%', v_os_alfa, v_os_alfa_aberta, v_os_alfa_rascunho;
end $$;
