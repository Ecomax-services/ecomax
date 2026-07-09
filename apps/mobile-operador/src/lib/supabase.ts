import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

// A chave publishable é pública por design (vai no bundle do app). Pode ser
// sobrescrita por variáveis EXPO_PUBLIC_* em tempo de build, se preferir.
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://imnfcffmzzukabhsotul.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_sih8Qv4FmLKhHBj2u5e0yg_TP2uX0TO';

/**
 * Client do Supabase para o app Operador.
 * A sessão é persistida em AsyncStorage, então o operador continua logado
 * entre reaberturas e mesmo offline (o token é renovado quando a rede volta).
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Renova o token só com o app em foreground (recomendação do Supabase p/ RN).
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export type UserRole =
  | 'admin'
  | 'gestor'
  | 'operacional'
  | 'comercial'
  | 'financeiro'
  | 'rh'
  | 'almoxarifado'
  | 'operador'
  | 'cliente';

export interface Profile {
  id: string;
  nome_completo: string;
  role: UserRole;
  ativo: boolean;
  telefone: string | null;
  avatar_url: string | null;
}

/** Acesso ao app Operador = role 'operador' (espelha public.apps_for_role). */
export function hasMobileAccess(role: UserRole | undefined | null): boolean {
  return role === 'operador';
}
