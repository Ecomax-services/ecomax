import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { LogoutModal } from '@/components/LogoutModal';
import { useAuth } from '@/auth/AuthProvider';

/** Shell autenticado: sidebar fixa + área de conteúdo. */
export function AppLayout() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ink-50">
      <Sidebar onLogout={() => setLogoutOpen(true)} />
      <div className="ml-[220px] flex min-h-screen flex-col">
        <Outlet context={{ requestLogout: () => setLogoutOpen(true) }} />
      </div>
      <LogoutModal
        open={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={async () => {
          setLogoutOpen(false);
          await signOut();
          navigate('/login', { replace: true });
        }}
      />
    </div>
  );
}
