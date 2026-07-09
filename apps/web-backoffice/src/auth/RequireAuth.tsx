import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { useAuth } from '@/auth/AuthProvider';
import { hasBackofficeAccess } from '@/lib/supabase';
import { Logo } from '@/components/ui/Logo';

/** Protege as rotas internas: exige sessão + profile ativo com acesso ao Backoffice. */
export function RequireAuth() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-forest-900">
        <Logo className="h-12 animate-pulse" />
      </div>
    );
  }

  if (!session || !profile || !profile.ativo || !hasBackofficeAccess(profile.role)) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
}
