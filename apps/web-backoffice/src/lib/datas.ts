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

/**
 * Converte `dd/mm/aaaa` para ISO, devolvendo `null` quando a data não existe.
 *
 * Havia duas cópias disto, uma em cada tela de colaborador, e as duas conferiam
 * só o formato: `31/02/2026` virava `2026-02-31` e seguia para o banco, que
 * recusava com um erro que não dizia qual campo estava errado. Trinta e um de
 * fevereiro não é erro de digitação exótico — é o que sai quando alguém troca a
 * ordem de dia e mês.
 */
export function brParaISO(valor: string): string | null {
  const m = valor.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, aaaa] = m;
  const d = new Date(`${aaaa}-${mm}-${dd}T00:00:00`);
  // O Date do JavaScript "conserta" data inexistente virando o mês: 31/02 vira
  // 03/03. Comparar de volta é o que denuncia.
  if (d.getFullYear() !== Number(aaaa) || d.getMonth() + 1 !== Number(mm) || d.getDate() !== Number(dd)) {
    return null;
  }
  return `${aaaa}-${mm}-${dd}`;
}

/** `true` quando o texto é uma data brasileira que existe. */
export const dataBrValida = (valor: string): boolean => brParaISO(valor) !== null;

/**
 * Confere as datas de um cadastro de pessoa e devolve o primeiro problema.
 *
 * Nascimento no futuro e admissão antes do nascimento são o mesmo erro visto de
 * dois ângulos: o ano digitado errado. Validade de documento **não** entra aqui
 * — ASO vencido é um estado real do mundo, e é justamente o que a regra de
 * bloqueio por documento precisa conseguir registrar.
 */
export function problemaNasDatas(nascimento: string, admissao: string): string | null {
  if (nascimento && !dataBrValida(nascimento)) return 'Data de nascimento inválida.';
  if (admissao && !dataBrValida(admissao)) return 'Data de admissão inválida.';

  const hoje = hojeISO();
  const nasc = nascimento ? brParaISO(nascimento) : null;
  const adm = admissao ? brParaISO(admissao) : null;

  if (nasc && nasc > hoje) return 'A data de nascimento está no futuro.';
  if (nasc && nasc < '1900-01-01') return 'Confira o ano de nascimento.';
  if (adm && nasc && adm < nasc) return 'A admissão não pode ser anterior ao nascimento.';
  return null;
}
