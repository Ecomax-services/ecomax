// Regras puras do Histórico, testadas fora do App.
//
// O que se prova aqui: os filtros de período e de busca do segmento
// "Concluídas", a data e o tempo da execução, e como cada tipo de ponto aparece
// no "Detalhes do serviço" com o modelo aprovado.
//
// Rodar: node --import ./scripts/testes/registrar.mjs --test "apps/mobile-operador/src/**/*.test.ts"

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cartaoDoPonto, compararPontos, dataDaExecucao, estaConcluida, passaNaBusca, passaNoPeriodo, periodos,
  resumoDosPontos, tempoDeExecucao, type PontoRegistrado,
} from './regras';

const ponto = (p: Partial<PontoRegistrado>): PontoRegistrado => ({
  id: 'p', servico: 'PI', numero: 3, identificacao: 'Doca 3', area: null, situacao: 'conforme',
  statusRotulo: null, contagens: null, semOcorrencia: null, observacao: null, acaoCorretiva: null, ...p,
});

test('períodos: todo o período, hoje e os três últimos meses pelo nome', () => {
  assert.deepEqual(periodos('2026-08-11').map((p) => p.rotulo), ['Todo o período', 'Hoje', 'Agosto', 'Julho', 'Junho']);
  assert.deepEqual(periodos('2027-01-05').slice(2).map((p) => p.chave), ['2027-01', '2026-12', '2026-11']);
});

test('filtro de período usa a data da execução', () => {
  assert.equal(passaNoPeriodo('2026-08-11', 'dia', '2026-08-11'), true);
  assert.equal(passaNoPeriodo('2026-08-10', 'dia', '2026-08-11'), false);
  assert.equal(passaNoPeriodo('2026-07-31', '2026-07', '2026-08-11'), true);
  assert.equal(passaNoPeriodo(null, '2026-07', '2026-08-11'), false);
  assert.equal(passaNoPeriodo(null, 'todos', '2026-08-11'), true);
});

test('busca por cliente ou código, sem acento nem caixa', () => {
  const os = { cliente: 'Padaria Pão Dourado', codigo: 'OS-4231' };
  assert.equal(passaNaBusca(os, 'pao'), true);
  assert.equal(passaNaBusca(os, '4231'), true);
  assert.equal(passaNaBusca(os, '  '), true);
  assert.equal(passaNaBusca(os, 'hotel'), false);
});

test('data da execução: término em Brasília; senão check-out; senão a programada', () => {
  // 01:10 UTC de 12/8 ainda é 11/8 em Brasília.
  assert.equal(dataDaExecucao({ termino: '2026-08-12T01:10:00Z', checkOut: null, dataProgramada: '2026-08-10' }), '2026-08-11');
  assert.equal(dataDaExecucao({ termino: null, checkOut: '2026-08-09T15:00:00Z', dataProgramada: '2026-08-10' }), '2026-08-09');
  assert.equal(dataDaExecucao({ termino: null, checkOut: null, dataProgramada: '2026-08-10' }), '2026-08-10');
});

test('tempo real de execução', () => {
  assert.equal(tempoDeExecucao('2026-08-11T10:00:00Z', '2026-08-11T11:42:00Z'), '1h42');
  assert.equal(tempoDeExecucao('2026-08-11T10:00:00Z', '2026-08-11T10:42:00Z'), '42 min');
  assert.equal(tempoDeExecucao(null, '2026-08-11T10:42:00Z'), null);
  assert.equal(tempoDeExecucao('2026-08-11T11:00:00Z', '2026-08-11T10:00:00Z'), null);
});

test('concluída = executada ou concluída', () => {
  assert.equal(estaConcluida('executada'), true);
  assert.equal(estaConcluida('concluida'), true);
  assert.equal(estaConcluida('em_andamento'), false);
});

test('PI/PA mostram o rótulo da legenda gravado no ponto', () => {
  const c = cartaoDoPonto(ponto({ statusRotulo: 'Isca Consumida', situacao: 'nao_conforme', observacao: 'Reposta.' }));
  assert.deepEqual(c, { id: 'p', nome: 'PI-03 · Doca 3', status: 'Isca Consumida', ok: false, obs: 'Reposta.' });
});

test('AL/PG mostram o total capturado e a quantidade por espécie', () => {
  const c = cartaoDoPonto(ponto({ servico: 'AL', numero: 1, identificacao: 'Expedição', contagens: { Moscas: 3, Mariposas: 0, Mosquitos: 1 } }));
  assert.equal(c.status, '4 capturas');
  assert.equal(c.obs, 'Moscas: 3 · Mosquitos: 1');
  assert.equal(cartaoDoPonto(ponto({ servico: 'PG', contagens: {} })).status, 'Sem captura');
  assert.equal(cartaoDoPonto(ponto({ servico: 'AL', situacao: 'inacessivel', contagens: null })).status, 'Inacessível');
});

test('OC mostra com ou sem ocorrência e a ação corretiva', () => {
  const c = cartaoDoPonto(ponto({ servico: 'OC', semOcorrencia: false, situacao: 'nao_conforme', observacao: 'Fezes de roedor.', acaoCorretiva: 'Vedação da porta.' }));
  assert.equal(c.status, 'Com ocorrência');
  assert.equal(c.obs, 'Fezes de roedor.\nAção corretiva: Vedação da porta.');
  assert.equal(cartaoDoPonto(ponto({ servico: 'OC', semOcorrencia: true })).status, 'Sem ocorrência');
});

test('resumo e ordem dos pontos', () => {
  assert.equal(resumoDosPontos([{ situacao: 'conforme' }, { situacao: 'nao_conforme' }, { situacao: 'conforme' }]), '3 pontos, 2 conformes');
  assert.equal(resumoDosPontos([{ situacao: 'nao_conforme' }]), '1 ponto, 0 conformes');
  const ordem = [ponto({ servico: 'OC', numero: 1 }), ponto({ servico: 'PI', numero: 2 }), ponto({ servico: 'PI', numero: 1 })]
    .sort(compararPontos).map((p) => `${p.servico}${p.numero}`);
  assert.deepEqual(ordem, ['PI1', 'PI2', 'OC1']);
});
