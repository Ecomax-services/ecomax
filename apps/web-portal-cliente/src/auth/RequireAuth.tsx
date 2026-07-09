import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { useAuth } from '@/auth/AuthProvider';
import { hasPortalAccess } from '@/lib/supabase';
import { Logo } from '@/components/ui/Logo';

/** Protege as rotas internas: exige sessão + profile ativo com acesso ao Portal (cliente). */
export function RequireAuth() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-forest-800">
        <Logo className="h-12 animate-pulse" />
      </div>
    );
  }

  if (!session || !profile || !profile.ativo || !hasPortalAccess(profile.role)) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
}
