/**
 * "Hoje" e "daqui a N dias" no fuso de quem está usando o sistema.
 *
 * O idioma corrente era `new Date().toISOString().slice(0, 10)`, que devolve a
 * data em **UTC**. Em São Paulo (UTC−3) isso significa que, das 21h à
 * meia-noite, o sistema inteiro passa a acreditar que já é amanhã:
 *
 *   • a aba "Hoje" dos follow-ups mostra os de amanhã e esconde os de hoje;
 *   • criar um follow-up para hoje é recusado com "data no passado";
 *   • `isPastDate` marca como vencida a OS programada para hoje;
 *   • um ASO que vence hoje passa a bloquear o técnico.
 *
 * Nenhum desses cálculos quer o dia UTC — todos querem o dia do calendário de
 * quem está olhando para a tela.
 */
export const hojeISO = (): string => diaISO(new Date());

/** O dia de `d` em ISO (`YYYY-MM-DD`), pelo relógio local. */
export function diaISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * O dia N dias à frente (ou atrás, com N negativo).
 *
 * Anda pelo calendário com `setDate` em vez de somar 86 400 000 ms: nos dias de
 * mudança de horário de verão o dia não tem 24 horas, e a soma em milissegundos
 * erra a data.
 */
export function emDiasISO(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return diaISO(d);
}
