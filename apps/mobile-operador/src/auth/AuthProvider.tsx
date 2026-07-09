import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { supabase, hasMobileAccess, type Profile } from '@/lib/supabase';

const PROFILE_CACHE_KEY = 'ecomax.operador.profile';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function readCache(): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

async function writeCache(p: Profile | null) {
  try {
    if (p) await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p));
    else await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    /* noop */
  }
}

/** Busca o profile online; se estiver offline, cai no cache local. */
async function resolveProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome_completo, role, ativo, telefone, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (data) {
    const prof = data as Profile;
    await writeCache(prof);
    return prof;
  }
  // Erro de rede (offline) → usa o último profile conhecido.
  if (error) return readCache();
  return null; // Sem profile de fato.
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) setProfile(await resolveProfile(data.session.user.id));
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!active) return;
      setSession(next);
      if (next) setProfile(await resolveProfile(next.user.id));
      else setProfile(null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback<AuthContextValue['signIn']>(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: 'E-mail ou senha inválidos. Verifique sua conexão.' };

    const prof = await resolveProfile(data.user.id);
    if (!prof || !prof.ativo) {
      await supabase.auth.signOut();
      return { error: 'Usuário inativo ou sem cadastro. Fale com o administrador.' };
    }
    if (!hasMobileAccess(prof.role)) {
      await supabase.auth.signOut();
      return { error: 'Este app é exclusivo para operadores de campo.' };
    }
    setProfile(prof);
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await writeCache(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return ctx;
}
