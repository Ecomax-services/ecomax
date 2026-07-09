import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  supabase,
  hasBackofficeAccess,
  type Profile,
  type ModuleKey,
  type PermAction,
  type PermissionMap,
  type ModulePerm,
} from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  permissions: PermissionMap;
  loading: boolean;
  /** Autentica no Backoffice. Recusa (e desloga) quem não tem acesso ao app. */
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** O usuário logado pode `action` no `module`? Admin sempre pode. */
  can: (module: ModuleKey, action?: PermAction) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, nome_completo, role, ativo, telefone, avatar_url, perfil_acesso_id')
    .eq('id', userId)
    .maybeSingle();
  return (data as Profile) ?? null;
}

async function fetchPermissions(perfilId: string | null): Promise<PermissionMap> {
  if (!perfilId) return {};
  const { data } = await supabase
    .from('permissoes_modulo')
    .select('modulo, pode_ler, pode_criar, pode_editar, pode_excluir')
    .eq('perfil_acesso_id', perfilId);
  const map: PermissionMap = {};
  (data ?? []).forEach((row) => {
    const { modulo, ...perm } = row as { modulo: ModuleKey } & ModulePerm;
    map[modulo] = perm;
  });
  return map;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [loading, setLoading] = useState(true);

  const loadFor = useCallback(async (userId: string) => {
    const prof = await fetchProfile(userId);
    setProfile(prof);
    setPermissions(await fetchPermissions(prof?.perfil_acesso_id ?? null));
    return prof;
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadFor(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!active) return;
      setSession(next);
      if (next) await loadFor(next.user.id);
      else {
        setProfile(null);
        setPermissions({});
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadFor]);

  const can = useCallback<AuthContextValue['can']>(
    (module, action = 'ler') => {
      if (profile?.role === 'admin') return true;
      const perm = permissions[module];
      if (!perm) return false;
      return action === 'ler'
        ? perm.pode_ler
        : action === 'criar'
          ? perm.pode_criar
          : action === 'editar'
            ? perm.pode_editar
            : perm.pode_excluir;
    },
    [profile, permissions],
  );

  const signIn = useCallback<AuthContextValue['signIn']>(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: 'E-mail ou senha inválidos.' };

    const prof = await fetchProfile(data.user.id);
    if (!prof || !prof.ativo) {
      await supabase.auth.signOut();
      return { error: 'Usuário inativo ou sem cadastro. Fale com o administrador.' };
    }
    if (!hasBackofficeAccess(prof.role)) {
      await supabase.auth.signOut();
      return { error: 'Seu perfil não tem acesso ao Backoffice.' };
    }
    setProfile(prof);
    setPermissions(await fetchPermissions(prof.perfil_acesso_id));
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setPermissions({});
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, permissions, loading, signIn, signOut, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return ctx;
}
