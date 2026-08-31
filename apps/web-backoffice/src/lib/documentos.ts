import type { BadgeTone } from '@/components/ui/Badge';
import { hojeISO } from '@/lib/datas';
export { hojeISO };

/**
 * A resposta única para "este ASO/CNH está em dia?".
 *
 * A pergunta era respondida em quatro lugares — `lib/clientes.ts`,
 * `lib/funcionarios.ts`, `lib/operacional.ts` e o app do Operador — e as
 * respostas divergiam em dois pontos que aparecem na tela:
 *
 *  • **O dia do vencimento.** Três comparavam contra a meia-noite de hoje e um
 *    contra o relógio (`Date.now()`), então um documento que vence hoje aparecia
 *    como "vencido" em Clientes e "a vencer" em Gestão de Usuários — e o de
 *    Clientes é justamente o que bloqueia.
 *  • **Documento ausente.** Gestão de Usuários e Clientes mostravam "Não se
 *    aplica" (cinza, inofensivo) para quem não tem ASO nem CNH cadastrados,
 *    enquanto o Operacional recusava a mesma pessoa no seletor de equipe. Hoje
 *    são três técnicos de campo nessa situação, um deles o usuário de QA.
 *
 * Um documento vale **até** a data impressa nele: vencer hoje é estar válido
 * hoje. Ausência não é dispensa — para quem vai a campo, é impedimento.
 */
export type DocState = 'ok' | 'soon' | 'expired' | 'ausente' | 'sem_validade';

const DIA = 86400000;

/** Dias de antecedência com que um vencimento passa a ser alertado. */
export const JANELA_ALERTA_DIAS = 30;


const meiaNoiteDeHoje = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t.getTime();
};

export function docState(iso: string | null): DocState {
  if (!iso) return 'ausente';
  const venc = new Date(iso + 'T00:00:00').getTime();
  const hoje = meiaNoiteDeHoje();
  if (venc < hoje) return 'expired';
  if (venc <= hoje + JANELA_ALERTA_DIAS * DIA) return 'soon';
  return 'ok';
}

export const docTone: Record<DocState, BadgeTone> = {
  ok: 'success',
  soon: 'warn',
  expired: 'danger',
  // Falta de documento é pendência, não neutralidade: quem some no cinza some
  // do radar de quem precisa cobrar o envio.
  ausente: 'warn',
  sem_validade: 'softWarn',
};

/** O que a etiqueta mostra quando não há data. */
export const SEM_DATA = 'Não enviado';
/** Arquivo anexado, validade em branco. */
export const SEM_VALIDADE = 'Sem validade';

/**
 * Estado do documento considerando o arquivo **e** a validade.
 *
 * `docState` sozinha olha só a data, e o QA pegou a consequência: quem anexa o
 * ASO sem preencher a validade via "Não enviado" ao lado do arquivo que acabara
 * de enviar. São duas pendências diferentes — falta o documento, ou falta a data
 * dele — e cada uma pede uma cobrança diferente.
 */
export function docStateComArquivo(validadeISO: string | null, arquivoUrl: string | null): DocState {
  if (!validadeISO) return arquivoUrl ? 'sem_validade' : 'ausente';
  return docState(validadeISO);
}

/** O rótulo da etiqueta, dado o estado e a data já formatada. */
export function docLabel(estado: DocState, dataBR: string): string {
  if (estado === 'ausente') return SEM_DATA;
  if (estado === 'sem_validade') return SEM_VALIDADE;
  return dataBR;
}

/** Motivo do bloqueio — o rótulo na tela precisa dizer qual dos dois é. */
export type MotivoBloqueio = 'vencido' | 'ausente' | null;

export const bloqueioLabel = (m: MotivoBloqueio): string =>
  m === 'vencido' ? 'doc. vencido' : m === 'ausente' ? 'doc. não enviado' : '';

/**
 * Cargos que vão a campo e por isso precisam de ASO e CNH.
 *
 * Documento ausente só bloqueia para eles: gestoras, analistas e supervisão
 * entram na OS para acompanhar, não para executar, e exigir os documentos delas
 * tiraria gente legítima do seletor. Documento *vencido* continua bloqueando
 * qualquer cargo — quem tem o documento cadastrado precisa dele em dia.
 */
export const CARGOS_DE_CAMPO = ['Técnico de Campo'];

/** Avalia ASO e CNH de um funcionário. É este o critério que bloqueia de fato. */
export function avaliarDocumentos(
  cargo: string | null, aso: string | null, cnh: string | null, hoje: string = hojeISO(),
): MotivoBloqueio {
  const docs = [aso, cnh];
  if (docs.some((d) => !!d && d < hoje)) return 'vencido';
  if (CARGOS_DE_CAMPO.includes(cargo ?? '') && docs.some((d) => !d)) return 'ausente';
  return null;
}
