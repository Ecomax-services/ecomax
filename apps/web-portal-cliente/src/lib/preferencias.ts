import { supabase } from '@/lib/supabase';

/**
 * Preferências de notificação do usuário.
 *
 * Vivem em `profiles.preferencias` (jsonb), e não em localStorage: a escolha
 * precisa acompanhar a pessoa entre navegadores e aparelhos, e o servidor
 * precisa enxergá-la para respeitar o "não quero e-mail" na hora de disparar.
 */
export interface Preferencias {
  notif_portal: boolean;
  notif_email: boolean;
}

/** Usado quando a pessoa nunca escolheu (coluna nula). */
export const PADRAO: Preferencias = { notif_portal: true, notif_email: false };

export async function getPreferencias(): Promise<Preferencias> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return PADRAO;
  const { data, error } = await supabase
    .from('profiles')
    .select('preferencias')
    .eq('id', u.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  // Mescla com o padrão para que um canal novo apareça ligado por padrão sem
  // precisar reescrever a linha de quem já tinha respondido.
  return { ...PADRAO, ...((data?.preferencias as Partial<Preferencias> | null) ?? {}) };
}

export async function salvarPreferencias(p: Preferencias): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('Sessão expirada.');
  const { error } = await supabase.from('profiles').update({ preferencias: p }).eq('id', u.user.id);
  if (error) throw new Error(error.message);
}
