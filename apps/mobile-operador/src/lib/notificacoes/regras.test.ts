// Regras puras das Notificações, testadas fora do App.
//
// O que se prova aqui: a etiqueta pelo tipo gravado no banco, o destino do
// "Ver detalhes" e o "quando" no horário de Brasília.
//
// Rodar: node --import ./scripts/testes/registrar.mjs --test "apps/mobile-operador/src/**/*.test.ts"

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinoDe, etiquetaDe, quando } from './regras';

test('etiqueta: OS, Documento, Agenda; info com OS é assunto de OS', () => {
  assert.equal(etiquetaDe({ tipo: 'os', osId: 'x' }), 'OS');
  assert.equal(etiquetaDe({ tipo: 'info', osId: 'x' }), 'OS');
  assert.equal(etiquetaDe({ tipo: 'documento', osId: null }), 'Documento');
  assert.equal(etiquetaDe({ tipo: 'agenda', osId: null }), 'Agenda');
  assert.equal(etiquetaDe({ tipo: 'info', osId: null }), 'Aviso');
});

test('destino do "Ver detalhes"', () => {
  assert.deepEqual(destinoDe({ tipo: 'os', osId: 'x' }), { tipo: 'os', osId: 'x' });
  assert.deepEqual(destinoDe({ tipo: 'agenda', osId: null }), { tipo: 'agenda' });
  assert.deepEqual(destinoDe({ tipo: 'documento', osId: null }), { tipo: 'perfil' });
  assert.equal(destinoDe({ tipo: 'info', osId: null }), null);
});

test('quando: hoje, ontem ou dd/mm, sempre em Brasília', () => {
  const agora = new Date('2026-08-11T15:00:00Z'); // 12:00 em Brasília
  assert.equal(quando('2026-08-11T13:23:00Z', agora), 'Hoje · 10:23');
  assert.equal(quando('2026-08-10T19:44:00Z', agora), 'Ontem · 16:44');
  assert.equal(quando('2026-02-03T14:20:00Z', agora), '03/02 · 11:20');
  // 01:30 UTC de 11/8 ainda é 22:30 de 10/8 em Brasília: "Ontem".
  assert.equal(quando('2026-08-11T01:30:00Z', agora), 'Ontem · 22:30');
});
