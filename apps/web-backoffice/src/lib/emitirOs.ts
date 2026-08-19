import { supabase } from '@/lib/supabase';
import type { OsStatus } from '@/lib/operacional';
import type { TablesUpdate } from '@/lib/database.types';

/**
 * O fluxo de situação da tela 3.1.3.
 *
 * Cada ação declara de quais status ela sai, para qual leva, e que efeito
 * dispara. Modelar como dado — e não como uma cascata de `if` na tela — é o que
 * mantém as dez ações consistentes: a regra de quando um botão aparece fica num
 * lugar só, e o histórico ganha a mesma descrição em qualquer caminho.
 */
export interface AcaoFluxo {
  n: string;
  chave: string;
  label: string;
  /** Vazio significa "de qualquer situação editável". */
  de: OsStatus[];
  para: OsStatus | null;
  /** Efeitos além da mudança de situação. */
  efeito?: 'email' | 'baixar_estoque' | 'nova_data';
  /** Pede confirmação com motivo antes de aplicar. */
  exigeMotivo?: boolean;
  destrutiva?: boolean;
}

export const FLUXO: AcaoFluxo[] = [
  { n: '01', chave: 'emitir',       label: 'Emitir',         de: ['em_aberto'],                     para: 'emitida' },
  { n: '02', chave: 'email',        label: 'Enviar e-mail',  de: ['emitida', 'confirmada'],         para: null, efeito: 'email' },
  { n: '03', chave: 'confirmar',    label: 'Confirmar',      de: ['emitida'],                       para: 'confirmada' },
  { n: '04', chave: 'executado',    label: 'Executado',      de: ['confirmada', 'em_andamento'],    para: 'executada' },
  { n: '05', chave: 'baixar',       label: 'Baixar estoque', de: ['executada'],                     para: null, efeito: 'baixar_estoque' },
  { n: '06', chave: 'finalizar',    label: 'Finalizar',      de: ['executada'],                     para: 'concluida' },
  { n: '07', chave: 'cancelar',     label: 'Cancelar',       de: [],                                para: 'cancelada', exigeMotivo: true, destrutiva: true },
  { n: '08', chave: 'remarcar',     label: 'Remarcar',       de: ['emitida', 'confirmada'],         para: 'remarcada', efeito: 'nova_data', exigeMotivo: true },
  { n: '09', chave: 'alterar_data', label: 'Alterar data',   de: [],                                para: null, efeito: 'nova_data' },
  { n: '10', chave: 'nao_executada', label: 'Não executada', de: ['confirmada', 'em_andamento'],    para: 'nao_executada', exigeMotivo: true },
];

/** Situações em que a OS não aceita mais ação nenhuma. */
const FINAIS: OsStatus[] = ['concluida', 'cancelada'];

/**
 * Quais ações estão disponíveis agora.
 *
 * A lista vazia em `de` significa "qualquer situação ainda aberta" — é o caso
 * de cancelar e alterar data, que valem em quase todo o caminho.
 */
export function acoesDisponiveis(status: OsStatus): AcaoFluxo[] {
  if (FINAIS.includes(status)) return [];
  return FLUXO.filter((a) => (a.de.length === 0 ? true : a.de.includes(status)));
}

async function actorId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function registrar(osId: string, campo: string, de: string | null, para: string | null): Promise<void> {
  await supabase.from('os_historico').insert({
    os_id: osId, campo, valor_anterior: de, valor_novo: para, actor_id: await actorId(),
  });
}

export interface ResultadoAcao {
  novoStatus: OsStatus | null;
  mensagem: string;
}

/**
 * Aplica uma ação do fluxo.
 *
 * Concentra situação, efeito e histórico numa transação lógica só. Se cada
 * botão da tela fizesse isso por conta própria, o histórico dependeria de nove
 * lugares lembrarem de gravar — e um deles esqueceria.
 */
export async function aplicarAcao(
  osId: string,
  statusAtual: OsStatus,
  chave: string,
  extras: { motivo?: string; novaData?: string } = {},
): Promise<ResultadoAcao> {
  const acao = FLUXO.find((a) => a.chave === chave);
  if (!acao) throw new Error('Ação desconhecida.');

  const permitidas = acoesDisponiveis(statusAtual);
  if (!permitidas.some((a) => a.chave === chave)) {
    throw new Error(`"${acao.label}" não é possível com a OS em "${statusAtual}".`);
  }
  if (acao.exigeMotivo && !extras.motivo?.trim()) {
    throw new Error(`Explique o motivo para "${acao.label.toLowerCase()}".`);
  }
  if (acao.efeito === 'nova_data' && !extras.novaData) {
    throw new Error('Informe a nova data.');
  }

  // Tipado pela tabela: nome de coluna errado vira erro de compilação em vez
  // de update silenciosamente ignorado pelo PostgREST.
  const patch: TablesUpdate<'ordens_servico'> = {};
  if (acao.para) patch.status = acao.para;
  if (acao.efeito === 'nova_data') patch.data_programada = extras.novaData;
  if (acao.efeito === 'email') {
    patch.email_enviado = true;
    patch.email_enviado_em = new Date().toISOString();
  }
  if (chave === 'executado') patch.termino_execucao = new Date().toISOString();
  if (acao.chave === 'cancelar' && extras.motivo) patch.cancelamento_motivo = extras.motivo.trim();

  if (Object.keys(patch).length) {
    const { error } = await supabase.from('ordens_servico').update(patch).eq('id', osId);
    if (error) throw new Error(error.message);
  }

  if (acao.efeito === 'baixar_estoque') {
    const baixados = await baixarEstoqueDaOs(osId);
    await registrar(osId, 'Baixa de estoque', null, `${baixados} produto(s)`);
    return { novoStatus: null, mensagem: `Estoque baixado para ${baixados} produto(s).` };
  }

  if (acao.para) {
    await registrar(osId, 'Situação', statusAtual, acao.para);
  } else if (acao.efeito === 'nova_data') {
    await registrar(osId, 'Data programada', null, extras.novaData ?? null);
  } else if (acao.efeito === 'email') {
    await registrar(osId, 'E-mail ao cliente', null, 'Enviado');
  }

  if (extras.motivo?.trim()) {
    await registrar(osId, `Motivo · ${acao.label}`, null, extras.motivo.trim());
  }

  return { novoStatus: acao.para, mensagem: `${acao.label} registrado.` };
}

/**
 * Baixa do estoque o que foi efetivamente utilizado na OS.
 *
 * Só produtos com consumo informado: baixar pelo previsto lançaria movimentação
 * de algo que talvez não tenha sido aplicado. É idempotente por checar o
 * histórico — clicar duas vezes não baixa duas vezes.
 */
export async function baixarEstoqueDaOs(osId: string): Promise<number> {
  const { data: jaBaixado } = await supabase
    .from('os_historico')
    .select('id')
    .eq('os_id', osId)
    .eq('campo', 'Baixa de estoque')
    .limit(1);
  if (jaBaixado?.length) throw new Error('O estoque desta OS já foi baixado.');

  const { data: itens, error } = await supabase
    .from('os_produtos')
    .select('produto_id, qtd_utilizada, lote, produto:produto_id(nome)')
    .eq('os_id', osId)
    .not('qtd_utilizada', 'is', null);
  if (error) throw new Error(error.message);

  const usados = ((itens as any[]) ?? []).filter((i) => Number(i.qtd_utilizada) > 0);
  if (!usados.length) throw new Error('Nenhum produto teve consumo informado nesta OS.');

  const ator = await actorId();
  const { error: e } = await supabase.from('movimentacoes').insert(
    usados.map((i) => ({
      tipo: 'saida',
      produto_id: i.produto_id,
      quantidade: Number(i.qtd_utilizada),
      lote: i.lote || null,
      descricao: `Consumo na OS (baixa automática)`,
      ator_id: ator,
    })),
  );
  if (e) throw new Error(e.message);

  return usados.length;
}
