import { supabase } from '@/lib/supabase';
import { msgErro } from '@/lib/erros';

export type NotificationKind = 'os' | 'info';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  tagLabel: string;
  datetime: string;
  title: string;
  description: string;
  actionLabel: string;
  /** Rota para onde o CTA leva, ou null quando a notificação é só informativa. */
  destino: string | null;
  read: boolean;
}

/** Estilos de tag por tipo (Figma node 31:788). */
export const tagStyles: Record<NotificationKind, string> = {
  os: 'bg-forest-100 text-forest-900',
  info: 'bg-infoTag-bg text-infoTag-fg',
};

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// O portal só possui os tons 'os' e 'info'; demais tipos caem em 'info' (rótulo reflete o tipo real).
function tagLabelOf(tipo: string): string {
  return tipo === 'os' ? 'OS' : tipo === 'estoque' ? 'Estoque' : tipo === 'expired' ? 'Vencimento' : 'Info';
}

function toItem(r: any): NotificationItem {
  const kind: NotificationKind = r.tipo === 'os' ? 'os' : 'info';
  // O rótulo do CTA acompanha o destino. "Ver detalhes" era genérico e, pior,
  // não levava a lugar nenhum: o botão não navegava.
  const destino = r.os_id ? '/ordens' : (r.link as string | null) ?? null;
  return {
    id: r.id, kind, tagLabel: tagLabelOf(r.tipo), datetime: fmtDateTime(r.created_at),
    title: r.titulo, description: r.descricao ?? '',
    actionLabel: r.os_id ? 'Ver ordem de serviço' : 'Ver detalhes',
    destino, read: r.lida,
  };
}

/** Quantas notificações são trazidas por vez pelo "Carregar mais". */
export const PAGINA = 20;

/**
 * Notificações do cliente (RLS filtra por para_cliente_id via e-mail do portal).
 *
 * Paginado: o limite fixo de 100 escondia o resto sem avisar — a tela não tinha
 * como saber que havia mais, e nem o design pedia que soubesse.
 */
export async function listNotificacoes(
  pagina = 0,
): Promise<{ itens: NotificationItem[]; temMais: boolean }> {
  const de = pagina * PAGINA;
  // Pede um a mais do que cabe na página: se vier, é porque existe próxima.
  const { data, error } = await supabase
    .from('notificacoes')
    .select('*')
    .order('created_at', { ascending: false })
    .range(de, de + PAGINA);
  if (error) throw new Error(msgErro(error));
  const linhas = data as any[];
  return { itens: linhas.slice(0, PAGINA).map(toItem), temMais: linhas.length > PAGINA };
}
export async function markRead(id: string): Promise<void> {
  const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
  if (error) throw new Error(msgErro(error));
}
export async function markAllRead(): Promise<void> {
  const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('lida', false);
  if (error) throw new Error(msgErro(error));
}
export async function removeNotificacao(id: string): Promise<void> {
  const { error } = await supabase.from('notificacoes').delete().eq('id', id);
  if (error) throw new Error(msgErro(error));
}

/**
 * Quantas notificações o usuário ainda não leu.
 *
 * `head: true` traz só a contagem, sem as linhas — o badge do menu é pedido a
 * cada navegação e não precisa do conteúdo. Antes disso o badge era o literal
 * `2` no Sidebar: não contava nada e nunca mudava, nem depois de marcar tudo
 * como lido.
 */
export async function contarNaoLidas(): Promise<number> {
  const { count, error } = await supabase
    .from('notificacoes')
    .select('id', { count: 'exact', head: true })
    .eq('lida', false);
  if (error) return 0; // o badge não é motivo para derrubar a navegação
  return count ?? 0;
}
