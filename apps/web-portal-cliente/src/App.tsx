import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth } from '@/auth/RequireAuth';
import { Login } from '@/pages/auth/Login';
import { ForgotPassword } from '@/pages/auth/ForgotPassword';
import { EmailSent } from '@/pages/auth/EmailSent';
import { ResetPassword } from '@/pages/auth/ResetPassword';
import { Notifications } from '@/pages/Notifications';
import { GarantiaPublica } from '@/pages/GarantiaPublica';
import { Inicio } from '@/pages/Inicio';
import { OrdensServico } from '@/pages/OrdensServico';
import { Documentos } from '@/pages/Documentos';
import { Produtos } from '@/pages/Produtos';
import { Colaboradores } from '@/pages/Colaboradores';
import { Settings } from '@/pages/Settings';
import { Profile } from '@/pages/Profile';
import { Preferences } from '@/pages/Preferences';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  // Sem login: o token do endereço é a credencial, e quem valida é a Edge Function.
  { path: '/garantia/:token', element: <GarantiaPublica /> },
  { path: '/login', element: <Login /> },
  { path: '/recuperar-senha', element: <ForgotPassword /> },
  { path: '/recuperar-senha/enviado', element: <EmailSent /> },
  { path: '/criar-senha', element: <ResetPassword /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/inicio', element: <Inicio /> },
      { path: '/ordens', element: <OrdensServico /> },
      { path: '/documentos', element: <Documentos /> },
      { path: '/produtos', element: <Produtos /> },
      { path: '/colaboradores', element: <Colaboradores /> },
      { path: '/notificacoes', element: <Notifications /> },
      { path: '/configuracoes', element: <Settings /> },
      { path: '/configuracoes/perfil', element: <Profile /> },
      { path: '/configuracoes/preferencias', element: <Preferences /> },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
