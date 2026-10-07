// Regras puras da Agenda, testadas fora do App.
//
// O que se prova aqui: a semana de segunda a domingo e o rótulo dela, a grade
// do mês começando no domingo, a pílula de status e o que abre ao tocar.
//
// Rodar: node --import ./scripts/testes/registrar.mjs --test "apps/mobile-operador/src/**/*.test.ts"

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  casasDoMes, compararItens, corDoOperador, destinoDoItem, hojeEmBrasilia, iniciais, inicioDaSemana,
  limitesDoMes, rotuloDaSemana, rotuloDoDia, rotuloDoMes, situacaoNaAgenda, somarMeses,
} from './regras';

test('a semana vai de segunda a domingo, como "3 a 9 de agosto" do protótipo', () => {
  assert.equal(inicioDaSemana('2026-08-03'), '2026-08-03'); // segunda
  assert.equal(inicioDaSemana('2026-08-09'), '2026-08-03'); // domingo fica na semana que acaba nele
  assert.equal(inicioDaSemana('2026-08-06'), '2026-08-03');
  assert.equal(rotuloDaSemana('2026-08-03'), '3 a 9 de agosto');
});

test('semana que vira o mês ou o ano diz os dois lados', () => {
  assert.equal(rotuloDaSemana('2026-09-28'), '28 de setembro a 4 de outubro');
  assert.equal(rotuloDaSemana('2026-12-28'), '28 de dezembro de 2026 a 3 de janeiro de 2027');
});

test('a grade de agosto de 2026 começa no sábado (6 casas vazias) e tem 31 dias', () => {
  const casas = casasDoMes('2026-08');
  assert.equal(casas.filter((c) => c === null).length, 6);
  assert.equal(casas.filter(Boolean).length, 31);
  assert.equal(casas[6], '2026-08-01');
  assert.equal(rotuloDoMes('2026-08'), 'Agosto 2026');
});

test('limites e navegação de mês atravessam o ano e o fevereiro', () => {
  assert.deepEqual(limitesDoMes('2028-02'), { de: '2028-02-01', ate: '2028-02-29' });
  assert.equal(somarMeses('2026-12', 1), '2027-01');
  assert.equal(somarMeses('2026-01', -1), '2025-12');
});

test('o dia escolhido no calendário sai como "Terça, 04/08"', () => {
  assert.equal(rotuloDoDia('2026-08-04'), 'Terça, 04/08');
});

test('hoje é o de Brasília, não o do UTC', () => {
  // 01:30 UTC de 5/8 ainda é 22:30 de 4/8 em Brasília.
  assert.equal(hojeEmBrasilia(new Date('2026-08-05T01:30:00Z')), '2026-08-04');
});

test('as três pílulas do protótipo cobrem os status do sistema', () => {
  assert.equal(situacaoNaAgenda('confirmada'), 'pendente');
  assert.equal(situacaoNaAgenda('remarcada'), 'pendente');
  assert.equal(situacaoNaAgenda('em_andamento'), 'em_execucao');
  assert.equal(situacaoNaAgenda('executada'), 'concluida');
  assert.equal(situacaoNaAgenda('concluida'), 'concluida');
  assert.equal(situacaoNaAgenda('nao_executada'), 'nao_executada');
});

test('tocar: OS de colega abre a equipe; concluída abre o histórico; o resto executa', () => {
  assert.equal(destinoDoItem({ status: 'confirmada', minha: false, cronogramaId: null }), 'equipe');
  assert.equal(destinoDoItem({ status: 'executada', minha: false, cronogramaId: null }), 'equipe');
  assert.equal(destinoDoItem({ status: 'executada', minha: true, cronogramaId: null }), 'historico');
  assert.equal(destinoDoItem({ status: 'nao_executada', minha: true, cronogramaId: null }), 'detalhe');
  assert.equal(destinoDoItem({ status: 'confirmada', minha: true, cronogramaId: null }), 'execucao');
  assert.equal(destinoDoItem({ status: 'em_andamento', minha: true, cronogramaId: null }), 'execucao');
});

test('data de cronograma antigo abre o detalhe da OS de origem, não a execução', () => {
  assert.equal(destinoDoItem({ status: 'confirmada', minha: true, cronogramaId: 'c1' }), 'detalhe');
});

test('dentro do dia, ordena pela hora; sem hora vai para o fim', () => {
  const itens = [
    { data: '2026-08-04', hora: '', codigo: 'OS-3' },
    { data: '2026-08-04', hora: '13:30', codigo: 'OS-2' },
    { data: '2026-08-04', hora: '08:30', codigo: 'OS-1' },
    { data: '2026-08-03', hora: '', codigo: 'OS-0' },
  ].sort(compararItens);
  assert.deepEqual(itens.map((i) => i.codigo), ['OS-0', 'OS-1', 'OS-2', 'OS-3']);
});

test('iniciais e cores de operador', () => {
  assert.equal(iniciais('Marcos Lima'), 'ML');
  assert.equal(iniciais('Ana Prado da Silva'), 'AS');
  assert.equal(iniciais('Ana'), 'AN');
  assert.equal(corDoOperador(0).cor, '#2e7d32');
  assert.equal(corDoOperador(1).cor, '#9a6b1c');
  assert.equal(corDoOperador(3).cor, '#9a6b1c'); // repete a partir da segunda
});
