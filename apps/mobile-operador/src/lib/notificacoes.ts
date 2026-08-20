import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import { msgErro } from '@/lib/erros';

export type NotifKind = 'os' | 'info' | 'warn';

export interface NotifItem {
  id: string;
  kind: NotifKind;
  tagLabel: string;
  datetime: string;
  title: string;
  description: string;
  read: boolean;
  /** OS de origem, quando houver — é o que faz o toque levar a algum lugar. */
  osId: string | null;
}

export const tagColors: Record<NotifKind, { bg: string; fg: string }> = {
  os: { bg: colors.primarySoft, fg: colors.primary },
  info: { bg: colors.infoBg, fg: colors.infoFg },
  warn: { bg: colors.warnBg, fg: colors.warnFg },
};

function mapKind(tipo: string): NotifKind {
  if (tipo === 'os') return 'os';
  if (tipo === 'info') return 'info';
  return 'warn'; // expired | estoque
}
const KIND_TAG: Record<NotifKind, string> = { os: 'OS', info: 'Info', warn: 'Aviso' };

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Notificações do operador (RLS filtra por para_profile_id = auth.uid()). */
export async function listNotificacoes(): Promise<NotifItem[]> {
  const { data, error } = await supabase.from('notificacoes').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw new Error(msgErro(error));
  return (data as any[]).map((r) => {
    const kind = mapKind(r.tipo);
    return { id: r.id, kind, tagLabel: KIND_TAG[kind], datetime: fmtDateTime(r.created_at), title: r.titulo, description: r.descricao ?? '', read: r.lida, osId: r.os_id ?? null };
  });
}
/**
 * Contador de não lidas, com assinantes.
 *
 * Recontar só na troca de aba não bastava: lendo uma notificação já dentro da
 * aba Notificações, o cabeçalho caía para 3 e o badge continuava 4 até sair e
 * voltar. Quem marca como lida avisa aqui, e o badge acompanha na hora.
 *
 * A RLS já escopa por profile/role, então a contagem sai certa sem filtro extra.
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
export async function markRead(id: string): Promise<void> {
  const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
  if (error) throw new Error(msgErro(error));
  await contarNaoLidas();
}
export async function markAllRead(): Promise<void> {
  const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('lida', false);
  if (error) throw new Error(msgErro(error));
  await contarNaoLidas();
}
