/**
 * Escapa texto para interpolação segura em HTML.
 *
 * Necessário em qualquer lugar que monte markup por string a partir de dado
 * cadastrado pelo usuário (nome, cargo, setor…). Sem isso, um funcionário
 * chamado `<img src=x onerror=…>` executa script na janela de impressão.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
