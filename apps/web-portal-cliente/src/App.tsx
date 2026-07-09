import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth } from '@/auth/RequireAuth';
import { Login } from '@/pages/auth/Login';
import { ForgotPassword } from '@/pages/auth/ForgotPassword';
import { EmailSent } from '@/pages/auth/EmailSent';
import { ResetPassword } from '@/pages/auth/ResetPassword';
import { Notifications } from '@/pages/Notifications';
import { Settings } from '@/pages/Settings';
import { Profile } from '@/pages/Profile';
import { Preferences } from '@/pages/Preferences';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <Login /> },
  { path: '/recuperar-senha', element: <ForgotPassword /> },
  { path: '/recuperar-senha/enviado', element: <EmailSent /> },
  { path: '/criar-senha', element: <ResetPassword /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/notificacoes', element: <Notifications /> },
      { path: '/configuracoes', element: <Settings /> },
      { path: '/configuracoes/perfil', element: <Profile /> },
      { path: '/configuracoes/preferencias', element: <Preferences /> },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
