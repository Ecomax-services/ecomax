// Regras do monitoramento, conferidas sem banco e sem app.
//
// Os casos de situação repetem os que `supabase/tests/rls/
// execucao_do_monitoramento.sql` prova no trigger do banco. É de propósito: o
// App calcula offline e o banco recalcula no envio, e os dois precisam dar o
// mesmo resultado. Se um destes casos mudar, o do banco muda junto.
//
// Rodar: node --test "shared/tests/*.test.ts"   (Node 22.18+; strip-types nativo)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  alertaLampada, aplicacaoCompleta, diasAteVencer, erroDaLeitura, isServicoCodigo, podeAvancar,
  progressoDaOs, progressoDoServico, proximoPendente, sanitizarContagem, situacaoDaLeitura,
  textoBloqueio, textoProgressoDaOs, textoProgressoDoServico,
} from '../monitoramento.ts';
import type { ServicoNaOs } from '../monitoramento.ts';

test('status 1–4 vira a situação do relatório aprovado', () => {
  assert.equal(situacaoDaLeitura('PI', { statusCodigo: 1 }), 'nao_conforme');
  assert.equal(situacaoDaLeitura('PI', { statusCodigo: 2 }), 'nao_conforme');
  assert.equal(situacaoDaLeitura('PI', { statusCodigo: 3 }), 'conforme');
  assert.equal(situacaoDaLeitura('PA', { statusCodigo: 4 }), 'inacessivel');
  assert.equal(situacaoDaLeitura('PA', {}), 'pendente');
});

test('ocorrência: sem praga é conforme, com praga é não conforme, nada é pendente', () => {
  assert.equal(situacaoDaLeitura('OC', { semOcorrencia: true }), 'conforme');
  assert.equal(situacaoDaLeitura('OC', { contagens: { Barata: 3 } }), 'nao_conforme');
  assert.equal(situacaoDaLeitura('OC', { contagens: {} }), 'pendente');
  assert.equal(situacaoDaLeitura('OC', {}), 'pendente');
});

test('armadilha lida é conforme, inclusive com zero (provisório, igual ao banco)', () => {
  assert.equal(situacaoDaLeitura('AL', { contagens: { 'Mosca Doméstica': 6 } }), 'conforme');
  assert.equal(situacaoDaLeitura('PG', { contagens: {} }), 'conforme');
  assert.equal(situacaoDaLeitura('AL', {}), 'pendente');
});

test('erros com a mesma mensagem que o banco devolveria', () => {
  assert.equal(erroDaLeitura('AL', { statusCodigo: 1 }), 'O serviço AL não registra status 1–4.');
  assert.equal(erroDaLeitura('PI', { statusCodigo: 5 }), 'Status fora de 1–4.');
  assert.match(erroDaLeitura('AL', { contagens: { 'Mosca Doméstica': -1 } }) ?? '', /^Contagem inválida/);
  assert.match(erroDaLeitura('AL', { contagens: { 'Mosca Doméstica': 1.5 } }) ?? '', /^Contagem inválida/);
  assert.equal(erroDaLeitura('PI', { contagens: { x: 1 } }), 'O serviço PI não registra contagem.');
  assert.equal(erroDaLeitura('OC', { semOcorrencia: true, contagens: { Barata: 1 } }),
    'Setor marcado sem ocorrência não pode ter pragas contadas.');
  assert.equal(erroDaLeitura('AL', { semOcorrencia: true }), 'Só a Ocorrência Setorial registra "sem ocorrência".');
  assert.equal(erroDaLeitura('PI', { statusCodigo: 3 }), null);
  assert.equal(erroDaLeitura('OC', { semOcorrencia: true, contagens: {} }), null);
});

test('aplicação só conta completa', () => {
  assert.equal(aplicacaoCompleta({ produtoId: 'p', tecnica: 'Pulverização', quantidade: 35, areas: ['Fábrica'] }), true);
  assert.equal(aplicacaoCompleta({ produtoId: 'p', tecnica: 'Pulverização', quantidade: '', areas: ['Fábrica'] }), false);
  assert.equal(aplicacaoCompleta({ produtoId: 'p', tecnica: 'Pulverização', quantidade: 35, areas: [] }), false);
  assert.equal(aplicacaoCompleta({ tecnica: 'Pulverização', quantidade: 35, areas: ['CD'] }), false);
});

const osExemplo = (): ServicoNaOs[] => [
  { servico: 'DI', pontos: [], aplicacoes: [] },
  { servico: 'PI', pontos: [{ statusCodigo: 1 }, {}, { statusCodigo: 4 }] },
  { servico: 'OC', pontos: [{ semOcorrencia: true }, {}] },
];

test('a Desinsetização conta como um registro no total da OS', () => {
  assert.deepEqual(progressoDoServico(osExemplo()[0]), { total: 1, avaliados: 0, faltam: 1 });
  assert.deepEqual(progressoDaOs(osExemplo()), { total: 6, avaliados: 3, faltam: 3 });
});

test('textos do protótipo', () => {
  const os = osExemplo();
  assert.equal(textoProgressoDoServico(os[0]), 'Nenhuma aplicação registrada');
  assert.equal(textoProgressoDoServico(os[1]), '2 de 3 avaliados');
  assert.equal(textoProgressoDoServico(os[2]), '1 de 2 setores');
  assert.equal(textoProgressoDaOs(os), 'Na OS: 3 de 6 registros concluídos.');
  assert.equal(textoBloqueio(os), 'Avalie todos os pontos para avançar. Faltam 3.');
  os[0].aplicacoes = [{ produtoId: 'p', tecnica: 'Gel', quantidade: 1, areas: ['CD'] }, { produtoId: 'p' }];
  assert.equal(textoProgressoDoServico(os[0]), '1 de 2 aplicações completas');
});

test('bloqueio de avanço só libera com tudo avaliado', () => {
  const os = osExemplo();
  assert.equal(podeAvancar(os), false);
  os[0].aplicacoes = [{ produtoId: 'p', tecnica: 'Gel', quantidade: 1, areas: ['CD'] }];
  os[1].pontos[1] = { statusCodigo: 3 };
  os[2].pontos[1] = { contagens: { Barata: 2 } };
  assert.equal(podeAvancar(os), true);
  assert.equal(textoBloqueio(os), null);
});

test('ir ao pendente começa pelo serviço da tela e segue a ordem das abas', () => {
  const os = osExemplo();
  assert.deepEqual(proximoPendente(os, 'OC'), { servico: 'OC', indice: 1 });
  assert.deepEqual(proximoPendente(os, 'PI'), { servico: 'PI', indice: 1 });
  assert.deepEqual(proximoPendente(os), { servico: 'DI', indice: 0 });
  os[0].aplicacoes = [{ produtoId: 'p', tecnica: 'Gel', quantidade: 1, areas: ['CD'] }];
  os[1].pontos[1] = { statusCodigo: 3 };
  os[2].pontos[1] = { semOcorrencia: true };
  assert.equal(proximoPendente(os), null);
});

test('alerta de lâmpada a partir de 30 dias, sem bloquear', () => {
  const hoje = '2026-10-06';
  assert.equal(alertaLampada('2026-11-06', hoje), null);
  assert.equal(diasAteVencer('2026-11-05', hoje), 30);
  assert.deepEqual(alertaLampada('2026-11-05', hoje), { nivel: 'vence_em_breve', texto: 'Vence em 30 dias. Programe a troca.' });
  assert.equal(alertaLampada('2026-10-07', hoje)?.texto, 'Vence em 1 dia. Programe a troca.');
  assert.equal(alertaLampada('2026-10-06', hoje)?.texto, 'Lâmpadas vencem hoje. Programe a troca.');
  assert.equal(alertaLampada('2026-10-05', hoje)?.texto, 'Lâmpadas vencidas há 1 dia. Troque antes de registrar.');
  assert.deepEqual(alertaLampada('2026-09-26', hoje), { nivel: 'vencida', texto: 'Lâmpadas vencidas há 10 dias. Troque antes de registrar.' });
  assert.equal(alertaLampada(null, hoje), null);
  assert.equal(alertaLampada('06/10/2026', hoje), null);
});

test('contagem digitada vira só dígitos, sem zero à esquerda, até quatro', () => {
  assert.equal(sanitizarContagem('007'), '7');
  assert.equal(sanitizarContagem('0'), '0');
  assert.equal(sanitizarContagem('12a3'), '123');
  assert.equal(sanitizarContagem('123456'), '1234');
  assert.equal(sanitizarContagem(null), '');
});

test('código de serviço desconhecido é reconhecido como tal', () => {
  assert.equal(isServicoCodigo('PI'), true);
  assert.equal(isServicoCodigo('XX'), false);
});
