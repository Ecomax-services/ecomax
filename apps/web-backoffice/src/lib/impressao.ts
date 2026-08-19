import { escapeHtml } from '@/lib/html';

/**
 * Impressão e exportação em PDF pelo próprio navegador.
 *
 * Abre uma janela com o documento montado e chama a caixa de impressão, onde
 * "Salvar como PDF" já existe em todos os navegadores. É o caminho honesto para
 * documentos de tela: não inventa um renderizador só nosso, que divergiria do
 * que a pessoa vê, e não depende de servidor.
 *
 * Documentos de registro — relatório técnico e certificado, que saem assinados
 * e vão para o cliente — são outra história e pedem geração no servidor.
 */

export interface Coluna<T> {
  titulo: string;
  valor: (linha: T) => string;
  /** Alinhamento à direita para números, que assim alinham pela unidade. */
  numerica?: boolean;
}

interface OpcoesDocumento {
  titulo: string;
  subtitulo?: string;
  /** Blocos de rótulo e valor mostrados antes da tabela. */
  campos?: { rotulo: string; valor: string }[];
}

const ESTILO = `
  @page { margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #16210f;
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
  }
  header { border-bottom: 2px solid #0a2d0a; padding-bottom: 10px; margin-bottom: 16px; }
  .marca { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #1a5c1a; }
  h1 { font-size: 19px; margin: 4px 0 2px; }
  .sub { color: #5a6553; margin: 0; }
  .campos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 18px; margin-bottom: 16px; }
  .campo b { display: block; font-size: 9px; letter-spacing: .08em; text-transform: uppercase; color: #8b9483; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left; font-size: 9px; letter-spacing: .07em; text-transform: uppercase;
    color: #5a6553; border-bottom: 1.5px solid #cbd2c5; padding: 5px 6px;
  }
  td { border-bottom: .5px solid #e4e7e0; padding: 6px; vertical-align: top; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tfoot td { border: none; padding-top: 14px; color: #8b9483; font-size: 10px; }
  /* Repete o cabeçalho quando a tabela quebra entre páginas. */
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
`;

function abrir(html: string): boolean {
  const janela = window.open('', '_blank', 'width=900,height=700');
  if (!janela) return false;
  janela.document.write(html);
  janela.document.close();
  janela.focus();
  // O print precisa esperar o layout; sem o timeout, o Safari imprime em branco.
  setTimeout(() => janela.print(), 250);
  return true;
}

function montar(opcoes: OpcoesDocumento, corpo: string): string {
  const agora = new Date().toLocaleString('pt-BR');
  const campos = (opcoes.campos ?? [])
    .map((c) => `<div class="campo"><b>${escapeHtml(c.rotulo)}</b>${escapeHtml(c.valor)}</div>`)
    .join('');

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>${escapeHtml(opcoes.titulo)}</title>
<style>${ESTILO}</style></head>
<body>
  <header>
    <p class="marca">Ecomax · Controle de pragas</p>
    <h1>${escapeHtml(opcoes.titulo)}</h1>
    ${opcoes.subtitulo ? `<p class="sub">${escapeHtml(opcoes.subtitulo)}</p>` : ''}
  </header>
  ${campos ? `<div class="campos">${campos}</div>` : ''}
  ${corpo}
  <table><tfoot><tr><td>Emitido em ${escapeHtml(agora)}</td></tr></tfoot></table>
</body></html>`;
}

/**
 * Imprime uma listagem.
 *
 * Devolve false quando o navegador bloqueia a janela — a tela usa isso para
 * dizer o que houve, em vez de dar a impressão de que o documento foi gerado.
 */
export function imprimirLista<T>(
  opcoes: OpcoesDocumento,
  colunas: Coluna<T>[],
  linhas: T[],
): boolean {
  const cabecalho = colunas
    .map((c) => `<th${c.numerica ? ' class="num"' : ''}>${escapeHtml(c.titulo)}</th>`)
    .join('');
  const corpo = linhas
    .map(
      (l) =>
        `<tr>${colunas
          .map((c) => `<td${c.numerica ? ' class="num"' : ''}>${escapeHtml(c.valor(l))}</td>`)
          .join('')}</tr>`,
    )
    .join('');

  const tabela = linhas.length
    ? `<table><thead><tr>${cabecalho}</tr></thead><tbody>${corpo}</tbody></table>`
    : '<p style="color:#8b9483">Nenhum registro para os filtros aplicados.</p>';

  return abrir(montar(opcoes, tabela));
}

/** Imprime um documento de campos, com uma ou mais tabelas embaixo. */
export function imprimirFicha(
  opcoes: OpcoesDocumento,
  secoes: { titulo: string; colunas: Coluna<any>[]; linhas: any[] }[] = [],
): boolean {
  const corpo = secoes
    .map((s) => {
      if (!s.linhas.length) return '';
      const th = s.colunas.map((c) => `<th${c.numerica ? ' class="num"' : ''}>${escapeHtml(c.titulo)}</th>`).join('');
      const tb = s.linhas
        .map((l) => `<tr>${s.colunas.map((c) => `<td${c.numerica ? ' class="num"' : ''}>${escapeHtml(c.valor(l))}</td>`).join('')}</tr>`)
        .join('');
      return `<h2 style="font-size:13px;margin:16px 0 6px">${escapeHtml(s.titulo)}</h2>
              <table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table>`;
    })
    .join('');
  return abrir(montar(opcoes, corpo));
}
