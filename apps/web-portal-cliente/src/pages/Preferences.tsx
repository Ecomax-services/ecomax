import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Topbar } from '@/components/Topbar';
import { cn } from '@/lib/cn';
import { getPreferencias, salvarPreferencias, PADRAO, type Preferencias } from '@/lib/preferencias';

/** Tela 3.2 - Preferências (Portal, node 31:988). Persistidas em profiles.preferencias. */
export function Preferences() {
  const [pref, setPref] = useState<Preferencias>(PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    getPreferencias()
      .then(setPref)
      .catch((e) => setErro((e as Error).message))
      .finally(() => setCarregando(false));
  }, []);

  /**
   * Aplica na tela antes de gravar e desfaz se a gravação falhar.
   *
   * O toggle precisa responder na hora; esperar a ida ao servidor faz o
   * controle parecer travado. Mas mentir sobre o resultado é pior, então a
   * falha reverte o estado em vez de deixar a tela dizendo o contrário do que
   * está salvo.
   */
  const alternar = async (campo: keyof Preferencias) => {
    const anterior = pref;
    const novo = { ...pref, [campo]: !pref[campo] };
    setPref(novo);
    setErro('');
    try {
      await salvarPreferencias(novo);
    } catch (e) {
      setPref(anterior);
      setErro((e as Error).message);
    }
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

          {erro && <p className="mt-2 text-[13px] text-danger">{erro}</p>}

          <ToggleRow
            title="Notificações no portal"
            desc="Receber alertas dentro do portal web"
            checked={pref.notif_portal}
            disabled={carregando}
            onChange={() => alternar('notif_portal')}
          />
          <div className="my-2 border-t border-ink-200" />
          <ToggleRow
            title="Notificações por e-mail"
            desc="Receber cópia das notificações por e-mail"
            checked={pref.notif_email}
            disabled={carregando}
            onChange={() => alternar('notif_email')}
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
  disabled,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
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
        disabled={disabled}
        className={cn(
          'relative h-[26px] w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
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
