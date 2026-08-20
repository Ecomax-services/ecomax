/**
 * Copia um texto para a área de transferência e diz honestamente se conseguiu.
 *
 * `navigator.clipboard` só existe em contexto seguro — https ou localhost. Num
 * QA acessado por IP em http, ele simplesmente não está lá, e as três chamadas
 * do sistema reagiam de três jeitos, nenhum deles bom: uma engolia o erro e
 * anunciava "Link gerado e copiado" mesmo sem copiar; outra não dizia nada, e o
 * clique parecia não ter função; a terceira estourava.
 *
 * O fallback com `execCommand` é antigo, mas é o que resta fora de contexto
 * seguro — e quando nem ele funciona, quem chamou precisa saber, para mostrar o
 * texto e deixar a pessoa copiar à mão.
 */
export async function copiar(texto: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // Permissão negada pelo navegador — ainda vale tentar o caminho antigo.
    }
  }
  try {
    const area = document.createElement('textarea');
    area.value = texto;
    // Fora da tela, mas dentro do documento: `execCommand` não copia de um
    // elemento que não está renderizado.
    area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    area.setAttribute('readonly', '');
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
