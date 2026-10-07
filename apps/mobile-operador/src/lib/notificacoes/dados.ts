import { supabase } from '@/lib/supabase';
import { msgErro } from '@/lib/erros';
import { destinoDe, etiquetaDe, quando, type DestinoNotificacao, type Etiqueta } from '@/lib/notificacoes/regras';

/**
 * Notificações do técnico. Uma linha por destinatário (PR 9): a RLS já filtra
 * por `para_profile_id = auth.uid()`, e marcar como lida ou excluir mexe só na
 * linha de quem fez.
 */

export interface NotifItem {
  id: string;
  etiqueta: Etiqueta;
  quando: string;
  titulo: string;
  texto: string;
  lida: boolean;
  destino: DestinoNotificacao;
}

export type FiltroNotif = 'todas' | 'nao-lidas' | 'lidas';

/** Tamanho da página do "Carregar mais". */
export const POR_PAGINA = 20;

/**
 * Uma página de notificações, da mais nova para a mais antiga. Pede uma a
 * mais que a página para saber se há "Carregar mais" sem contar a tabela.
 */
export async function listNotificacoes(filtro: FiltroNotif, pagina: number): Promise<{ itens: NotifItem[]; temMais: boolean }> {
  let q = supabase
    .from('notificacoes')
    .select('id, tipo, titulo, descricao, os_id, lida, created_at')
    .order('created_at', { ascending: false })
    .range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA);
  if (filtro === 'nao-lidas') q = q.eq('lida', false);
  if (filtro === 'lidas') q = q.eq('lida', true);
  const { data, error } = await q;
  if (error) throw new Error(msgErro(error));
  const linhas = data ?? [];
  return {
    temMais: linhas.length > POR_PAGINA,
    itens: linhas.slice(0, POR_PAGINA).map((r) => ({
      id: r.id,
      etiqueta: etiquetaDe({ tipo: r.tipo, osId: r.os_id }),
      quando: quando(r.created_at),
      titulo: r.titulo,
      texto: r.descricao ?? '',
      lida: r.lida,
      destino: destinoDe({ tipo: r.tipo, osId: r.os_id }),
    })),
  };
}

/**
 * Contador de não lidas, com assinantes.
 *
 * Recontar só na troca de aba não bastava: lendo uma notificação já dentro da
 * aba Notificações, o cabeçalho caía para 3 e o badge continuava 4 até sair e
 * voltar. Quem marca como lida avisa aqui, e o badge acompanha na hora.
 */
type OuvinteNaoLidas = (n: number) => void;
const ouvintes = new Set<OuvinteNaoLidas>();
let naoLidasAtual = 0;

export function assinarNaoLidas(fn: OuvinteNaoLidas): () => void {
  ouvintes.add(fn);
  fn(naoLidasAtual);
  return () => { ouvintes.delete(fn); };
}

export async function contarNaoLidas(): Promise<number> {
  const { count, error } = await supabase
    .from('notificacoes').select('id', { count: 'exact', head: true }).eq('lida', false);
  if (error) throw new Error(msgErro(error));
  naoLidasAtual = count ?? 0;
  ouvintes.forEach((fn) => fn(naoLidasAtual));
  return naoLidasAtual;
}

export async function marcarLida(id: string): Promise<void> {
  const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
  if (error) throw new Error(msgErro(error));
  await contarNaoLidas();
}

export async function marcarTodasLidas(): Promise<void> {
  const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('lida', false);
  if (error) throw new Error(msgErro(error));
  await contarNaoLidas();
}

/** Excluir apaga só a linha de quem excluiu: cada destinatário tem a sua. */
export async function excluirNotificacao(id: string): Promise<void> {
  const { error } = await supabase.from('notificacoes').delete().eq('id', id);
  if (error) throw new Error(msgErro(error));
  await contarNaoLidas();
}
