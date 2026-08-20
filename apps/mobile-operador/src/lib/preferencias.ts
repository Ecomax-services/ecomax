import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

/**
 * Preferências do operador.
 *
 * `badge` fica no aparelho: é preferência de exibição, muda por celular e não
 * vale a viagem ao servidor a cada leitura do contador.
 *
 * `email` fica em `profiles.preferencias`: quem escolhe receber (ou não)
 * notificação por e-mail escolhe uma vez, não uma vez por aparelho. Trocar de
 * celular não pode reativar um e-mail que a pessoa desligou.
 */
export interface Preferencias {
  /** Mostrar o número vermelho na aba Notificações. */
  badge: boolean;
  /** Receber cópia das notificações por e-mail. Ainda sem produtor no sistema. */
  email: boolean;
}

const CHAVE_BADGE = 'ecomax.pref.badge';

/** Assinantes do badge — a aba precisa reagir ao toque na chave, sem recarregar. */
type Ouvinte = (mostrar: boolean) => void;
const ouvintes = new Set<Ouvinte>();
let badgeAtual = true;

export function assinarPrefBadge(fn: Ouvinte): () => void {
  ouvintes.add(fn);
  fn(badgeAtual);
  return () => { ouvintes.delete(fn); };
}

export async function carregarPrefBadge(): Promise<boolean> {
  const v = await AsyncStorage.getItem(CHAVE_BADGE);
  // Ausente = ligado: quem nunca abriu Preferências deve ver o aviso de OS nova.
  badgeAtual = v === null ? true : v === 'true';
  ouvintes.forEach((fn) => fn(badgeAtual));
  return badgeAtual;
}

export async function definirPrefBadge(v: boolean): Promise<void> {
  badgeAtual = v;
  ouvintes.forEach((fn) => fn(v));
  await AsyncStorage.setItem(CHAVE_BADGE, String(v));
}

export async function carregarPrefEmail(): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) return false;
  const { data: p } = await supabase.from('profiles').select('preferencias').eq('id', id).single();
  const prefs = (p?.preferencias ?? {}) as Record<string, unknown>;
  return prefs.notificacoes_email === true;
}

export async function definirPrefEmail(v: boolean): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error('Sessão expirada.');
  // Mescla em vez de sobrescrever: o jsonb é compartilhado com outras
  // preferências, e um update cru apagaria as dos outros apps.
  const { data: p } = await supabase.from('profiles').select('preferencias').eq('id', id).single();
  const prefs = { ...((p?.preferencias ?? {}) as Record<string, unknown>), notificacoes_email: v };
  const { error } = await supabase.from('profiles').update({ preferencias: prefs }).eq('id', id);
  if (error) throw new Error(error.message);
}
