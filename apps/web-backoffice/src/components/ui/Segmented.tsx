import { cn } from '@/lib/cn';

export interface SegmentOption<T extends string> {
  key: T;
  label: string;
}

/** Grupo de botões segmentados (filtros de estado, visão de cronograma). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (key: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1 rounded-[11px] bg-[#eef0ee] p-1', className)}>
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            'rounded-lg font-semibold transition-colors',
            size === 'sm' ? 'px-3.5 py-1.5 text-[13px]' : 'px-5 py-2 text-sm',
            value === o.key
              ? 'bg-white text-forest-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
              : 'text-ink-500 hover:text-ink-900',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
