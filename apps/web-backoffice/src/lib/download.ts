/**
 * Entrega um texto gerado no navegador como arquivo.
 *
 * A dança de Blob + objectURL + âncora temporária estava repetida dentro de
 * `UsuariosList`, e a exportação de garantias precisaria da terceira cópia.
 *
 * O BOM (U+FEFF) no começo não é enfeite: sem ele o Excel abre CSV em UTF-8
 * como se fosse Latin-1, e "Sanitização" chega como "SanitizaÃ§Ã£o".
 */
export function baixarArquivo(conteudo: string, nomeArquivo: string, mime = 'text/plain;charset=utf-8;'): void {
  const precisaBom = mime.includes('csv');
  const blob = new Blob([precisaBom ? '﻿' + conteudo : conteudo], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Sem o revoke o blob fica preso na memória da aba até o refresh — irrelevante
  // numa exportação, perceptível em quem exporta a lista inteira várias vezes.
  URL.revokeObjectURL(url);
}
