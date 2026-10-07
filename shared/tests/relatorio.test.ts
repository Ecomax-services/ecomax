// Montagem dos blocos do relatório técnico — testes.
//
// Fixa as regras do protótipo aprovado do Backoffice: um bloco por área ×
// serviço × fase, a ordem dos blocos, os ocultos por padrão (Captura Não-Alvo
// e Comparativo), a grade por visita seguindo o mesmo ponto do mapa, e o que
// a versão guarda (textos, incluir/ocultar, frequência).
//
// Rodar: node --import ./scripts/testes/registrar.mjs --test "shared/tests/*.test.ts"

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  abreviacoes, contagemDeBlocos, frequenciaDe, incluidos, montarBlocos, rotuloDoPeriodo,
  type BlocoAplicacao, type BlocoComparativo, type BlocoContagem, type BlocoOcorrencia, type BlocoStatus,
  type DadosRelatorio, type PontoLido,
} from '../relatorio.ts';

const OS = 'os-hoje';
const ANTES = 'os-antes';

const ponto = (p: Partial<PontoLido>): PontoLido => ({
  os_id: OS, id: Math.random().toString(36).slice(2), cliente_ponto_id: null, area_id: 'fab', area_texto: null,
  servico: 'PI', fase: null, numero: 1, local: 'Doca', situacao: 'conforme', status_codigo: 3, status_rotulo: 'Isca Intacta',
  contagens: null, sem_ocorrencia: null, observacao: null, acao_corretiva: null, ...p,
});

function dados(): DadosRelatorio {
  return {
    os: {
      id: OS, codigo: 'OS-1', status: 'executada', tipos: ['Desratização'], pragas: [], data_execucao: '2026-08-30',
      inicio: null, termino: null, endereco_execucao: null, assinante_nome: 'Ana',
      cliente: { id: 'c', nome: 'Cliente', endereco: null }, equipe: ['Técnico'], tecnico_executor: 'Técnico',
    },
    empresa: { razao_social: 'ECOMAX', cnpj: '04009610000107', endereco: null, contato: null, ceatox: null, logo_path: null },
    licencas: [],
    responsavel_tecnico: null,
    relatorio: { versao_atual: 1, versao_publicada: null, publicado_em: null },
    janela: { de: '2026-08-03', ate: '2026-08-30' },
    areas: [{ id: 'fab', nome: 'Fábrica', ordem: 1 }, { id: 'cd', nome: 'CD', ordem: 2 }],
    visitas: [
      { os_id: OS, codigo: 'OS-1', data: '2026-08-30' },
      { os_id: ANTES, codigo: 'OS-0', data: '2026-08-20' },
    ],
    planos: [
      { id: 'p1', servico: 'DI', tipo_controle: 'Desinsetização', frequencia: null },
      { id: 'p2', servico: 'PI', tipo_controle: 'Controle Roedores', frequencia: 'Semanal' },
      { id: 'p3', servico: 'PA', tipo_controle: 'Controle Roedores', frequencia: 'Semanal' },
      { id: 'p4', servico: 'AL', tipo_controle: 'Armadilha Luminosa', frequencia: 'Quinzenal' },
      { id: 'p5', servico: 'OC', tipo_controle: 'Monitoramento de Áreas', frequencia: 'Mensal' },
    ],
    pontos: [
      // O mesmo PI-01 (fase 1) nas duas visitas; PI-02 na fase 2.
      ponto({ cliente_ponto_id: 'pi1', fase: 1, status_codigo: 1, status_rotulo: 'Isca Consumida', situacao: 'nao_conforme' }),
      ponto({ os_id: ANTES, cliente_ponto_id: 'pi1', fase: 1, status_codigo: 3 }),
      ponto({ cliente_ponto_id: 'pi2', fase: 2, numero: 2, local: 'Pátio' }),
      ponto({ cliente_ponto_id: 'pa1', servico: 'PA', status_codigo: 1, status_rotulo: 'Placa com ocorrência', situacao: 'nao_conforme' }),
      ponto({ cliente_ponto_id: 'al1', servico: 'AL', contagens: { 'Mosca Doméstica': 3, 'Mosca Varejeira': 0 }, status_codigo: null }),
      ponto({ os_id: ANTES, cliente_ponto_id: 'al1', servico: 'AL', contagens: { 'Mosca Doméstica': 2, Outros: 1 }, status_codigo: null }),
      ponto({ cliente_ponto_id: 'oc1', servico: 'OC', area_id: 'cd', local: 'Refeitório', situacao: 'nao_conforme', sem_ocorrencia: false, contagens: { Barata: 1 }, observacao: 'Ralo sem tela', acao_corretiva: 'Telamento', status_codigo: null }),
      ponto({ cliente_ponto_id: 'oc2', servico: 'OC', area_id: 'cd', local: 'Doca', situacao: 'conforme', sem_ocorrencia: true, status_codigo: null }),
    ],
    aplicacoes: [{ id: 'a1', produto: 'Gel', lote: 'L1', tecnica: 'Aplicação de Gel', quantidade: 35, unidade: 'g', areas: ['Fábrica'] }],
    placas: [{ id: 'pa1', area_id: 'fab', fase: null, numero: 1, local: 'Expedição' }, { id: 'pa2', area_id: 'fab', fase: null, numero: 2, local: 'Vestiário' }],
    capturas: [{ os_id: OS, cliente_ponto_id: 'pa2', especie: 'Lagartixa' }],
    especies_nao_alvo: ['Aranha', 'Lagartixa', 'Grilo', 'Barata', 'Outros'],
    legendas: [
      { tipo_servico: 'Desratização', servico: 'PI', codigo: 1, nome: 'Isca Consumida', cor_bg: null, cor_fg: null },
      { tipo_servico: 'Desratização', servico: 'PI', codigo: 3, nome: 'Isca Intacta', cor_bg: '#eaf6ea', cor_fg: '#1a5c1a' },
    ],
  };
}

const todos = (g: ReturnType<typeof montarBlocos>) => g.flatMap((x) => x.blocos);

test('um bloco por área × serviço × fase, na ordem do protótipo', () => {
  const g = montarBlocos(dados());
  assert.deepEqual(g.map((x) => x.areaNome), ['Fábrica', 'CD']);
  assert.deepEqual(g[0].blocos.map((b) => b.rotulo), [
    'Desinsetização',
    'Desratização · Porta-Isca (semanal) · Fase 1',
    'Desratização · Porta-Isca (semanal) · Fase 2',
    'Desratização · Placa Adesiva (semanal)',
    'Pontos de Monitoramento · Iscas Consumidas × Placas com Ocorrência',
    'Captura Não-Alvo (semanal)',
    'Armadilhas Luminosas (quinzenal)',
  ]);
  assert.deepEqual(g[1].blocos.map((b) => b.rotulo), ['Ocorrências']);
  assert.equal(g[0].blocos[1].titulo, 'Desratização · Porta-Isca (semanal) · Fábrica · Fase 1');
});

test('Captura Não-Alvo e Comparativo saem ocultos; o resto incluído', () => {
  const g = montarBlocos(dados());
  const ocultos = todos(g).filter((b) => !b.incluido).map((b) => b.servico);
  assert.deepEqual(ocultos.sort(), ['CMP', 'CN']);
  assert.deepEqual(contagemDeBlocos(g), { incluidos: 6, total: 8 });
  assert.equal(todos(incluidos(g)).length, 6);
});

test('a versão manda: incluir/ocultar, frequência e texto do bloco', () => {
  const id = 'fab:PI:f1';
  const g = montarBlocos(dados(), {
    visibilidade: { [id]: false, 'fab:CN': true },
    frequencias: { [id]: 'quinzenal' },
    blocos: { [id]: 'Consumo concentrado na doca.' },
  });
  const pi = todos(g).find((b) => b.id === id)!;
  assert.equal(pi.incluido, false);
  assert.equal(pi.frequencia, 'quinzenal');
  assert.equal(pi.rotulo, 'Desratização · Porta-Isca (quinzenal) · Fase 1');
  assert.equal(pi.texto, 'Consumo concentrado na doca.');
  assert.equal(todos(g).find((b) => b.id === 'fab:CN')!.incluido, true);
});

test('grade por visita segue o mesmo ponto do mapa', () => {
  const pi = todos(montarBlocos(dados())).find((b) => b.id === 'fab:PI:f1') as BlocoStatus;
  assert.deepEqual(pi.visitas.map((v) => v.data), ['2026-08-20', '2026-08-30']);
  assert.equal(pi.linhas.length, 1);
  assert.equal(pi.linhas[0].codigo, 'PI-01');
  assert.deepEqual(pi.linhas[0].celulas[ANTES], { valor: 3, rotulo: 'Isca Intacta' });
  assert.deepEqual(pi.linhas[0].celulas[OS], { valor: 1, rotulo: 'Isca Consumida' });
  assert.equal(pi.resumo, '1 de 1 porta-iscas verificados no app · 2 visitas no período · 20/08 a 30/08');
  // Legenda: rótulo da Planilha; cor da Planilha ou a padrão do protótipo.
  assert.deepEqual(pi.legenda.map((l) => [l.codigo, l.nome, l.bg]), [[1, 'Isca Consumida', '#fdece8'], [3, 'Isca Intacta', '#eaf6ea']]);
  assert.deepEqual(pi.totais.map((t) => t.n), [1, 1]);
});

test('Desinsetização lista as aplicações; sem legenda 1 a 4', () => {
  const di = todos(montarBlocos(dados())).find((b) => b.servico === 'DI') as BlocoAplicacao;
  assert.equal(di.areaNome, 'Fábrica');
  assert.deepEqual(di.aplicacoes, [{ produto: 'Gel', lote: 'L1', tecnica: 'Aplicação de Gel', areas: 'Fábrica', quantidade: '35 g' }]);
  assert.equal(di.resumo, '1 aplicação registrada no app · Aplicação de Gel');
  assert.equal(di.frequencia, null);
});

test('contagem soma o período por armadilha e por espécie', () => {
  const al = todos(montarBlocos(dados())).find((b) => b.servico === 'AL') as BlocoContagem;
  assert.deepEqual(al.especies, ['Mosca Doméstica', 'Outros']);
  assert.deepEqual(al.linhas[0].contagens, { 'Mosca Doméstica': 5, Outros: 1 });
  assert.equal(al.totalGeral, 6);
  assert.equal(al.indiceMedio, 6);
  assert.match(al.resumo, /^1 armadilhas com contagem lançada no app · 6 no total · 2 visitas/);
});

test('ocorrências: só o que teve ocorrência vira linha', () => {
  const oc = todos(montarBlocos(dados())).find((b) => b.servico === 'OC') as BlocoOcorrencia;
  assert.deepEqual(oc.linhas, [{ data: '2026-08-30', setor: 'Refeitório', ocorrencia: 'Ralo sem tela', praga: 'Barata', acao: 'Telamento' }]);
  assert.equal(oc.resumo, '1 ocorrência setorial registrada na execução');
});

test('comparativo: iscas consumidas × placas com ocorrência por visita', () => {
  const cmp = todos(montarBlocos(dados())).find((b) => b.servico === 'CMP') as BlocoComparativo;
  assert.deepEqual(cmp.serie, [{ data: '2026-08-20', iscas: 0, placas: 0 }, { data: '2026-08-30', iscas: 1, placas: 1 }]);
  assert.equal(cmp.totalIscas, 1);
  assert.equal(cmp.totalPlacas, 1);
});

test('Captura Não-Alvo: linhas são as placas da área, células a espécie', () => {
  const cn = todos(montarBlocos(dados())).find((b) => b.servico === 'CN') as BlocoStatus;
  assert.deepEqual(cn.linhas.map((l) => l.codigo), ['CN-01', 'CN-02']);
  assert.deepEqual(cn.linhas[1].celulas[OS], { valor: 'LG', rotulo: 'Lagartixa' });
  assert.equal(cn.linhas[0].celulas[OS], null);
  assert.equal(cn.totais.find((t) => t.nome === 'Lagartixa')!.n, 1);
});

test('ponto sem mapa cai na área de texto, ou em "Geral"', () => {
  const d = dados();
  d.pontos = [ponto({ area_id: null, area_texto: 'Galpão 2' }), ponto({ area_id: null, area_texto: null, numero: 2 })];
  d.planos = [{ id: 'p', servico: 'PI', tipo_controle: 'x', frequencia: null }];
  assert.deepEqual(montarBlocos(d).map((g) => g.areaNome), ['Galpão 2', 'Geral']);
});

test('utilitários', () => {
  assert.equal(frequenciaDe('Quinzenal'), 'quinzenal');
  assert.equal(frequenciaDe('SEMANAL'), 'semanal');
  assert.equal(frequenciaDe('Bimestral'), null);
  assert.equal(rotuloDoPeriodo([{ os_id: 'a', codigo: 'x', data: '2026-08-30' }]), '1 visita no período · 30/08');
  assert.deepEqual([...abreviacoes(['Aranha', 'Lagartixa', 'Grilo', 'Barata', 'Outros', 'Mariposa']).values()], ['AR', 'LG', 'GR', 'BA', 'OU', 'MA']);
});
