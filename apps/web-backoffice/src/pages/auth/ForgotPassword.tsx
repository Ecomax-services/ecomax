import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

/** Tela 1.1 - Recuperação de senha (node 4:265). */
export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) {
      setError('Informe o e-mail cadastrado.');
      return;
    }
    setError(undefined);
    setSubmitting(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/criar-senha`,
    });
    setSubmitting(false);
    // Não revela se o e-mail existe (evita enumeração): segue para a confirmação.
    if (err && err.status && err.status >= 500) {
      setError('Não foi possível enviar agora. Tente novamente em instantes.');
      return;
    }
    navigate('/recuperar-senha/enviado', { state: { email: email.trim() } });
  }

  return (
    <AuthLayout
      heading={
        <>
          Recuperação
          <br />
          de acesso.
        </>
      }
      subtext={
        <>
          Não se preocupe, vamos te ajudar
          <br />a recuperar o acesso ao sistema.
        </>
      }
      aside={
        <span className="inline-flex rounded-lg bg-white/10 px-4 py-3 text-sm font-medium text-white/90">
          Link seguro enviado por e-mail
        </span>
      }
    >
      <Link
        to="/login"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-forest-500 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao login
      </Link>

      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-forest-100">
        <Mail className="h-6 w-6 text-forest-500" />
      </div>

      <h2 className="text-2xl font-semibold text-ink-900">Recuperar senha</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
        Digite o e-mail cadastrado na sua conta.
        <br />
        Você receberá um link para criar uma nova senha.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
        <Input
          label="E-mail cadastrado"
          type="email"
          placeholder="seu@email.com.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />
        <Button type="submit" size="lg" fullWidth disabled={submitting}>
          {submitting ? 'Enviando…' : 'Enviar link de recuperação'}
        </Button>
      </form>
    </AuthLayout>
  );
}
