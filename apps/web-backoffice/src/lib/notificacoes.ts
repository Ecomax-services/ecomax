import { supabase } from '@/lib/supabase';
import type { NotificationItem, NotificationKind } from '@/data/notifications';
import { msgErro } from '@/lib/erros';

const KIND_TAG: Record<NotificationKind, string> = { os: 'OS', info: 'Info', expired: 'Vencimento', estoque: 'Estoque' };

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export interface NotificacaoRow extends NotificationItem { osId: string | null; link: string | null; }

function toRow(r: any): NotificacaoRow {
  const kind = (['os', 'info', 'expired', 'estoque'].includes(r.tipo) ? r.tipo : 'info') as NotificationKind;
  return {
    id: r.id, kind, tagLabel: KIND_TAG[kind], datetime: fmtDateTime(r.created_at),
    title: r.titulo, description: r.descricao ?? '',
    actionLabel: r.os_id ? 'Ir para a OS' : 'Ver detalhes',
    read: r.lida, osId: r.os_id, link: r.link,
  };
}

// ---------- Consumo (RLS já filtra para o destinatário) ----------
export async function listNotificacoes(): Promise<NotificacaoRow[]> {
  const { data, error } = await supabase.from('notificacoes').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw new Error(msgErro(error));
  return (data as any[]).map(toRow);
}
export async function unreadCount(): Promise<number> {
  const { count, error } = await supabase.from('notificacoes').select('id', { count: 'exact', head: true }).eq('lida', false);
  if (error) throw new Error(msgErro(error));
  return count ?? 0;
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

// ---------- Produção ----------
export interface NovaNotificacao {
  paraProfileId?: string | null;
  paraRole?: string | null;
  paraClienteId?: string | null;
  tipo?: NotificationKind;
  titulo: string;
  descricao?: string | null;
  osId?: string | null;
  link?: string | null;
}
export async function criarNotificacao(n: NovaNotificacao): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('notificacoes').insert({
    para_profile_id: n.paraProfileId ?? null,
    para_role: n.paraRole ?? null,
    para_cliente_id: n.paraClienteId ?? null,
    tipo: n.tipo ?? 'info',
    titulo: n.titulo,
    descricao: n.descricao ?? null,
    os_id: n.osId ?? null,
    link: n.link ?? null,
    created_by: u.user?.id ?? null,
  });
  if (error) throw new Error(msgErro(error));
}
