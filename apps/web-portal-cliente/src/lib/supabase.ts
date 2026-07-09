import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. Copie .env.example para .env.',
  );
}

/** Client único do Supabase (auth + dados) para o Portal do Cliente. */
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
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

/** Acesso ao Portal = role 'cliente' (espelha public.apps_for_role). */
export function hasPortalAccess(role: UserRole | undefined | null): boolean {
  return role === 'cliente';
}
