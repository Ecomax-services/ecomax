import type { ReactNode } from 'react';

interface TopbarProps {
  title: string;
  breadcrumb: string;
  action?: ReactNode;
}

/** Barra superior das telas internas (título + breadcrumb + ação opcional). */
export function Topbar({ title, breadcrumb, action }: TopbarProps) {
  return (
    <header className="flex h-[60px] items-center justify-between bg-white px-7 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.04)]">
      <div>
        <h1 className="text-[18px] font-semibold text-ink-900">{title}</h1>
        <p className="text-[11px] text-ink-400">{breadcrumb}</p>
      </div>
      {action}
    </header>
  );
}
