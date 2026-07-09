import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import type { ModuleKey } from '@/lib/supabase';

/** Bloqueia rotas de um módulo quando o perfil não tem permissão de leitura. */
export function RequireModule({ module }: { module: ModuleKey }) {
  const { can } = useAuth();
  if (!can(module, 'ler')) return <Navigate to="/notificacoes" replace />;
  return <Outlet />;
}
