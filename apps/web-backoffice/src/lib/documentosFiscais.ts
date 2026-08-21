/**
 * Validação de CPF, CNPJ e e-mail.
 *
 * O cadastro de cliente aceitava `11.111.111/1111-11` como CNPJ e `nao-e-email`
 * como e-mail, e gravava os dois sem reclamar. Um CNPJ errado não incomoda no
 * dia do cadastro: incomoda na nota fiscal, no relatório que vai para o cliente
 * e na cobrança — longe de quem digitou, e sem pista de onde veio.
 *
 * A conferência do dígito verificador rejeita justamente o tipo de valor que
 * alguém inventa para preencher campo: sequências repetidas e números redondos.
 */

const so = (v: string) => v.replace(/\D/g, '');

/** Dígito verificador de CPF/CNPJ: soma ponderada, módulo 11. */
function digito(base: string, pesos: number[]): number {
  const soma = base.split('').reduce((acc, n, i) => acc + Number(n) * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cpfValido(valor: string): boolean {
  const n = so(valor);
  if (n.length !== 11) return false;
  // 000.000.000-00, 111.111.111-11 e afins passam na conta do módulo 11 e
  // precisam ser recusados à parte.
  if (/^(\d)\1{10}$/.test(n)) return false;
  const d1 = digito(n.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digito(n.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return n[9] === String(d1) && n[10] === String(d2);
}

export function cnpjValido(valor: string): boolean {
  const n = so(valor);
  if (n.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(n)) return false;
  const d1 = digito(n.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digito(n.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return n[12] === String(d1) && n[13] === String(d2);
}

/**
 * E-mail plausível. Não tenta abraçar a RFC — o que se quer aqui é pegar o
 * endereço digitado errado, não decidir se um endereço exótico é legal.
 */
export function emailValido(valor: string): boolean {
  const v = valor.trim();
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v) && v.length <= 254;
}

/** CEP brasileiro: oito dígitos. */
export const cepValido = (valor: string): boolean => so(valor).length === 8;
