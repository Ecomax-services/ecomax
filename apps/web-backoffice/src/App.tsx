import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth } from '@/auth/RequireAuth';
import { RequireModule } from '@/auth/RequireModule';
import { Login } from '@/pages/auth/Login';
import { ForgotPassword } from '@/pages/auth/ForgotPassword';
import { EmailSent } from '@/pages/auth/EmailSent';
import { ResetPassword } from '@/pages/auth/ResetPassword';
import { Notifications } from '@/pages/Notifications';
import { UsuariosList } from '@/pages/usuarios/UsuariosList';
import { UsuarioCadastro } from '@/pages/usuarios/UsuarioCadastro';
import { UsuarioDetalhe } from '@/pages/usuarios/UsuarioDetalhe';
import { EstoqueLayout } from '@/pages/estoque/EstoqueLayout';
import { Produtos } from '@/pages/estoque/Produtos';
import { Inventario } from '@/pages/estoque/Inventario';
import { Cotacoes } from '@/pages/estoque/Cotacoes';
import { Requisicoes } from '@/pages/estoque/Requisicoes';
import { Fornecedores } from '@/pages/estoque/Fornecedores';
import { Bases } from '@/pages/estoque/Bases';
import { EstoqueSaldo } from '@/pages/estoque/EstoqueSaldo';

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
      {
        element: <RequireModule module="gestao_usuarios" />,
        children: [
          { path: '/usuarios', element: <UsuariosList /> },
          { path: '/usuarios/novo', element: <UsuarioCadastro /> },
          { path: '/usuarios/:id', element: <UsuarioDetalhe /> },
        ],
      },
      {
        element: <RequireModule module="estoque" />,
        children: [
          {
            element: <EstoqueLayout />,
            children: [
              { path: '/estoque', element: <Produtos /> },
              { path: '/estoque/inventario', element: <Inventario /> },
              { path: '/estoque/cotacoes', element: <Cotacoes /> },
              { path: '/estoque/requisicoes', element: <Requisicoes /> },
              { path: '/estoque/fornecedores', element: <Fornecedores /> },
              { path: '/estoque/bases', element: <Bases /> },
              { path: '/estoque/saldo', element: <EstoqueSaldo /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
