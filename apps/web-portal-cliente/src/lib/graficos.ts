/**
 * Gráficos do relatório técnico em SVG — fonte da verdade compartilhada.
 *
 * ARQUIVO CANÔNICO. Copiado para os apps por `scripts/sync-shared.sh`; o CI
 * falha se alguma cópia divergir.
 *
 * Gera o SVG como texto: o Backoffice desenha na tela e a Edge Function põe o
 * mesmo SVG no PDF (o pdfmake aceita SVG simples: retângulo, linha e texto).
 * Um gráfico só, para o escritório ver na tela exatamente o que o cliente
 * recebe.
 *
 * Do protótipo aprovado: barras por mês (Jan–Dez), meses que ainda não
 * chegaram com uma barra cinza de 3px, mês sem visita sem barra.
 */

export interface Serie {
  nome: string;
  cor: string;
  /** Doze valores; `null` = sem valor. */
  valores: (number | null)[];
}

export interface OpcoesBarras {
  categorias: string[];
  series: Serie[];
  /** Meses depois deste (1–12) ainda não chegaram: barra cinza fina. */
  mesAtual?: number;
  /** Escreve o valor acima de cada barra (só com uma série). */
  rotulos?: boolean;
  largura?: number;
  altura?: number;
}

const TEXTO = '#686f7d';
const GRADE = '#eceeec';
const FUTURO = '#d8dadf';

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Escala com passo "redondo" (1, 2 ou 5 × 10ⁿ) e até cinco linhas de grade:
 * 7 → 0, 2, 4, 6, 8; 23 → 0, 10, 20, 30; 140 → 0, 50, 100, 150.
 */
export function escala(max: number): { topo: number; passo: number } {
  if (!(max > 0)) return { topo: 4, passo: 1 };
  const bruto = max / 4;
  const ordem = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 5, 10].map((p) => p * ordem).find((p) => p >= bruto)!;
  return { topo: passo * Math.ceil(max / passo), passo };
}

const numero = (n: number) => (Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }));

/** Barras agrupadas por mês (uma ou mais séries). */
export function graficoDeBarras({ categorias, series, mesAtual = 12, rotulos = false, largura = 640, altura = 190 }: OpcoesBarras): string {
  const esq = 30, dir = 6, topo = rotulos ? 16 : 8, base = 20;
  const w = largura - esq - dir;
  const hgt = altura - topo - base;
  const { topo: max, passo } = escala(Math.max(0, ...series.flatMap((s) => s.valores.map((v) => v ?? 0))));
  const y = (v: number) => topo + hgt - (v / max) * hgt;
  const grupo = w / categorias.length;
  const larguraBarra = Math.max(3, Math.min(22, (grupo * 0.72) / series.length));
  const partes: string[] = [];

  for (let v = 0; v <= max + 1e-9; v += passo) {
    const yy = y(v).toFixed(1);
    partes.push(`<line x1="${esq}" x2="${largura - dir}" y1="${yy}" y2="${yy}" stroke="${GRADE}" stroke-width="1"/>`);
    partes.push(`<text x="${esq - 5}" y="${(y(v) + 3).toFixed(1)}" font-size="9" text-anchor="end" fill="${TEXTO}">${numero(v)}</text>`);
  }

  categorias.forEach((cat, i) => {
    const centro = esq + grupo * i + grupo / 2;
    const inicio = centro - (larguraBarra * series.length) / 2;
    const futuro = i + 1 > mesAtual;
    series.forEach((s, j) => {
      const x = (inicio + larguraBarra * j).toFixed(1);
      const bw = Math.max(2, larguraBarra - 1.5).toFixed(1);
      const v = s.valores[i];
      if (futuro) {
        partes.push(`<rect x="${x}" y="${(topo + hgt - 3).toFixed(1)}" width="${bw}" height="3" fill="${FUTURO}"/>`);
        return;
      }
      if (v == null) return;
      const yy = y(v);
      partes.push(`<rect x="${x}" y="${yy.toFixed(1)}" width="${bw}" height="${Math.max(0, topo + hgt - yy).toFixed(1)}" fill="${esc(s.cor)}"/>`);
      if (rotulos && series.length === 1) {
        partes.push(`<text x="${(Number(x) + Number(bw) / 2).toFixed(1)}" y="${(yy - 4).toFixed(1)}" font-size="9" font-weight="bold" text-anchor="middle" fill="${TEXTO}">${numero(v)}</text>`);
      }
    });
    partes.push(`<text x="${centro.toFixed(1)}" y="${altura - 6}" font-size="9" text-anchor="middle" fill="${TEXTO}">${esc(cat)}</text>`);
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}">${partes.join('')}</svg>`;
}

/** Cores do protótipo. */
export const CORES_GRAFICO = {
  anoAtual: '#2f9e44',
  anoAnterior: '#c8ccd2',
  iscas: '#c2410c',
  placas: '#2b5fa8',
  total: '#2f9e44',
};
