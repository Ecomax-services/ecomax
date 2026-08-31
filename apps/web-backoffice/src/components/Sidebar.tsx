import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Briefcase,
  Package,
  BarChart3,
  Wallet,
  UserCog,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/auth/AuthProvider';
import { unreadCount } from '@/lib/notificacoes';
import type { UserRole, ModuleKey } from '@/lib/supabase';
import { signedDocUrl } from '@/lib/funcionarios';

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  operacional: 'Operacional',
  comercial: 'Comercial',
  financeiro: 'Financeiro',
  rh: 'RH',
  almoxarifado: 'Almoxarifado',
  operador: 'Operador',
  cliente: 'Cliente',
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || 'U';
}

interface NavItem {
  label: string;
  icon: LucideIcon;
  to: string;
  disabled?: boolean;
  /** Módulo para checagem de permissão de leitura. Sem módulo = sempre visível. */
  module?: ModuleKey;
}

const items: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', disabled: true, module: 'dashboard' },
  { label: 'Gestão de Clientes', icon: Users, to: '/clientes', module: 'gestao_clientes' },
  { label: 'Operacional', icon: ClipboardList, to: '/operacional', module: 'operacional' },
  { label: 'Comercial', icon: Briefcase, to: '/comercial', module: 'comercial' },
  { label: 'Estoque e Produtos', icon: Package, to: '/estoque', module: 'estoque' },
  { label: 'Relatórios', icon: BarChart3, to: '/relatorios', disabled: true, module: 'relatorios' },
  { label: 'Financeiro', icon: Wallet, to: '/financeiro', disabled: true, module: 'financeiro' },
  { label: 'Gestão de Usuários', icon: UserCog, to: '/usuarios', module: 'gestao_usuarios' },
  { label: 'Notificações', icon: Bell, to: '/notificacoes' },
  { label: 'Configurações', icon: Settings, to: '/configuracoes', module: 'configuracoes' },
];

/** Sidebar do Backoffice (Figma node 148:331). 240px, fundo verde escuro. */
export function Sidebar({ onLogout }: { onLogout: () => void }) {
  const { profile, can } = useAuth();
  const { pathname } = useLocation();
  const nome = profile?.nome_completo ?? 'Usuário';
  const cargo = profile ? roleLabels[profile.role] : '';

  /**
   * A foto do próprio usuário, no rodapé.
   *
   * `avatar_url` já vinha no perfil e não era usado: quem cadastrava a foto
   * continuava vendo as iniciais aqui, do mesmo jeito que acontecia na listagem
   * de usuários. O arquivo fica em bucket privado, então precisa de URL
   * assinada — e ela expira, por isso é refeita quando o perfil muda.
   */
  const [foto, setFoto] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    if (!profile?.avatar_url) { setFoto(null); return; }
    signedDocUrl(profile.avatar_url)
      .then((url) => { if (vivo) setFoto(url); })
      .catch(() => { if (vivo) setFoto(null); });
    return () => { vivo = false; };
  }, [profile?.avatar_url]);
  const visibleItems = items.filter((item) => !item.module || can(item.module, 'ler'));
  const [naoLidas, setNaoLidas] = useState(0);

  // Reconta a cada navegação. O badge era o literal `2`: não refletia nada e
  // continuava lá depois de marcar tudo como lido. Recontar ao trocar de rota
  // cobre o caso real — sair da tela de notificações e ver o número certo.
  useEffect(() => {
    let vivo = true;
    unreadCount().then((n) => vivo && setNaoLidas(n)).catch(() => {});
    return () => { vivo = false; };
  }, [pathname]);
  return (
    <aside className="fixed inset-y-0 left-0 flex w-60 flex-col bg-forest-900 text-white">
      {/* Logo + divisória */}
      <div className="px-4 pb-3 pt-3">
        <Logo className="h-[52px]" />
      </div>
      <div className="mx-4 border-t border-white/10" />

      {/* Navegação */}
      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pt-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const content = (active: boolean) => (
            <>
              {active && (
                <span className="absolute left-0 top-0 h-full w-[3px] rounded-sm bg-[#4ade80]" />
              )}
              <Icon className={cn('h-[18px] w-[18px] shrink-0', !active && 'opacity-65')} />
              <span className={cn('flex-1 truncate', !active && 'opacity-65')}>{item.label}</span>
              {item.to === '/notificacoes' && naoLidas > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-bright px-1.5 text-[11px] font-semibold leading-none text-white">
                  {naoLidas > 99 ? '99+' : naoLidas}
                </span>
              ) : null}
            </>
          );

          if (item.disabled) {
            return (
              <div
                key={item.label}
                aria-disabled
                title="Disponível em release futuro"
                className="relative flex h-10 cursor-not-allowed items-center gap-3 rounded-lg px-3 text-[13px] font-semibold"
              >
                {content(false)}
              </div>
            );
          }

          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative flex h-10 items-center gap-3 overflow-hidden rounded-lg px-3 text-[13px] font-semibold transition-colors',
                  isActive ? 'bg-forest-500 text-white' : 'hover:bg-white/5',
                )
              }
            >
              {({ isActive }) => content(isActive)}
            </NavLink>
          );
        })}
      </nav>

      {/* Rodapé: sair + card do usuário */}
      <div className="px-4 pb-2">
        <button
          onClick={onLogout}
          className="ml-auto flex items-center gap-1.5 text-xs text-danger-bright transition hover:opacity-80"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>
      </div>
      <div className="flex h-[60px] items-center gap-3 bg-white/[0.07] px-2.5">
        {foto ? (
          <img src={foto} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-600 text-[13px] font-bold">
            {initialsOf(nome)}
          </div>
        )}
        <div className="leading-tight">
          <p className="text-xs font-medium text-white">{nome}</p>
          <p className="text-[11px] text-white/60">{cargo}</p>
        </div>
      </div>
    </aside>
  );
}
