import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { pedirRecuperacaoDeSenha } from '@/lib/recuperacaoSenha';

/** Tela 1.1 - Recuperação de senha (Portal, node 31:727). */
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
    try {
      await pedirRecuperacaoDeSenha(email.trim(), 'portal', `${window.location.origin}/criar-senha`);
    } catch (e) {
      setSubmitting(false);
      setError((e as Error).message);
      return;
    }
    setSubmitting(false);
    // Não revela se o e-mail existe: a função responde igual para endereço
    // cadastrado e não cadastrado, e a tela segue para a confirmação nos dois.
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
          Não se preocupe, vamos te ajudar a
          <br />
          recuperar sua senha com segurança.
        </>
      }
      features={['Link de recuperação por e-mail']}
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
        Digite o e-mail da sua conta. Você receberá um link para criar uma nova senha.
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
