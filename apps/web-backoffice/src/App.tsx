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
import { ClientesList } from '@/pages/clientes/ClientesList';
import { ClienteDetalhe } from '@/pages/clientes/ClienteDetalhe';
import { ElaborarOrcamento } from '@/pages/clientes/ElaborarOrcamento';
import { OperacionalList } from '@/pages/operacional/OperacionalList';
import { ComercialHub } from '@/pages/comercial/ComercialHub';
import { FollowUps } from '@/pages/comercial/FollowUps';
import { Garantias } from '@/pages/comercial/Garantias';
import { GarantiaDetalhe } from '@/pages/comercial/GarantiaDetalhe';
import { CriarOrdemServico } from '@/pages/operacional/CriarOrdemServico';
import { OrdemServicoDetalhe } from '@/pages/operacional/OrdemServicoDetalhe';
import { EmitirOs } from '@/pages/operacional/EmitirOs';
import { Configuracoes } from '@/pages/configuracoes/Configuracoes';
import { CadastrosAuxiliares } from '@/pages/configuracoes/CadastrosAuxiliares';
import { MeuPerfil } from '@/pages/configuracoes/MeuPerfil';
import { Permissoes } from '@/pages/configuracoes/Permissoes';

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
        element: <RequireModule module="gestao_clientes" />,
        children: [
          { path: '/clientes', element: <ClientesList /> },
          { path: '/clientes/:id', element: <ClienteDetalhe /> },
          { path: '/clientes/orcamentos/:id', element: <ElaborarOrcamento /> },
        ],
      },
      {
        element: <RequireModule module="comercial" />,
        children: [
          { path: '/comercial', element: <ComercialHub /> },
          { path: '/comercial/follow-ups', element: <FollowUps /> },
          { path: '/comercial/garantias', element: <Garantias /> },
          { path: '/comercial/garantias/:id', element: <GarantiaDetalhe /> },
        ],
      },
      {
        element: <RequireModule module="operacional" />,
        children: [
          { path: '/operacional', element: <OperacionalList /> },
          { path: '/operacional/nova', element: <CriarOrdemServico /> },
          { path: '/operacional/:id', element: <OrdemServicoDetalhe /> },
          { path: '/operacional/:id/emitir', element: <EmitirOs /> },
        ],
      },
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
      {
        element: <RequireModule module="configuracoes" />,
        children: [
          { path: '/configuracoes', element: <Configuracoes /> },
          { path: '/configuracoes/cadastros', element: <CadastrosAuxiliares /> },
          { path: '/configuracoes/perfil', element: <MeuPerfil /> },
          { path: '/configuracoes/permissoes', element: <Permissoes /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
