// Máscaras de input — formatam enquanto o usuário digita e descartam caracteres inválidos.
export const onlyDigits = (v: string) => v.replace(/\D/g, '');

export function maskCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
export function maskRG(v: string) {
  const d = onlyDigits(v).slice(0, 9);
  return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1})$/, '$1-$2');
}
export function maskDate(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2');
}
export function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}
export function maskCEP(v: string) {
  return onlyDigits(v).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}
export function maskCNPJ(v: string) {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}
/** Inteiro não-negativo: mantém só dígitos. */
export function maskInt(v: string) {
  return onlyDigits(v);
}
/** Valor monetário/decimal: dígitos + um único separador decimal (mantém o 1º digitado). */
export function maskDecimal(v: string) {
  let s = v.replace(/[^\d.,]/g, '');
  const m = s.match(/[.,]/);
  if (m) {
    const i = s.indexOf(m[0]);
    s = s.slice(0, i + 1) + s.slice(i + 1).replace(/[.,]/g, '');  // remove separadores extras
  }
  return s;
}
