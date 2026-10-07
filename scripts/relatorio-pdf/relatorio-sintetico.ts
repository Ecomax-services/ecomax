// Relatório técnico SINTÉTICO para medir o custo do PDF (PR 20).
// Resultado e decisão: docs/relatorio-pdf-prova.md
// Estrutura próxima do aprovado: blocos por área × serviço com grade de
// pontos por visita (12 meses), gráfico de tendência em SVG, comparativo,
// produtos e galeria de fotos.
import pdfMake from 'npm:pdfmake@0.2.20/build/pdfmake.js';
import pdfFonts from 'npm:pdfmake@0.2.20/build/vfs_fonts.js';

// deno-lint-ignore no-explicit-any
const pm = pdfMake as any;
// deno-lint-ignore no-explicit-any
const f = pdfFonts as any;
pm.vfs = f.pdfMake?.vfs ?? f.vfs ?? f;

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const COR = ['#1d6b25', '#b45309', '#2a51bf', '#a3341f'];

function linha(valores: number[]): string {
  const max = Math.max(...valores, 1);
  const pts = valores.map((v, i) => `${20 + i * 40},${130 - (v / max) * 110}`).join(' ');
  const grade = [0, 1, 2, 3, 4].map((k) => `<line x1="20" x2="460" y1="${20 + k * 27.5}" y2="${20 + k * 27.5}" stroke="#e4e8e4" stroke-width="1"/>`).join('');
  const rotulos = MESES.map((m, i) => `<text x="${20 + i * 40}" y="148" font-size="9" text-anchor="middle" fill="#686f7d">${m}</text>`).join('');
  return `<svg width="480" height="155" viewBox="0 0 480 155">${grade}<polyline points="${pts}" fill="none" stroke="#1d6b25" stroke-width="2"/>${valores.map((v, i) => `<circle cx="${20 + i * 40}" cy="${130 - (v / max) * 110}" r="2.5" fill="#1d6b25"/>`).join('')}${rotulos}</svg>`;
}

function barras(a: number[], b: number[]): string {
  const max = Math.max(...a, ...b, 1);
  const r = MESES.map((m, i) => {
    const x = 20 + i * 38;
    const ha = (a[i] / max) * 110, hb = (b[i] / max) * 110;
    return `<rect x="${x}" y="${130 - ha}" width="14" height="${ha}" fill="#1d6b25"/><rect x="${x + 15}" y="${130 - hb}" width="14" height="${hb}" fill="#b45309"/><text x="${x + 14}" y="148" font-size="9" text-anchor="middle" fill="#686f7d">${m}</text>`;
  }).join('');
  return `<svg width="480" height="155" viewBox="0 0 480 155">${r}</svg>`;
}

const aleatorio = (semente: number) => () => { semente = (semente * 9301 + 49297) % 233280; return semente / 233280; };

export function relatorioSintetico(foto: string, escala = 1) {
  const rnd = aleatorio(42);
  const areas = ['Fábrica', 'Centro de Distribuição'];
  const servicos = ['Porta Iscas (PI)', 'Placas Adesivas (PA)', 'Armadilhas Luminosas (AL)', 'Pragas de Grãos (PG)', 'Ocorrência Setorial (OC)'];
  const pontosPorBloco = Math.round(30 * escala);
  // deno-lint-ignore no-explicit-any
  const content: any[] = [
    { text: 'Relatório Técnico de Monitoramento', fontSize: 18, bold: true },
    { text: 'Cliente [EXEMPLO] · Período: janeiro a dezembro de 2026 · Versão 3', color: '#686f7d', margin: [0, 2, 0, 12] },
  ];
  for (const area of areas) {
    for (const servico of servicos) {
      const corpo = [[{ text: 'Ponto', bold: true }, ...MESES.map((m) => ({ text: m, bold: true, alignment: 'center' }))]];
      for (let p = 1; p <= pontosPorBloco; p++) {
        corpo.push([{ text: `${servico.slice(-3, -1)}-${String(p).padStart(2, '0')}` }, ...MESES.map(() => {
          const c = 1 + Math.floor(rnd() * 4);
          return { text: String(c), alignment: 'center', color: COR[c - 1] };
        })] as never);
      }
      content.push(
        { text: `${area} · ${servico}`, fontSize: 12, bold: true, margin: [0, 10, 0, 4], pageBreak: content.length > 2 ? 'before' : undefined },
        { text: 'Frequência: mensal · Legenda: 1 Isca consumida · 2 Isca mofada · 3 Isca intacta · 4 Sem acesso', fontSize: 8, color: '#686f7d', margin: [0, 0, 0, 6] },
        { table: { headerRows: 1, widths: [44, ...MESES.map(() => '*')], body: corpo }, fontSize: 7.5, layout: 'lightHorizontalLines' },
        { text: 'Tendência (% não conforme por visita)', fontSize: 9, bold: true, margin: [0, 10, 0, 2] },
        { svg: linha(MESES.map(() => Math.round(rnd() * 40))), width: 480 },
        { text: 'Comparativo: iscas consumidas × placas com ocorrência', fontSize: 9, bold: true, margin: [0, 8, 0, 2] },
        { svg: barras(MESES.map(() => Math.round(rnd() * 20)), MESES.map(() => Math.round(rnd() * 20))), width: 480 },
      );
    }
  }
  const nFotos = Math.round(24 * escala);
  const linhasFotos = [];
  for (let i = 0; i < nFotos; i += 2) {
    linhasFotos.push({ columns: [{ image: `foto${i}`, width: 250 }, { image: `foto${i + 1}`, width: 250 }], columnGap: 12, margin: [0, 0, 0, 10] });
  }
  content.push({ text: 'Campos complementares · Galeria', fontSize: 12, bold: true, pageBreak: 'before', margin: [0, 0, 0, 8] }, ...linhasFotos);
  return {
    pageSize: 'A4', pageMargins: [36, 40, 36, 40],
    // Uma chave por foto: o pdfmake embute cada uma separadamente, como numa galeria real.
    images: Object.fromEntries(Array.from({ length: nFotos + 1 }, (_, i) => [`foto${i}`, foto])),
    defaultStyle: { fontSize: 8.5 },
    footer: (p: number, t: number) => ({ text: `Página ${p} de ${t}`, alignment: 'center', fontSize: 7.5, color: '#959ba7' }),
    content,
  };
}

export function gerar(def: unknown): Promise<Uint8Array> {
  return new Promise((ok, falha) => {
    try { pm.createPdf(def).getBuffer((b: Uint8Array) => ok(new Uint8Array(b))); } catch (e) { falha(e); }
  });
}
