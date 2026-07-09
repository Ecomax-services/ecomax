import type { ReactNode } from 'react';

interface TopbarProps {
  title: string;
  breadcrumb: string;
  action?: ReactNode;
}

/** Barra superior das telas internas (título + breadcrumb + ação opcional). */
export function Topbar({ title, breadcrumb, action }: TopbarProps) {
  return (
    <header className="flex h-16 items-center justify-between bg-white px-8 shadow-topbar">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">{title}</h1>
        <p className="text-xs text-ink-500">{breadcrumb}</p>
      </div>
      {action}
    </header>
  );
}
