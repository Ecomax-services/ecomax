import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Topbar } from '@/components/Topbar';
import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/lib/supabase';

/** Tela 3.1 - Meu Perfil (Portal, node 31:930). Dados read-only (editáveis só pelo admin). */
export function Profile() {
  const { profile, session } = useAuth();
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  const nome = profile?.nome_completo ?? 'Cliente';
  const email = session?.user.email ?? '—';

  async function handleChangePassword() {
    if (!session?.user.email || sending) return;
    setSending(true);
    await supabase.auth.resetPasswordForEmail(session.user.email, {
      redirectTo: `${window.location.origin}/criar-senha`,
    });
    setSending(false);
    setMsg(`Enviamos um link de redefinição para ${session.user.email}.`);
  }

  return (
    <>
      <Topbar title="Meu Perfil" breadcrumb="Início  /  Configurações  /  Perfil" />

      <div className="flex-1 px-6 py-7">
        <Link
          to="/configuracoes"
          className="text-[13px] font-medium text-forest-500 hover:underline"
        >
          Configurações
        </Link>

        {/* Dados do usuário */}
        <div className="mt-3 w-[640px] max-w-full rounded-xl bg-white p-7 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.06)]">
          <p className="text-[11px] font-semibold tracking-wide text-ink-400">DADOS DO USUÁRIO</p>
          <div className="mt-3 rounded-lg bg-warnSoft-bg px-4 py-2.5 text-center text-xs font-medium text-warnSoft-fg">
            Seus dados só podem ser editados pelo administrador Ecomax.
          </div>

          <Field label="Nome completo" value={nome} />
          <Divider />
          <Field label="E-mail (não editável)" value={email} />
          <Divider />
          <Field label="Nível de acesso" value="Cliente" />
          <Divider />
          <Field label="Tipo de usuário" value="Acesso Portal" last />
        </div>

        {/* Segurança */}
        <div className="mt-6 w-[640px] max-w-full rounded-xl bg-white p-7 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.06)]">
          <p className="text-[11px] font-semibold tracking-wide text-ink-400">SEGURANÇA</p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex h-11 w-[327px] max-w-[60%] items-center rounded-lg bg-ink-50 px-4 text-sm font-medium text-ink-800">
              Senha
            </div>
            <button
              onClick={handleChangePassword}
              disabled={sending}
              className="h-8 rounded-lg bg-forest-100 px-4 text-xs font-semibold text-forest-500 transition hover:bg-forest-100/70 disabled:opacity-60"
            >
              {sending ? 'Enviando…' : 'Alterar senha'}
            </button>
          </div>
          {msg && <p className="mt-3 text-xs font-medium text-forest-500">{msg}</p>}
        </div>
      </div>
    </>
  );
}

function Field({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={last ? 'pt-4' : 'py-4'}>
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-[15px] font-medium text-ink-900">{value}</p>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-ink-200" />;
}
