import { supabase } from '@/lib/supabase';
import { msgErro } from '@/lib/erros';
import { compararItens } from '@/lib/agenda/regras';

/**
 * Leitura da Agenda. A minha vem das tabelas, pela RLS de sempre (só as OS em
 * que estou escalado). A da equipe vem de `agenda_da_equipe`, que devolve só o
 * que a tela mostra — o gestor não ganha leitura das OS dos colegas.
 */

export interface ItemAgenda {
  /** Única na lista: a OS, ou a OS mais a data de cronograma antigo. */
  chave: string;
  osId: string;
  /** Data de cronograma de antes das visitas virarem OS própria. */
  cronogramaId: string | null;
  codigo: string;
  data: string;
  hora: string;
  duracao: string;
  status: string;
  cliente: string;
  endereco: string;
  tipos: string;
  pragas: string;
  /** Técnicos da equipe escalados na OS (vazio na minha agenda). */
  funcionarios: string[];
}

export interface MembroEquipe {
  funcionarioId: string;
  nome: string;
  souEu: boolean;
}

const nomeOf = (c: unknown): string => {
  const um = Array.isArray(c) ? c[0] : c;
  return (um as { nome?: string } | null)?.nome ?? '—';
};
const juntar = (xs: string[] | null | undefined): string => (xs ?? []).join(', ');

interface LinhaOs {
  id: string;
  codigo: string;
  status: string;
  data_programada: string | null;
  hora_prevista: string | null;
  duracao_estimada: string | null;
  tipos_servico: string[] | null;
  pragas: string[] | null;
  rascunho: boolean | null;
  cliente: unknown;
}

const CAMPOS_OS = 'id, codigo, status, data_programada, hora_prevista, duracao_estimada, tipos_servico, pragas, rascunho, cliente:cliente_id(nome)';

function deOs(o: LinhaOs, data: string, cronogramaId: string | null, status = o.status): ItemAgenda {
  return {
    chave: cronogramaId ? `${o.id}-${cronogramaId}` : o.id,
    osId: o.id, cronogramaId, codigo: o.codigo, data,
    hora: o.hora_prevista ?? '', duracao: o.duracao_estimada ?? '', status,
    cliente: nomeOf(o.cliente), endereco: '',
    tipos: juntar(o.tipos_servico) || '—', pragas: juntar(o.pragas), funcionarios: [],
  };
}

const valida = (o: LinhaOs | null | undefined): o is LinhaOs => !!o && o.status !== 'cancelada' && !o.rascunho;

/** As minhas OS entre duas datas, mais as datas de cronograma antigo no período. */
export async function listMinhaAgenda(de: string, ate: string): Promise<ItemAgenda[]> {
  const [os, crono] = await Promise.all([
    supabase.from('ordens_servico').select(CAMPOS_OS)
      .gte('data_programada', de).lte('data_programada', ate).neq('status', 'cancelada'),
    // Data que já virou OS própria aparece pela própria OS, na consulta de cima.
    supabase.from('os_cronograma')
      .select(`id, data_prevista, status, os:ordens_servico!os_cronograma_os_id_fkey(${CAMPOS_OS})`)
      .is('visita_os_id', null).neq('status', 'cancelada')
      .gte('data_prevista', de).lte('data_prevista', ate),
  ]);
  if (os.error) throw new Error(msgErro(os.error));
  if (crono.error) throw new Error(msgErro(crono.error));

  const itens: ItemAgenda[] = [];
  for (const o of (os.data ?? []) as unknown as LinhaOs[]) {
    if (valida(o) && o.data_programada) itens.push(deOs(o, o.data_programada, null));
  }
  for (const c of (crono.data ?? []) as unknown as { id: string; data_prevista: string; status: string; os: LinhaOs | LinhaOs[] | null }[]) {
    const o = Array.isArray(c.os) ? c.os[0] : c.os;
    // Visita antiga já feita aparece feita, mesmo com a OS de origem aberta.
    if (valida(o)) itens.push(deOs(o, c.data_prevista, c.id, c.status === 'concluida' ? 'concluida' : o.status));
  }
  return itens.sort(compararItens);
}

/** Eu e quem eu coordeno. Só eu = não sou gestor, e a agenda da equipe não aparece. */
export async function minhaEquipe(): Promise<MembroEquipe[]> {
  const { data, error } = await supabase.rpc('minha_equipe');
  if (error) throw new Error(msgErro(error));
  return (data ?? []).map((m) => ({ funcionarioId: m.funcionario_id, nome: m.nome, souEu: m.sou_eu }));
}

/** A agenda da equipe entre duas datas (no máximo 62 dias). */
export async function listAgendaDaEquipe(de: string, ate: string): Promise<ItemAgenda[]> {
  const { data, error } = await supabase.rpc('agenda_da_equipe', { _de: de, _ate: ate });
  if (error) throw new Error(msgErro(error));
  return (data ?? []).map((r) => ({
    chave: r.cronograma_id ? `${r.os_id}-${r.cronograma_id}` : r.os_id,
    osId: r.os_id, cronogramaId: r.cronograma_id, codigo: r.codigo, data: r.data,
    hora: r.hora ?? '', duracao: r.duracao ?? '', status: r.status,
    cliente: r.cliente ?? '—', endereco: r.endereco ?? '',
    tipos: juntar(r.tipos) || '—', pragas: juntar(r.pragas), funcionarios: r.funcionarios ?? [],
  })).sort(compararItens);
}
