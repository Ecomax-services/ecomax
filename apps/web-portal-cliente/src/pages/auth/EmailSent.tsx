import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';

/** Tela 1.1.2 - E-mail enviado (Portal, node 83:345). */
export function EmailSent() {
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
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-forest-500 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao login
      </Link>

      <div className="flex flex-col items-center py-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-forest-500" strokeWidth={2.2} />
        <h2 className="mt-4 text-2xl font-semibold text-ink-900">E-mail enviado!</h2>
        <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-ink-500">
          Verifique sua caixa de entrada. O link de redefinição expira em 15 minutos.
        </p>
      </div>
    </AuthLayout>
  );
}
