/**
 * Situações da Ordem de Serviço — fonte da verdade compartilhada.
 *
 * ARQUIVO CANÔNICO. Ele é copiado para os três apps por `scripts/sync-shared.sh`
 * e o CI falha se alguma cópia divergir. Edite aqui, rode o script, commite as
 * quatro versões. Editar direto no app faz o CI barrar.
 *
 * Por que existe: o handoff do design system pede, na seção de estados, que o
 * mapa de status seja "um único módulo compartilhado entre os três ambientes".
 * Até aqui eram três definições independentes — `web-backoffice/src/lib/
 * operacional.ts`, `web-portal-cliente/src/lib/operacional.ts` e
 * `mobile-operador/src/lib/operacional.ts` — que concordavam nos rótulos por
 * manutenção manual e já divergiam nas cores: o portal pintava `executada` e
 * `concluida` de igual, e o mobile usava um cinza (`#5b6470`) que não existe em
 * paleta nenhuma.
 *
 * As cores vêm em hexadecimal, e não em classe do Tailwind, porque o App
 * Operador é React Native e não tem Tailwind. Hex é o único formato que os três
 * ambientes leem sem tradução — e tradução é onde a divergência nasce.
 *
 * Todo hex abaixo existe na paleta do handoff. A seção "não faça" é explícita:
 * "Não introduza hex fora da paleta da seção 2, nem variações 'parecidas'".
 */

export interface CorDeStatus {
  /** Fundo da pílula. */
  bg: string;
  /** Texto da pílula. */
  fg: string;
}

/**
 * Os nove status que o catálogo `status_os` traz no seed.
 *
 * O handoff define cor para cinco deles. Os outros quatro nasceram do fluxo de
 * emissão de OS, existem no produto e continuam aqui — a decisão de projeto é
 * que **o catálogo manda** e o handoff é a base de cores, não a lista fechada.
 * Por isso `corDoStatus` nunca devolve `undefined`: status criado depois, em
 * Cadastros Auxiliares, cai num neutro previsível em vez de quebrar a tela.
 */
export const OS_STATUSES = [
  'em_aberto',
  'emitida',
  'confirmada',
  'em_andamento',
  'executada',
  'concluida',
  'remarcada',
  'nao_executada',
  'cancelada',
] as const;

export type OsStatus = (typeof OS_STATUSES)[number];

export const osStatusLabel: Record<OsStatus, string> = {
  em_aberto: 'Em aberto',
  emitida: 'Emitida',
  confirmada: 'Confirmada',
  em_andamento: 'Em andamento',
  executada: 'Executada',
  concluida: 'Concluída',
  remarcada: 'Remarcada',
  nao_executada: 'Não executada',
  cancelada: 'Cancelada',
};

/**
 * Par fixo de cores por status — o "contrato entre front e back" do handoff.
 *
 * Os cinco que o handoff define seguem exatamente o que está lá. Duas mudanças
 * são de significado, não de matiz, e merecem atenção ao revisar:
 *
 *   `em_aberto`  era azul informativo  → neutro. Uma OS recém-aberta não é um
 *                aviso; azul a destacava mais que "em andamento".
 *   `cancelada`  era vermelho de erro  → neutro claro. Cancelar é desfecho
 *                normal do fluxo, não falha do sistema. O vermelho fica
 *                reservado para o que exige ação.
 *
 * Os quatro que o handoff não cobre usam tokens da mesma paleta, escolhidos
 * pela família semântica: informativo para o que antecede a execução, âmbar
 * para o que foi adiado, neutro para o que não aconteceu.
 */
export const osStatusCor: Record<OsStatus, CorDeStatus> = {
  // --- definidos pelo handoff ---
  em_aberto: { bg: '#f2f3f4', fg: '#515761' }, // surface-chip / ink-600
  em_andamento: { bg: '#fdf3e3', fg: '#b45309' }, // warn-75 / warn
  executada: { bg: '#edfced', fg: '#2e6b31' }, // green-50 / green-450
  concluida: { bg: '#edfced', fg: '#155015' }, // green-50 / green-700
  cancelada: { bg: '#f2f3f4', fg: '#959ba7' }, // surface-chip / ink-400

  // --- do fluxo de emissão, cores derivadas da mesma paleta ---
  emitida: { bg: '#e8eefc', fg: '#3056b5' }, // info-50 / info
  confirmada: { bg: '#e8eefc', fg: '#3056b5' },
  remarcada: { bg: '#fdebd0', fg: '#b45309' }, // warn-100 / warn
  nao_executada: { bg: '#f2f3f4', fg: '#686f7d' }, // surface-chip / ink-500
};

/** Status vindo do catálogo que este módulo ainda não conhece. */
export const COR_STATUS_DESCONHECIDO: CorDeStatus = { bg: '#f2f3f4', fg: '#686f7d' };

/**
 * Rótulo legível de um status que pode não estar entre os nove.
 *
 * Desde que Cadastros Auxiliares passou a permitir criar status, `os.status`
 * deixou de ser um valor fechado em tempo de execução. Sem este fallback, o
 * mapa devolvia `undefined` e telas que chamavam `.toLowerCase()` logo em
 * seguida quebravam em branco — no mobile, em campo, sem rede para diagnosticar.
 */
export function rotuloStatus(status: string): string {
  const conhecido = osStatusLabel[status as OsStatus];
  if (conhecido) return conhecido;
  const texto = status.replace(/_/g, ' ').trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Par de cores de um status, sempre definido. */
export function corDoStatus(status: string): CorDeStatus {
  return osStatusCor[status as OsStatus] ?? COR_STATUS_DESCONHECIDO;
}

/** Situações em que a OS não aceita mais edição. */
export function isReadOnly(status: string): boolean {
  return status === 'concluida' || status === 'cancelada' || status === 'nao_executada';
}
