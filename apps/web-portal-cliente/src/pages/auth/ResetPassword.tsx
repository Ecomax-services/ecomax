import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { PasswordInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';

/** Política de senha do Discovery (RF-004): 8–16 chars, 1 número, 1 letra, 1 especial. */
function evaluate(password: string) {
  const checks = {
    length: password.length >= 8 && password.length <= 16,
    number: /\d/.test(password),
    letter: /[a-zA-Z]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score };
}

const strengthMeta = [
  { label: '', color: '', width: 'w-0' },
  { label: 'Fraca', color: 'bg-danger-bright', width: 'w-1/3' },
  { label: 'Fraca', color: 'bg-danger-bright', width: 'w-1/3' },
  { label: 'Média', color: 'bg-strengthMed', width: 'w-2/3' },
  { label: 'Forte', color: 'bg-forest-500', width: 'w-full' },
] as const;

/** Tela 1.1.1 - Criar nova senha (node 4:289). */
export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string>();
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { checks, score } = useMemo(() => evaluate(password), [password]);
  const meta = strengthMeta[score];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (score < 4) {
      setError('A senha não atende a todos os requisitos.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }
    setError(undefined);
    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (err) {
      setError('Não foi possível salvar. O link pode ter expirado — solicite um novo.');
      return;
    }
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  }

  return (
    <AuthLayout
      heading="Crie uma nova senha."
      subtext="Escolha uma senha forte para proteger o seu acesso ao sistema."
      aside={
        <div className="w-[360px] rounded-xl bg-white/[0.08] p-4 text-xs font-semibold text-primary50">
          <p>Requisitos da senha:</p>
          <Req ok={checks.length}>Mínimo 8 caracteres</Req>
          <Req ok={checks.number}>Pelo menos 1 número</Req>
          <Req ok={checks.letter}>Pelo menos 1 letra</Req>
          <Req ok={checks.special}>Pelo menos 1 caractere especial</Req>
        </div>
      }
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-forest-100">
        <KeyRound className="h-6 w-6 text-forest-500" />
      </div>
      <h2 className="text-2xl font-semibold text-ink-900">Criar nova senha</h2>
      <p className="mt-1.5 text-sm text-ink-500">Sua nova senha deve ter entre 8 e 16 caracteres.</p>

      {!ready && (
        <div className="mt-4 rounded-lg bg-[#fcf2d9] px-3 py-2.5 text-[13px] text-[#78350f]">
          Abra esta página pelo link enviado ao seu e-mail. Se ele expirou,{' '}
          <Link to="/recuperar-senha" className="font-semibold underline">
            solicite um novo
          </Link>
          .
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
        <div>
          <PasswordInput
            label="Nova senha"
            placeholder="Digite a nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {password && (
            <div className="mt-2">
              <div className="h-1 w-full overflow-hidden rounded-full bg-ink-200">
                <div className={cn('h-1 rounded-full transition-all', meta.color, meta.width)} />
              </div>
              <p
                className={cn(
                  'mt-1 text-[11px]',
                  score === 4
                    ? 'text-forest-500'
                    : score === 3
                      ? 'text-strengthMed'
                      : 'text-danger-bright',
                )}
              >
                Força da senha: {meta.label}
              </p>
            </div>
          )}
        </div>

        <PasswordInput
          label="Confirmar senha"
          placeholder="Confirme a nova senha"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={error}
        />

        <Button type="submit" size="lg" fullWidth disabled={!ready || submitting}>
          {submitting ? 'Salvando…' : 'Salvar nova senha'}
        </Button>
      </form>
    </AuthLayout>
  );
}

function Req({ ok, children }: { ok: boolean; children: string }) {
  return (
    <p className={cn('mt-1.5 transition-colors', ok ? 'text-white' : 'text-primary50/80')}>
      • {children}
    </p>
  );
}
