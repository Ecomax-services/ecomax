/**
 * PDF do relatório técnico — definição do documento para o pdfmake.
 *
 * Parte dos blocos montados por `_shared/relatorio.ts` (o mesmo código da
 * tela do Backoffice) e dos gráficos de `_shared/graficos.ts` (o mesmo SVG da
 * tela). Ordem, do protótipo aprovado:
 *   1. cabeçalho "Relatório técnico de execução" e quadro Cliente / Local /
 *      Equipe / Pontos;
 *   2. dados fixos da capa;
 *   3. bloco descritivo ("abre o relatório, antes dos blocos por serviço"):
 *      observações técnicas, recomendações e parecer;
 *   4. os blocos incluídos, por área — ocultos ficam de fora;
 *   5. sugestões de melhoria e assinaturas.
 * As notas internas nunca entram.
 *
 * Fotos não entram: a pré-visualização do protótipo não as mostra.
 *   [A DEFINIR — confirmar com o cliente se o PDF leva a galeria.]
 */

import {
  MESES_CURTOS, ddmm, incluidos, montarBlocos,
  type Bloco, type ConteudoVersao, type DadosRelatorio, type Meses, type Tendencia,
} from '../_shared/relatorio.ts';
import { CORES_GRAFICO, graficoDeBarras, type Serie } from '../_shared/graficos.ts';

const TINTA = '#151619';
const CINZA = '#686f7d';
const CLARO = '#959ba7';
const LINHA = '#eef0ee';

const br = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
const cnpj = (c: string | null | undefined) => {
  const d = (c ?? '').replace(/\D/g, '');
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : c ?? '';
};

// deno-lint-ignore no-explicit-any
type No = any;

const rotulo = (t: string): No => ({ text: t.toUpperCase(), fontSize: 7.5, bold: true, color: CLARO, characterSpacing: 0.6, margin: [0, 10, 0, 3] });

const layoutTabela: No = {
  hLineWidth: (i: number) => (i === 0 ? 0 : 0.5), vLineWidth: () => 0, hLineColor: () => LINHA,
  paddingTop: () => 2.5, paddingBottom: () => 2.5, paddingLeft: () => 3, paddingRight: () => 3,
};

function tabela(cab: string[], linhas: No[][], larguras?: (string | number)[], fonte = 8): No {
  return {
    table: {
      headerRows: 1,
      widths: larguras ?? cab.map(() => '*'),
      body: [
        cab.map((c) => ({ text: c, bold: true, fontSize: 7, color: CLARO, fillColor: '#f7f8f7' })),
        ...(linhas.length ? linhas : [[{ text: 'Nada registrado no período.', colSpan: cab.length, color: CLARO, alignment: 'center' }, ...cab.slice(1).map(() => '')]]),
      ],
    },
    layout: layoutTabela,
    fontSize: fonte,
    margin: [0, 0, 0, 6],
  };
}

const chip = (v: string | number, bg: string, fg: string): No => ({ text: String(v), fillColor: bg, color: fg, bold: true, alignment: 'center' });

/** Tabela Jan–Dez com "—" para sem valor. */
function tabelaMeses(primeira: string, linhas: { rotulo: string; valores: Meses }[]): No {
  return tabela(
    [primeira, ...MESES_CURTOS],
    linhas.map((l) => [
      { text: l.rotulo, color: TINTA },
      ...l.valores.map((v) => ({ text: v == null ? '—' : v.toLocaleString('pt-BR'), alignment: 'center', color: v ? TINTA : CLARO })),
    ]),
    [92, ...MESES_CURTOS.map(() => '*')],
    7.5,
  );
}

/** Legenda com quadradinhos desenhados: a fonte do PDF não tem o caractere "■". */
const legenda = (itens: { nome: string; cor: string }[]): No => ({
  columns: itens.map((i) => ({
    width: 'auto',
    columns: [
      { canvas: [{ type: 'rect', x: 0, y: 2, w: 7, h: 7, color: i.cor }], width: 10 },
      { text: i.nome, fontSize: 7.5, color: CINZA, width: 'auto' },
    ],
    columnGap: 2,
  })),
  columnGap: 14,
  margin: [0, 2, 0, 0],
});

const temValor = (xs: Meses) => xs.some((v) => v != null);

const grafico = (series: Serie[], mesAtual: number, rotulos = false): No =>
  ({ svg: graficoDeBarras({ categorias: MESES_CURTOS, series, mesAtual, rotulos, largura: 640, altura: 170 }), width: 500, margin: [0, 2, 0, 4] });

function tendencia(t: Tendencia): No[] {
  const ate = t.ate ? MESES_CURTOS[t.ate - 1] : null;
  const variacao = t.variacao == null ? `Sem base em ${t.anoAnterior} para comparar`
    : `${t.variacao > 0 ? '+' : ''}${t.variacao}% contra ${t.anoAnterior}`;
  return [
    { text: `Tendência ${t.anoAnterior} × ${t.ano} · ${t.rotulo}`, bold: true, fontSize: 9, margin: [0, 6, 0, 1] },
    { text: ate ? `Comparação Jan a ${ate} contra o mesmo período de ${t.anoAnterior}` : `Ainda sem visita em ${t.ano}`, fontSize: 7.5, color: CLARO },
    // Sem dado nenhum nos dois anos, o gráfico seria só a grade vazia.
    ...(temValor(t.atual) || temValor(t.anterior) ? [
      legenda([{ nome: `${t.anoAnterior} · ano anterior`, cor: CORES_GRAFICO.anoAnterior }, { nome: `${t.ano} · ano atual`, cor: CORES_GRAFICO.anoAtual }]),
      grafico([
        { nome: String(t.anoAnterior), cor: CORES_GRAFICO.anoAnterior, valores: t.anterior },
        { nome: String(t.ano), cor: CORES_GRAFICO.anoAtual, valores: t.atual.map((v, i) => (i + 1 > t.ate ? null : v)) },
      ], 12),
    ] : []),
    { text: `Acumulado ${t.anoAnterior} no período: ${t.somaAnterior} · Acumulado ${t.ano} no período: ${t.somaAtual} · ${variacao}`, fontSize: 8, color: TINTA, margin: [0, 0, 0, 3] },
    tabelaMeses('', [{ rotulo: `${t.anoAnterior} · ano anterior`, valores: t.anterior }]),
  ];
}

function conteudoDoBloco(b: Bloco): No[] {
  if (b.tipo === 'aplicacao') {
    return [tabela(['Produto utilizado', 'Lote', 'Técnica', 'Áreas de atuação', 'Quantidade'],
      b.aplicacoes.map((a) => [a.produto, a.lote, a.tecnica, a.areas, a.quantidade]), ['*', 60, 80, '*', 60])];
  }
  if (b.tipo === 'status' || b.tipo === 'captura') {
    const cor = new Map(b.legenda.map((l) => [String(l.codigo), l]));
    const captura = b.tipo === 'captura';
    return [
      { text: b.legenda.map((l) => `${l.codigo} · ${l.nome}`).join('    '), fontSize: 7.5, color: CINZA, margin: [0, 0, 0, 3] },
      tabela(
        ['Nº', 'Localização', ...b.visitas.map((v) => ddmm(v.data))],
        b.linhas.map((l) => [
          { text: l.codigo, bold: true }, l.local,
          ...b.visitas.map((v) => {
            const c = l.celulas[v.os_id];
            if (!c) return { text: '—', color: CLARO, alignment: 'center' };
            const k = cor.get(String(c.valor));
            return chip(c.valor, k?.bg ?? '#f2f3f4', k?.fg ?? CINZA);
          }),
        ]),
        [40, '*', ...b.visitas.map(() => 34)],
      ),
      { text: (captura ? 'Capturas no período por tipo: ' : 'Totais por status no período: ') + b.totais.map((t) => `${captura ? t.nome : `${t.codigo} · ${t.nome}`}: ${t.n}`).join(' · '), fontSize: 8, margin: [0, 0, 0, 4] },
      { text: 'Consolidação anual', bold: true, fontSize: 9 },
      { text: 'Evolução mês a mês · meses sem visita aparecem sem valor', fontSize: 7.5, color: CLARO, margin: [0, 0, 0, 2] },
      tabelaMeses('Classificação', b.consolidacao.linhas.map((l) => ({ rotulo: captura ? l.nome : `${l.codigo} · ${l.nome}`, valores: l.valores }))),
      ...tendencia(b.tendencia),
    ];
  }
  if (b.tipo === 'contagem') {
    return [
      tabela(['Nº', 'Localização', ...b.especies, 'Total'],
        b.linhas.map((l) => [{ text: l.codigo, bold: true }, l.local, ...b.especies.map((e) => l.contagens[e] ?? 0), { text: String(l.total), bold: true }]),
        [40, '*', ...b.especies.map(() => 50), 40]),
      { text: `Consolidação geral do período: ${b.totalGeral} capturados · ${b.linhas.length} armadilha(s) · índice médio ${b.indiceMedio.toLocaleString('pt-BR')} por armadilha`, fontSize: 8, margin: [0, 0, 0, 4] },
      { text: 'Evolução mensal do total capturado', bold: true, fontSize: 9 },
      grafico([{ nome: 'Total', cor: CORES_GRAFICO.total, valores: b.mensal.total }], b.mensal.mesAtual, true),
      { text: 'Visão mensal por tipo', bold: true, fontSize: 9 },
      { text: 'Meses sem visita aparecem sem valor', fontSize: 7.5, color: CLARO, margin: [0, 0, 0, 2] },
      tabelaMeses('Tipo', b.mensal.porTipo.map((t) => ({ rotulo: t.especie, valores: t.valores }))),
      ...tendencia(b.tendencia),
    ];
  }
  if (b.tipo === 'ocorrencia') {
    return [
      tabela(['Data', 'Setor', 'Ocorrência apontada', 'Praga / indício', 'Ação'],
        b.linhas.map((l) => [br(l.data), l.setor, l.ocorrencia, l.praga, l.acao]), [48, 80, '*', 80, '*']),
      { text: 'Visão por período', bold: true, fontSize: 9 },
      tabelaMeses('Situação', [{ rotulo: 'Registradas', valores: b.mensal.registradas }]),
      ...tendencia(b.tendencia),
    ];
  }
  if (b.tipo !== 'comparativo') return [];
  return [
    { text: `${b.portaIscas} porta-iscas e ${b.placasAdesivas} placas adesivas · ${b.areaNome} · Jan a ${MESES_CURTOS[Math.max(0, b.mesAtual - 1)]} ${b.ano}`, fontSize: 7.5, color: CLARO },
    legenda([{ nome: 'Iscas consumidas', cor: CORES_GRAFICO.iscas }, { nome: 'Placas com ocorrência', cor: CORES_GRAFICO.placas }]),
    grafico([
      { nome: 'Iscas consumidas', cor: CORES_GRAFICO.iscas, valores: b.iscas },
      { nome: 'Placas com ocorrência', cor: CORES_GRAFICO.placas, valores: b.placas },
    ], b.mesAtual),
    { text: `Iscas consumidas no acumulado ${b.ano}: ${b.totalIscas} · Placas com ocorrência no acumulado ${b.ano}: ${b.totalPlacas} · ${b.relacao}`, fontSize: 8, margin: [0, 0, 0, 3] },
    tabelaMeses('', [{ rotulo: 'Iscas consumidas', valores: b.iscas }, { rotulo: 'Placas com ocorrência', valores: b.placas }]),
  ];
}

export interface Imagens { logo: string }

/** Monta o documento a partir dos dados crus e do conteúdo da versão. */
export function documentoRelatorio(dados: DadosRelatorio, conteudo: ConteudoVersao, versao: number, emitidoEm: Date, imagens: Imagens) {
  const os = dados.os;
  const grupos = incluidos(montarBlocos(dados, conteudo));
  const e = dados.empresa;
  const rt = dados.responsavel_tecnico;
  const pontosDaOs = dados.pontos.filter((p) => p.os_id === os.id);
  const verificados = pontosDaOs.filter((p) => p.situacao && p.situacao !== 'pendente').length;
  const texto = (v?: string) => (v?.trim() ? v.trim() : '—');

  const capa: [string, string][] = [
    ['Empresa executante', [e?.razao_social, e?.cnpj ? `CNPJ ${cnpj(e.cnpj)}` : null].filter(Boolean).join(' · ') || '—'],
    ['Endereço da executante', e?.endereco || '—'],
    ...dados.licencas.map((l) => [l.rotulo, l.descricao] as [string, string]),
    ['Responsável técnico', rt ? [rt.nome, rt.formacao, rt.conselho && rt.registro ? `${rt.conselho} ${rt.registro}` : null].filter(Boolean).join(' · ') : '—'],
    ['Ordem de serviço', `${os.codigo} · execução ${br(os.data_execucao)}`],
  ];

  const blocos: No[] = [];
  for (const g of grupos) {
    blocos.push({ text: g.areaNome, fontSize: 12, bold: true, color: TINTA, margin: [0, 14, 0, 2] });
    for (const b of g.blocos) {
      blocos.push(
        { text: b.titulo, fontSize: 10.5, bold: true, margin: [0, 8, 0, 1] },
        { text: b.resumo, fontSize: 7.5, color: CINZA, margin: [0, 0, 0, 4] },
        ...conteudoDoBloco(b),
        { text: b.texto.trim() || 'Sem complemento descritivo nesta versão.', fontSize: 8.5, color: b.texto.trim() ? TINTA : CLARO, italics: !b.texto.trim(), margin: [0, 3, 0, 4] },
      );
    }
  }

  const rodapeEmpresa = [e?.razao_social, e?.cnpj ? `CNPJ ${cnpj(e.cnpj)}` : null, e?.endereco, e?.contato].filter(Boolean).join(' · ');

  return {
    pageSize: 'A4',
    pageMargins: [36, 36, 36, 50],
    info: { title: `Relatório técnico ${os.codigo} · v${versao}`, author: 'Ecomax', creationDate: emitidoEm },
    defaultStyle: { font: 'Roboto', fontSize: 8.5, color: TINTA, lineHeight: 1.2 },
    footer: (pagina: number, total: number) => ({
      columns: [
        { text: rodapeEmpresa, fontSize: 6.5, color: CLARO, width: '*' },
        { text: `v${versao} · Emitido em ${emitidoEm.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · Página ${pagina} de ${total}`, fontSize: 6.5, color: CLARO, alignment: 'right', width: 170 },
      ],
      margin: [36, 18, 36, 0],
    }),
    content: [
      {
        columns: [
          { stack: [
            { text: 'Relatório técnico de execução', fontSize: 15, bold: true },
            { text: `${os.codigo} · ${os.tipos.join(', ') || '—'} · ${br(os.data_execucao)} · v${versao}`, fontSize: 8.5, color: CINZA, margin: [0, 2, 0, 0] },
          ] },
          { image: imagens.logo, fit: [100, 32], alignment: 'right', width: 110 },
        ],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 523, y2: 4, lineWidth: 1.5, lineColor: TINTA }], margin: [0, 0, 0, 8] },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [{ stack: [{ text: 'Cliente', fontSize: 7, color: CLARO }, os.cliente.nome] }, { stack: [{ text: 'Local', fontSize: 7, color: CLARO }, os.endereco_execucao || os.cliente.endereco || '—'] }],
            [{ stack: [{ text: 'Equipe', fontSize: 7, color: CLARO }, os.equipe.join(' · ') || os.tecnico_executor || '—'] }, { stack: [{ text: 'Pontos', fontSize: 7, color: CLARO }, `${pontosDaOs.length} pontos · ${verificados} verificados`] }],
          ],
        },
        layout: { hLineColor: () => LINHA, vLineColor: () => LINHA, hLineWidth: () => 0.5, vLineWidth: () => 0.5, paddingLeft: () => 6, paddingTop: () => 4, paddingBottom: () => 4 },
      },
      rotulo('Dados fixos da capa'),
      tabela(['Item', 'Valor'], capa.map(([r, v]) => [{ text: r, color: CLARO }, v]), [150, '*']),
      rotulo('Observações técnicas'), { text: texto(conteudo.observacoes) },
      rotulo('Recomendações ao cliente'), { text: texto(conteudo.recomendacoes) },
      rotulo('Parecer técnico'), { text: texto(conteudo.parecer) },
      ...blocos,
      rotulo('Sugestões de melhoria'), { text: texto(conteudo.sugestoes) },
      rotulo('Assinaturas'),
      {
        unbreakable: true,
        columns: [
          { stack: [{ canvas: [{ type: 'line', x1: 0, y1: 22, x2: 220, y2: 22, lineWidth: 0.6, lineColor: '#c8ccc8' }] }, { text: os.assinante_nome || '—', bold: true, margin: [0, 3, 0, 0] }, { text: 'Responsável no cliente', fontSize: 7.5, color: CLARO }] },
          { stack: [{ canvas: [{ type: 'line', x1: 0, y1: 22, x2: 220, y2: 22, lineWidth: 0.6, lineColor: '#c8ccc8' }] }, { text: os.tecnico_executor || '—', bold: true, margin: [0, 3, 0, 0] }, { text: 'Técnico responsável', fontSize: 7.5, color: CLARO }] },
        ],
        columnGap: 24,
      },
    ],
  };
}
