import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/auth/AuthProvider';
import { hasBackofficeAccess } from '@/lib/supabase';

/** Tela 1 - Login (node 4:229). Autenticação via Supabase. */
export function Login() {
  const navigate = useNavigate();
  const { signIn, session, profile, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Já autenticado com acesso ao Backoffice → pula o login.
  useEffect(() => {
    if (!loading && session && profile?.ativo && hasBackofficeAccess(profile.role)) {
      navigate('/notificacoes', { replace: true });
    }
  }, [loading, session, profile, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email) next.email = 'Informe seu e-mail.';
    if (!password) next.password = 'Informe sua senha.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      setFormError(error);
      return;
    }
    navigate('/notificacoes', { replace: true });
  }

  return (
    <AuthLayout
      heading={
        <>
          Bem-vindo ao
          <br />
          Backoffice.
        </>
      }
      subtext={
        <>
          Gerencie clientes, ordens de serviço,
          <br />
          estoque e muito mais em um só lugar.
        </>
      }
      footer="Backoffice · Ambiente Administrativo"
    >
      <h2 className="text-2xl font-semibold text-ink-900">Acesse sua conta</h2>
      <p className="mt-1.5 text-sm text-ink-500">Insira seu e-mail e senha para continuar</p>
      <div className="my-5 border-t border-ink-200" />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="E-mail"
          type="email"
          placeholder="seu@email.com.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <PasswordInput
          label="Senha"
          placeholder="Digite sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <Link
          to="/recuperar-senha"
          className="block text-[13px] font-medium text-forest-500 hover:underline"
        >
          Esqueci minha senha
        </Link>
        {formError && (
          <p className="rounded-lg bg-expiredTag-bg px-3 py-2 text-[13px] font-medium text-expiredTag-fg">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" fullWidth disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <p className="mt-4 text-xs text-ink-300">
        Problemas para acessar? Fale com o administrador.
      </p>
    </AuthLayout>
  );
}
