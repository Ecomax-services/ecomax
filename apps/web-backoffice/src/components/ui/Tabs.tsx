import { cn } from '@/lib/cn';

export interface TabDef<T extends string> {
  key: T;
  label: string;
}

/** Abas com sublinhado verde (detalhe de usuário, drawers de estoque). */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabDef<T>[];
  value: T;
  onChange: (key: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-0.5 overflow-x-auto', className)}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            'whitespace-nowrap border-b-2 px-[18px] py-3 text-sm transition-colors',
            value === t.key
              ? 'border-forest-accent font-semibold text-forest-900'
              : 'border-transparent font-medium text-ink-500 hover:text-ink-900',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
