// Testes do PDF do relatório técnico. Rodar:
//   deno test -A supabase/functions/relatorio/
// Com RELATORIO_AMOSTRA=<arquivo.pdf>, grava o PDF para conferência visual.
import { assert, assertEquals } from 'jsr:@std/assert@1';
import type { DadosRelatorio, PontoLido } from '../_shared/relatorio.ts';
import { gerarPdf } from '../_shared/pdf.ts';
import { LOGO_PADRAO } from '../_shared/logo.ts';
import { documentoRelatorio } from './documento.ts';

// Amostra igual à de shared/tests/relatorio.test.ts: todos os tipos de bloco.
const OS = 'os-hoje';
const ANTES = 'os-antes';

const ponto = (p: Partial<PontoLido>): PontoLido => ({
  os_id: OS, id: Math.random().toString(36).slice(2), cliente_ponto_id: null, area_id: 'fab', area_texto: null,
  servico: 'PI', fase: null, numero: 1, local: 'Doca', situacao: 'conforme', status_codigo: 3, status_rotulo: 'Isca Intacta',
  contagens: null, sem_ocorrencia: null, observacao: null, acao_corretiva: null, ...p,
});

export function dados(): DadosRelatorio {
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
    historico: {
      ano: 2026, mes_atual: 8,
      visitas: [
        { ano: 2025, mes: 8, area_id: 'fab', area_texto: null, servico: 'PI', fase: 1, n: 1 },
        { ano: 2026, mes: 7, area_id: 'fab', area_texto: null, servico: 'PI', fase: 1, n: 1 },
        { ano: 2026, mes: 8, area_id: 'fab', area_texto: null, servico: 'PI', fase: 1, n: 2 },
        { ano: 2026, mes: 8, area_id: 'fab', area_texto: null, servico: 'PI', fase: 2, n: 1 },
        { ano: 2026, mes: 8, area_id: 'fab', area_texto: null, servico: 'PA', fase: null, n: 1 },
        { ano: 2025, mes: 8, area_id: 'fab', area_texto: null, servico: 'AL', fase: null, n: 1 },
        { ano: 2026, mes: 8, area_id: 'fab', area_texto: null, servico: 'AL', fase: null, n: 2 },
        { ano: 2026, mes: 8, area_id: 'cd', area_texto: null, servico: 'OC', fase: null, n: 1 },
      ],
      status: [
        { ano: 2025, mes: 8, area_id: 'fab', area_texto: null, servico: 'PI', fase: 1, codigo: 1, n: 2 },
        { ano: 2026, mes: 7, area_id: 'fab', area_texto: null, servico: 'PI', fase: 1, codigo: 2, n: 1 },
        { ano: 2026, mes: 8, area_id: 'fab', area_texto: null, servico: 'PI', fase: 1, codigo: 1, n: 1 },
        { ano: 2026, mes: 8, area_id: 'fab', area_texto: null, servico: 'PI', fase: 1, codigo: 3, n: 1 },
        { ano: 2026, mes: 8, area_id: 'fab', area_texto: null, servico: 'PA', fase: null, codigo: 1, n: 1 },
      ],
      contagens: [
        { ano: 2025, mes: 8, area_id: 'fab', area_texto: null, servico: 'AL', especie: 'Mosca Doméstica', total: 10 },
        { ano: 2026, mes: 8, area_id: 'fab', area_texto: null, servico: 'AL', especie: 'Mosca Doméstica', total: 5 },
        { ano: 2026, mes: 8, area_id: 'fab', area_texto: null, servico: 'AL', especie: 'Outros', total: 1 },
      ],
      ocorrencias: [{ ano: 2026, mes: 8, area_id: 'cd', area_texto: null, n: 1 }],
      capturas: [{ ano: 2026, mes: 8, area_id: 'fab', especie: 'Lagartixa', n: 1 }],
    },
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
    fotos: [],
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


const textoDo = (doc: unknown) => JSON.stringify(doc);

Deno.test('o PDF sai, com cabeçalho de PDF e mais de uma página', async () => {
  const conteudo = { observacoes: 'Sem intercorrências.', parecer: 'Ambiente sob controle.', visibilidade: { 'fab:CN': true } };
  const doc = documentoRelatorio(dados(), conteudo, 2, new Date('2026-08-30T15:00:00Z'), { logo: LOGO_PADRAO });
  const pdf = await gerarPdf(doc);
  assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), '%PDF-');
  const paginas = (new TextDecoder('latin1').decode(pdf).match(/\/Type \/Page[^s]/g) ?? []).length;
  assert(paginas >= 2, `páginas: ${paginas}`);
  const saida = Deno.env.get('RELATORIO_AMOSTRA');
  if (saida) await Deno.writeFile(saida, pdf);
});

Deno.test('bloco oculto não entra; notas internas nunca entram', () => {
  const doc = documentoRelatorio(dados(), { observacoes: 'x', parecer: 'y', visibilidade: { 'fab:PI:f1': false } }, 2, new Date(), { logo: LOGO_PADRAO });
  const t = textoDo(doc);
  assert(!t.includes('Porta-Isca (semanal) · Fábrica · Fase 1'), 'bloco oculto apareceu');
  assert(t.includes('Porta-Isca (semanal) · Fábrica · Fase 2'));
  // Captura Não-Alvo e Comparativo: ocultos por padrão.
  assert(!t.includes('Captura Não-Alvo'));
  assert(!t.includes('Iscas Consumidas × Placas com Ocorrência'));
});

Deno.test('texto do bloco entra; sem texto, o aviso do protótipo', () => {
  const doc = documentoRelatorio(dados(), { blocos: { 'fab:PA': 'Placas trocadas na expedição.' } }, 3, new Date(), { logo: LOGO_PADRAO });
  const t = textoDo(doc);
  assert(t.includes('Placas trocadas na expedição.'));
  assert(t.includes('Sem complemento descritivo nesta versão.'));
  assert(t.includes('v3'));
});
