// Gráficos do relatório em SVG — testes.
//
// Rodar: node --import ./scripts/testes/registrar.mjs --test "shared/tests/*.test.ts"

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escala, graficoDeBarras } from '../graficos.ts';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

test('escala com passo redondo', () => {
  assert.deepEqual(escala(7), { topo: 8, passo: 2 });
  assert.deepEqual(escala(23), { topo: 30, passo: 10 });
  assert.deepEqual(escala(140), { topo: 150, passo: 50 });
  assert.deepEqual(escala(1), { topo: 1, passo: 0.5 });
  assert.deepEqual(escala(0), { topo: 4, passo: 1 });
});

test('mês futuro vira barra cinza de 3px; mês sem visita não tem barra', () => {
  const valores = [1, null, 3, 0, null, null, 2, 5, null, null, null, null];
  const svg = graficoDeBarras({ categorias: MESES, series: [{ nome: 'Total', cor: '#2f9e44', valores }], mesAtual: 8, rotulos: true });
  assert.match(svg, /^<svg /);
  // Barras com valor (inclusive zero): Jan, Mar, Abr, Jul, Ago = 5 verdes; Set–Dez = 4 cinzas.
  assert.equal((svg.match(/fill="#2f9e44"/g) ?? []).length, 5);
  assert.equal((svg.match(/height="3" fill="#d8dadf"/g) ?? []).length, 4);
  assert.match(svg, />5<\/text>/);
  assert.equal((svg.match(/>Dez</g) ?? []).length, 1);
});

test('duas séries lado a lado, sem rótulos de valor', () => {
  const svg = graficoDeBarras({
    categorias: MESES, mesAtual: 12,
    series: [
      { nome: '2025', cor: '#c8ccd2', valores: Array(12).fill(1) },
      { nome: '2026', cor: '#2f9e44', valores: Array(12).fill(2) },
    ],
  });
  assert.equal((svg.match(/fill="#c8ccd2"/g) ?? []).length, 12);
  assert.equal((svg.match(/fill="#2f9e44"/g) ?? []).length, 12);
  assert.doesNotMatch(svg, /font-weight="bold"/);
});

test('texto é escapado', () => {
  const svg = graficoDeBarras({ categorias: ['<b>'], series: [{ nome: 'x', cor: '#000', valores: [1] }] });
  assert.doesNotMatch(svg, /<b>/);
  assert.match(svg, /&lt;b&gt;/);
});
