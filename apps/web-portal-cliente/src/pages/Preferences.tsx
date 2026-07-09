import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Topbar } from '@/components/Topbar';
import { cn } from '@/lib/cn';

/** Tela 3.2 - Preferências (Portal, node 31:988). Persistidas localmente (por dispositivo). */
export function Preferences() {
  const [portal, setPortalState] = useState(() => localStorage.getItem('ecomax.pref.portal') !== 'false');
  const [email, setEmailState] = useState(() => localStorage.getItem('ecomax.pref.email') === 'true');
  const setPortal = (v: boolean) => {
    setPortalState(v);
    localStorage.setItem('ecomax.pref.portal', String(v));
  };
  const setEmail = (v: boolean) => {
    setEmailState(v);
    localStorage.setItem('ecomax.pref.email', String(v));
  };

  return (
    <>
      <Topbar title="Preferências" breadcrumb="Início  /  Configurações  /  Preferências" />

      <div className="flex-1 px-6 py-7">
        <Link
          to="/configuracoes"
          className="text-[13px] font-medium text-forest-500 hover:underline"
        >
          Configurações
        </Link>

        <div className="mt-3 w-[640px] max-w-full rounded-xl bg-white p-7 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.06)]">
          <p className="text-[11px] font-semibold tracking-wide text-ink-400">NOTIFICAÇÕES</p>

          <ToggleRow
            title="Notificações no portal"
            desc="Receber alertas dentro do portal web"
            checked={portal}
            onChange={() => setPortal(!portal)}
          />
          <div className="my-2 border-t border-ink-200" />
          <ToggleRow
            title="Notificações por e-mail"
            desc="Receber cópia das notificações por e-mail"
            checked={email}
            onChange={() => setEmail(!email)}
          />
        </div>
      </div>
    </>
  );
}

function ToggleRow({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-ink-50 px-4 py-2.5">
      <div>
        <p className="text-sm font-medium text-ink-900">{title}</p>
        <p className="text-xs text-ink-500">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={onChange}
        className={cn(
          'relative h-[26px] w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-forest-500' : 'bg-ink-300',
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] h-5 w-5 rounded-full bg-white transition-all',
            checked ? 'left-[21px]' : 'left-[3px]',
          )}
        />
      </button>
    </div>
  );
}
