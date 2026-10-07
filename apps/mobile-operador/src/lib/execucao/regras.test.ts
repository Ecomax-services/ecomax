// Regras puras da execução offline, testadas fora do App.
//
// O que se prova aqui é o que precisa estar certo antes de o técnico perder o
// sinal: o envio montado do rascunho (com as mesmas recusas do servidor), os
// caminhos fixos que tornam o reenvio seguro, e a leitura dos erros.
//
// Rodar: node --import ./scripts/testes/registrar.mjs --test "apps/mobile-operador/src/**/*.test.ts"

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  arquivoJaEnviado, caminhoFixo, classificarFalha, contentTypeDe, dataEmBrasilia, extensaoDe,
  montarEnvio, numeroDigitado,
} from './regras';
import type { CaminhosEnviados, PacoteOs, RascunhoExecucao } from './tipos';

const OS = '11111111-1111-1111-1111-111111111111';
const UUID = '22222222-2222-2222-2222-222222222222';

function pacote(): PacoteOs {
  return {
    versao: 4,
    baixadoEm: '2026-10-06T10:00:00Z',
    os: {
      id: OS, codigo: 'OS-1050', status: 'confirmada', dataProgramada: '2026-10-06', horaPrevista: '08:00',
      duracaoEstimada: null, tiposServico: ['Desratização'], pragas: [], observacoes: null, mapaPontosUrl: null,
      cliente: { id: 'c', nome: 'Cliente', endereco: '—', telefone: null }, jaExecutada: false,
    },
    planos: [
      { id: 'plano-pi', tipoControle: 'Controle Roedores', frequencia: 'Mensal', servico: 'PI',
        pontos: [{ id: 'pi1', numero: 1, area: 'Fábrica', fase: null, local: 'Doca 1' },
                 { id: 'pi2', numero: 2, area: 'Fábrica', fase: null, local: 'Doca 2' }] },
      { id: 'plano-di', tipoControle: 'Desinsetização', frequencia: 'Mensal', servico: 'DI', pontos: [] },
      // Plano antigo: o App não registra, e ele não pode travar o envio.
      { id: 'plano-velho', tipoControle: 'Globo de Moscas', frequencia: 'Mensal', servico: null,
        pontos: [{ id: 'gm1', numero: 1, area: null, fase: null, local: 'Copa' }] },
    ],
    legendas: {},
    listas: { especiesAl: [], outrasPragasAl: [], pragasPg: [], pragasOc: [], tecnicasDi: [] },
    areas: ['Fábrica'],
    produtos: [],
    base: { id: 'base', nome: 'Base Sorocaba' },
    lotes: [{ id: 'lote', produtoId: 'prod', lote: 'RG-01', validade: '2027-04-01', quantidade: 3 }],
    tecnico: { nome: 'Técnico' },
    responsavelTecnico: null,
    validadeCertificadoDias: 90,
  };
}

function rascunho(): RascunhoExecucao {
  return {
    versao: 1, osId: OS, execucaoUuid: UUID,
    // 09:00 em Brasília do dia 06/10.
    inicio: '2026-10-06T12:00:00.000Z',
    atualizadoEm: '2026-10-06T13:00:00Z', etapa: 6,
    produtos: [{ produtoId: 'prod', estoqueLoteId: 'lote', quantidade: '150', unidade: 'g' }],
    planos: { 'plano-pi': { observacao: '  Isca reposta  ' } },
    pontos: { pi1: { statusCodigo: 1, observacao: 'Consumo alto' }, pi2: { statusCodigo: 3 } },
    aplicacoes: [
      { planoId: 'plano-di', produtoId: 'prod', tecnica: 'Aplicação de Gel', quantidade: '35', unidade: 'g', areas: ['Fábrica'] },
      // Aberta e não preenchida: não é registro de nada.
      { planoId: 'plano-di', produtoId: null, tecnica: null, quantidade: '', unidade: 'g', areas: [] },
    ],
    fotos: [{ id: 'f1', uriLocal: 'file:///x/f1.jpg', nome: 'Isca', pontoId: 'pi1' }],
    reposicao: { observacao: '', itens: [{ produtoId: 'prod', quantidade: '0' }] },
    assinante: { nome: ' Maria ', assinaturaUri: 'file:///x/cliente.png' },
    tecnicoAssinaturaUri: 'file:///x/tecnico.png',
    envio: { tentativas: 0, ultimoErro: null, ultimaTentativa: null },
  };
}

const enviados = (): CaminhosEnviados => ({
  fotos: { f1: `os/${OS}/foto/${UUID}-f1.jpg` },
  assinaturaCliente: `os/${OS}/assinatura/${UUID}-cliente.png`,
  assinaturaTecnico: `os/${OS}/assinatura/${UUID}-tecnico.png`,
});

test('caminho fixo: o reenvio cai no mesmo lugar, na convenção da policy', () => {
  const a = caminhoFixo(OS, 'foto', UUID, 'f1', 'JPG');
  assert.equal(a, `os/${OS}/foto/${UUID}-f1.jpg`);
  assert.equal(caminhoFixo(OS, 'foto', UUID, 'f1', '.jpg'), a);
  assert.equal(extensaoDe('file:///a/b/foto.HEIC'), 'heic');
  assert.equal(extensaoDe('file:///a/b/semextensao'), 'jpg');
  assert.equal(contentTypeDe('png'), 'image/png');
});

test('"já existe" no storage conta como enviado', () => {
  assert.equal(arquivoJaEnviado('The resource already exists', 400), true);
  assert.equal(arquivoJaEnviado('qualquer coisa', '409'), true);
  assert.equal(arquivoJaEnviado('new row violates row-level security policy', 403), false);
});

test('falhas: sem rede, sessão e recusa são coisas diferentes', () => {
  assert.equal(classificarFalha({ message: 'TypeError: Network request failed' }), 'sem_rede');
  assert.equal(classificarFalha({ message: 'JWT expired', code: 'PGRST301' }), 'sessao');
  assert.equal(classificarFalha({ message: 'Avalie todos os pontos para concluir. Faltam 2.', code: '23514' }), 'recusado');
});

test('quantidade digitada: vírgula decimal, ponto só como milhar quando há vírgula', () => {
  assert.equal(numeroDigitado('1,5'), 1.5);
  assert.equal(numeroDigitado('1.5'), 1.5);
  assert.equal(numeroDigitado('1.234,5'), 1234.5);
  assert.equal(numeroDigitado('300'), 300);
  assert.ok(Number.isNaN(numeroDigitado('')));
  assert.ok(Number.isNaN(numeroDigitado('abc')));
  assert.ok(Number.isNaN(numeroDigitado('-2')));
});

test('data de Brasília, como o banco confere', () => {
  // 01:30 UTC do dia 07 ainda é 22:30 do dia 06 em Brasília.
  assert.equal(dataEmBrasilia('2026-10-07T01:30:00Z'), '2026-10-06');
  assert.equal(dataEmBrasilia('2026-10-07T03:30:00Z'), '2026-10-07');
});

test('o envio completo sai no formato de registrar_execucao', () => {
  const r = montarEnvio(pacote(), rascunho(), enviados(), '2026-10-06T14:00:00Z');
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const d = r.dados as Record<string, any>;
  assert.equal(d.execucao_uuid, UUID);
  assert.deepEqual(d.produtos, [{ produto_id: 'prod', estoque_lote_id: 'lote', quantidade: 150, unidade: 'g' }]);
  assert.equal(d.pontos.length, 2, 'só os pontos dos planos do mapa');
  assert.deepEqual(d.pontos[0], { ponto_id: 'pi1', status_codigo: 1, contagens: null, sem_ocorrencia: false, observacao: 'Consumo alto', acao_corretiva: null });
  assert.equal(d.aplicacoes.length, 1, 'a aplicação em branco não vai');
  assert.equal(d.reposicao, null, 'reposição com quantidade zero não vai');
  assert.deepEqual(d.planos, [{ plano_id: 'plano-pi', observacao: 'Isca reposta', lampada_instalacao: null, lampada_validade: null }]);
  assert.deepEqual(d.fotos, [{ caminho: `os/${OS}/foto/${UUID}-f1.jpg`, nome: 'Isca', ponto_id: 'pi1' }]);
  assert.equal(d.assinante.nome, 'Maria');
  assert.equal(d.assinante.assinatura, `os/${OS}/assinatura/${UUID}-cliente.png`);
  assert.equal(d.tecnico_assinatura, `os/${OS}/assinatura/${UUID}-tecnico.png`);
});

test('as recusas do servidor são antecipadas, com o mesmo texto', () => {
  const r0 = rascunho();
  r0.produtos = [];
  r0.pontos = { pi1: { statusCodigo: 1 } };
  r0.aplicacoes = [];
  r0.assinante = { nome: '', assinaturaUri: null };
  r0.tecnicoAssinaturaUri = null;
  const r = montarEnvio(pacote(), r0, enviados(), '2026-10-06T14:00:00Z');
  assert.equal(r.ok, false);
  if (r.ok) return;
  for (const esperado of [
    'Registre pelo menos um produto.',
    // PI-02 sem leitura + Desinsetização sem aplicação.
    'Avalie todos os pontos para avançar. Faltam 2.',
    'Informe o nome de quem assina.',
    'Colete a assinatura do cliente.',
    'Assine antes de concluir.',
  ]) {
    assert.ok(r.problemas.includes(esperado), `faltou: ${esperado}`);
  }
});

test('lote, quantidade, data e leitura inválida', () => {
  const r0 = rascunho();
  r0.produtos = [{ produtoId: 'prod', estoqueLoteId: null, quantidade: '0', unidade: null }];
  r0.inicio = '2026-10-05T12:00:00Z';
  r0.pontos.pi2 = { statusCodigo: 7 };
  const r = montarEnvio(pacote(), r0, enviados(), '2026-10-06T14:00:00Z');
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.ok(r.problemas.includes('O lote é obrigatório.'));
  assert.ok(r.problemas.includes('Informe a quantidade aplicada.'));
  assert.ok(r.problemas.includes('Só é possível iniciar na data programada.'));
  assert.ok(r.problemas.includes('PI-02: Status fora de 1–4.'));
});

test('sem os arquivos no storage, o envio não fecha', () => {
  const r = montarEnvio(pacote(), rascunho(), { fotos: {}, assinaturaCliente: null, assinaturaTecnico: null }, '2026-10-06T14:00:00Z');
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.ok(r.problemas.includes('1 foto ainda não foi enviada.'));
  assert.ok(r.problemas.includes('A assinatura do cliente ainda não foi enviada.'));
  assert.ok(r.problemas.includes('A sua assinatura ainda não foi enviada.'));
});

test('o lote tem de ser da base do técnico, e do produto certo', () => {
  const r0 = rascunho();
  r0.produtos = [{ produtoId: 'outro-produto', estoqueLoteId: 'lote', quantidade: '1', unidade: null }];
  const r1 = montarEnvio(pacote(), r0, enviados(), '2026-10-06T14:00:00Z');
  assert.equal(r1.ok, false);
  if (!r1.ok) assert.ok(r1.problemas.includes('O lote escolhido não é da sua base.'));

  const semBase = pacote();
  semBase.base = null;
  const r2 = montarEnvio(semBase, rascunho(), enviados(), '2026-10-06T14:00:00Z');
  assert.equal(r2.ok, false);
  if (!r2.ok) assert.ok(r2.problemas.includes('Seu cadastro não tem base de estoque. Peça ao escritório para definir a sua base.'));
});

test('quem assina vai só com nome e assinatura — sem CPF nem cargo (aprovação de 06/10)', () => {
  const r = montarEnvio(pacote(), rascunho(), enviados(), '2026-10-06T14:00:00Z');
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(Object.keys(r.dados.assinante as object).sort(), ['assinatura', 'nome']);
});
