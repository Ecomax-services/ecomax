/**
 * Regras puras da Agenda (sem rede, sem React): datas da semana e do mês,
 * rótulos, a pílula de status e o que abre ao tocar num item.
 *
 * Datas circulam como texto ISO (`2026-08-04`), que é o que o banco devolve em
 * colunas `date`. As contas são feitas em UTC sobre esse texto, para o fuso do
 * aparelho não empurrar um dia para trás à meia-noite.
 */

export const DIAS_DA_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const;
/** Cabeçalho do calendário do protótipo: a semana começa no domingo. */
export const CABECALHO_CALENDARIO = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;
const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
] as const;

const utc = (iso: string): Date => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date): string => d.toISOString().slice(0, 10);

/** Hoje no horário de Brasília, que é onde a OS é programada. */
export function hojeEmBrasilia(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(agora);
}

export function somarDias(data: string, n: number): string {
  const d = utc(data);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}

/** 0 = domingo … 6 = sábado. */
export function diaDaSemana(data: string): number {
  return utc(data).getUTCDay();
}

/**
 * Segunda-feira da semana da data. A lista do protótipo anda de segunda a
 * domingo ("3 a 9 de agosto" de 2026 vai de segunda a domingo), embora o
 * calendário comece no domingo.
 */
export function inicioDaSemana(data: string): string {
  return somarDias(data, -((diaDaSemana(data) + 6) % 7));
}

/** "3 a 9 de agosto"; "28 de setembro a 4 de outubro"; com ano só quando vira o ano. */
export function rotuloDaSemana(inicio: string): string {
  const fim = somarDias(inicio, 6);
  const [a1, m1, d1] = inicio.split('-').map(Number);
  const [a2, m2, d2] = fim.split('-').map(Number);
  if (a1 !== a2) return `${d1} de ${MESES[m1 - 1]} de ${a1} a ${d2} de ${MESES[m2 - 1]} de ${a2}`;
  if (m1 !== m2) return `${d1} de ${MESES[m1 - 1]} a ${d2} de ${MESES[m2 - 1]}`;
  return `${d1} a ${d2} de ${MESES[m1 - 1]}`;
}

/** Mês como `2026-08`. */
export type Mes = string;

export const mesDe = (data: string): Mes => data.slice(0, 7);

export function somarMeses(mes: Mes, n: number): Mes {
  const [a, m] = mes.split('-').map(Number);
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** "Agosto 2026". */
export function rotuloDoMes(mes: Mes): string {
  const [a, m] = mes.split('-').map(Number);
  const nome = MESES[m - 1];
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} ${a}`;
}

/** Primeiro e último dia do mês. */
export function limitesDoMes(mes: Mes): { de: string; ate: string } {
  const de = `${mes}-01`;
  return { de, ate: somarDias(`${somarMeses(mes, 1)}-01`, -1) };
}

/**
 * Casas do calendário: `null` para as vazias antes do dia 1 (a grade começa no
 * domingo), depois uma data por dia do mês.
 */
export function casasDoMes(mes: Mes): (string | null)[] {
  const { de, ate } = limitesDoMes(mes);
  const vazias: null[] = Array.from({ length: diaDaSemana(de) }, () => null);
  const dias: string[] = [];
  for (let d = de; d <= ate; d = somarDias(d, 1)) dias.push(d);
  return [...vazias, ...dias];
}

/** "04/08". */
export const ddmm = (data: string): string => `${data.slice(8, 10)}/${data.slice(5, 7)}`;

/** "Terça, 04/08" — título do dia escolhido no calendário. */
export const rotuloDoDia = (data: string): string => `${DIAS_DA_SEMANA[diaDaSemana(data)]}, ${ddmm(data)}`;

/** "Marcos Lima" → "ML"; "Ana" → "AN". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export const primeiroNome = (nome: string): string => nome.trim().split(/\s+/)[0] ?? nome;

/** Situação da OS para a Agenda. O protótipo tem só três pílulas. */
export type SituacaoNaAgenda = 'pendente' | 'em_execucao' | 'concluida' | 'nao_executada';

export function situacaoNaAgenda(status: string): SituacaoNaAgenda {
  if (status === 'executada' || status === 'concluida') return 'concluida';
  if (status === 'em_andamento') return 'em_execucao';
  // [A DEFINIR — "Não executada" na agenda está pendente com o cliente. Até
  // lá, aparece com o próprio nome e o tom neutro de "Pendente".]
  if (status === 'nao_executada') return 'nao_executada';
  return 'pendente';
}

/** Pílula de status, nas cores do protótipo aprovado. */
export const PILULA: Record<SituacaoNaAgenda, { rotulo: string; bg: string; fg: string }> = {
  pendente: { rotulo: 'Pendente', bg: '#f2f3f4', fg: '#515761' },
  em_execucao: { rotulo: 'Em execução', bg: '#fdf3e3', fg: '#8a6410' },
  concluida: { rotulo: 'Concluída', bg: '#e7f6e7', fg: '#1d6b25' },
  nao_executada: { rotulo: 'Não executada', bg: '#f2f3f4', fg: '#515761' },
};

/** O que abre ao tocar num item da agenda. */
export type Destino = 'execucao' | 'detalhe' | 'equipe';

/**
 * Regra do protótipo: OS de outro técnico abre o "Detalhes do serviço" da
 * equipe, só leitura; OS concluída abre o detalhe; o resto abre a execução.
 *
 * Duas situações que o protótipo não tem e o sistema tem: a OS que não aceita
 * mais execução (cancelada, não executada) abre o detalhe; a data de
 * cronograma antigo, que ainda não virou OS própria, também — executar ali
 * registraria a visita na OS de origem.
 */
export function destinoDoItem(item: { status: string; minha: boolean; cronogramaId: string | null }): Destino {
  if (!item.minha) return 'equipe';
  const situacao = situacaoNaAgenda(item.status);
  if (situacao === 'concluida' || situacao === 'nao_executada') return 'detalhe';
  if (item.cronogramaId) return 'detalhe';
  return 'execucao';
}

/** Ordem dentro do dia: pela hora prevista; sem hora vai para o fim. */
export function compararItens(a: { data: string; hora: string; codigo: string }, b: { data: string; hora: string; codigo: string }): number {
  return a.data.localeCompare(b.data)
    || (a.hora || '99:99').localeCompare(b.hora || '99:99')
    || a.codigo.localeCompare(b.codigo);
}

/**
 * Cores por operador. As três primeiras são as do protótipo (você e dois
 * colegas); equipe maior repete a sequência a partir da segunda.
 *   [A DEFINIR — o protótipo só desenha três operadores.]
 */
const CORES_OPERADOR = [
  { cor: '#2e7d32', chip: '#e8f4e9' },
  { cor: '#9a6b1c', chip: '#f8f0dc' },
  { cor: '#5f7034', chip: '#eef2e1' },
] as const;

export function corDoOperador(posicao: number): { cor: string; chip: string } {
  if (posicao <= 0) return CORES_OPERADOR[0];
  return CORES_OPERADOR[1 + ((posicao - 1) % (CORES_OPERADOR.length - 1))];
}
