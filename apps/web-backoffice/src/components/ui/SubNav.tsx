import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SubNavItem {
  label: string;
  icon: LucideIcon;
  to: string;
}

/** Navegação horizontal em pílulas (sub-módulos de Estoque e Produtos). */
export function SubNav({ items }: { items: SubNavItem[] }) {
  return (
    <div className="mb-6 flex gap-2 overflow-x-auto pb-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 whitespace-nowrap rounded-[10px] px-4 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-forest-600 font-semibold text-white'
                  : 'border border-ink-100 bg-white text-ink-700 hover:bg-ink-50',
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        );
      })}
    </div>
  );
}
