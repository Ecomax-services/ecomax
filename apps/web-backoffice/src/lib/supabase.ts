import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. Copie .env.example para .env.',
  );
}

/** Client único do Supabase (auth + dados) para o Backoffice. */
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Papéis que têm acesso ao app Backoffice (espelha public.apps_for_role). */
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
  perfil_acesso_id: string | null;
}

/** Acesso ao Backoffice = qualquer role que não seja portal (cliente) nem mobile (operador). */
export function hasBackofficeAccess(role: UserRole | undefined | null): boolean {
  return !!role && role !== 'cliente' && role !== 'operador';
}

// ===== Permissões por módulo =====
export type ModuleKey =
  | 'dashboard'
  | 'gestao_clientes'
  | 'operacional'
  | 'comercial'
  | 'estoque'
  | 'relatorios'
  | 'financeiro'
  | 'gestao_usuarios'
  | 'configuracoes';

export type PermAction = 'ler' | 'criar' | 'editar' | 'excluir';

export interface ModulePerm {
  pode_ler: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
}

export type PermissionMap = Partial<Record<ModuleKey, ModulePerm>>;
