import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, ClipboardList, FileText, Package, Users, Bell, Settings, LogOut } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/auth/AuthProvider';
import { contarNaoLidas } from '@/lib/notificacoes';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || 'U';
}

interface NavItem {
  label: string;
  icon: LucideIcon;
  to: string;
  disabled?: boolean;
}

const items: NavItem[] = [
  { label: 'Início', icon: Home, to: '/inicio' },
  { label: 'Ordens de Serviço', icon: ClipboardList, to: '/ordens' },
  { label: 'Documentos', icon: FileText, to: '/documentos' },
  { label: 'Produtos', icon: Package, to: '/produtos' },
  { label: 'Colaboradores', icon: Users, to: '/colaboradores' },
  { label: 'Notificações', icon: Bell, to: '/notificacoes' },
  { label: 'Configurações', icon: Settings, to: '/configuracoes' },
];

/** Sidebar do Portal do Cliente (Figma node 31:789). 220px, fundo verde escuro #0a2d0a. */
export function Sidebar({ onLogout }: { onLogout: () => void }) {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  const nome = profile?.nome_completo ?? 'Cliente';
  const [naoLidas, setNaoLidas] = useState(0);

  // Reconta a cada navegação. O badge era o literal `2`: não refletia nada e
  // continuava lá depois de marcar tudo como lido. Recontar ao trocar de rota
  // cobre o caso real — sair da tela de notificações e ver o número certo.
  useEffect(() => {
    let vivo = true;
    contarNaoLidas().then((n) => vivo && setNaoLidas(n));
    return () => { vivo = false; };
  }, [pathname]);
  return (
    <aside className="fixed inset-y-0 left-0 flex w-[220px] flex-col bg-forest-800 text-white">
      {/* Logo + badge Portal do Cliente */}
      <div className="px-[26px] pt-[6px]">
        <Logo className="h-[44px]" />
        <span className="ml-1 inline-flex h-[18px] items-center rounded-full bg-forest-600 px-2 text-[10px] font-medium text-white">
          Portal do Cliente
        </span>
      </div>
      <div className="mx-[25px] mt-3 border-t border-white/10" />

      {/* Navegação */}
      <nav className="flex flex-1 flex-col gap-[10px] overflow-y-auto px-5 pt-[18px]">
        {items.map((item) => {
          const Icon = item.icon;
          const content = (active: boolean) => (
            <>
              {active && (
                <span className="absolute left-0 top-0 h-full w-[3px] rounded-sm bg-[#4ade80]" />
              )}
              <Icon className={cn('h-[18px] w-[18px] shrink-0', !active && 'opacity-65')} />
              <span className={cn('flex-1 truncate', !active && 'opacity-65')}>{item.label}</span>
              {item.to === '/notificacoes' && naoLidas > 0 ? (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger-bright px-1 text-[10px] font-semibold leading-none text-white">
                  {naoLidas}
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
                className="relative flex h-10 cursor-not-allowed items-center gap-3 rounded-lg px-3 text-[12px] font-semibold"
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
                  'relative flex h-10 items-center gap-3 overflow-hidden rounded-lg px-3 text-[12px] font-semibold transition-colors',
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
      <div className="px-5 pb-2">
        <button
          onClick={onLogout}
          className="ml-auto flex items-center gap-1.5 text-xs text-white transition hover:opacity-80"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>
      </div>
      <div className="flex h-[60px] items-center gap-3 bg-white/[0.07] px-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-600 text-[13px] font-bold">
          {initialsOf(nome)}
        </div>
        <div className="leading-tight">
          <p className="text-xs font-medium text-white">{nome}</p>
          <p className="text-[11px] text-white/60">Portal do Cliente</p>
        </div>
      </div>
    </aside>
  );
}
