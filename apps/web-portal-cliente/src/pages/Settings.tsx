import { Link, useOutletContext } from 'react-router-dom';
import { User, Bell, ArrowRight } from 'lucide-react';
import { Topbar } from '@/components/Topbar';

interface LayoutCtx {
  requestLogout: () => void;
}

/** Tela 3 - Configurações (Portal, node 31:870). */
export function Settings() {
  const { requestLogout } = useOutletContext<LayoutCtx>();

  return (
    <>
      <Topbar title="Configurações" breadcrumb="Início  /  Configurações" />

      <div className="flex-1 px-6 py-7">
        {/* Card de identificação */}
        <div className="flex w-[520px] max-w-full items-center gap-4 rounded-xl bg-white p-5 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.06)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-500 text-xl font-semibold text-white">
            AB
          </div>
          <div>
            <p className="text-[17px] font-semibold text-ink-900">Ana Beatriz Costa</p>
            <p className="text-[13px] text-ink-500">ana.beatriz@empresa.com.br</p>
            <span className="mt-1 inline-flex rounded-full bg-forest-100 px-2.5 py-0.5 text-[11px] font-medium text-forest-500">
              Cliente
            </span>
          </div>
        </div>

        {/* Cards de navegação */}
        <div className="mt-7 flex w-[520px] max-w-full gap-2">
          <SettingsCard
            to="/configuracoes/perfil"
            icon={<User className="h-5 w-5 text-forest-500" />}
            title="Meu Perfil"
            desc="Visualize seus dados cadastrais"
          />
          <SettingsCard
            to="/configuracoes/preferencias"
            icon={<Bell className="h-5 w-5 text-forest-500" />}
            title="Preferências"
            desc="Gerencie suas notificações"
          />
        </div>

        {/* Sair da conta */}
        <div className="mt-2 flex w-[520px] max-w-full items-center justify-between rounded-xl bg-white p-5 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.06)]">
          <div>
            <p className="text-sm font-semibold text-danger-bright">Sair da conta</p>
            <p className="text-xs text-ink-500">Encerrar sessão atual no portal.</p>
          </div>
          <button
            onClick={requestLogout}
            className="h-8 rounded-lg border border-[#dc3232] px-4 text-[13px] font-semibold text-danger-bright transition hover:bg-danger-bright/5"
          >
            Sair
          </button>
        </div>
      </div>
    </>
  );
}

function SettingsCard({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group relative flex-1 rounded-xl bg-white p-5 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.06)] transition hover:shadow-card"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-50">{icon}</div>
      <ArrowRight className="absolute right-5 top-5 h-4 w-4 text-forest-500" />
      <p className="mt-7 text-[15px] font-semibold text-ink-900">{title}</p>
      <p className="mt-1 text-xs text-ink-500">{desc}</p>
    </Link>
  );
}
