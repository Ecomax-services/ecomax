import { supabase } from '@/lib/supabase';
import type { NotificationItem, NotificationKind } from '@/data/notifications';

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
  return {
    id: r.id, kind, tagLabel: tagLabelOf(r.tipo), datetime: fmtDateTime(r.created_at),
    title: r.titulo, description: r.descricao ?? '', actionLabel: 'Ver detalhes', read: r.lida,
  };
}

/** Notificações do cliente (RLS filtra por para_cliente_id via e-mail do portal). */
export async function listNotificacoes(): Promise<NotificationItem[]> {
  const { data, error } = await supabase.from('notificacoes').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return (data as any[]).map(toItem);
}
export async function markRead(id: string): Promise<void> {
  const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function markAllRead(): Promise<void> {
  const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('lida', false);
  if (error) throw new Error(error.message);
}
export async function removeNotificacao(id: string): Promise<void> {
  const { error } = await supabase.from('notificacoes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
