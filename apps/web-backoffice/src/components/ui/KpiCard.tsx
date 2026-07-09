import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type KpiTone = 'green' | 'red' | 'amber' | 'blue' | 'muted';

const tones: Record<KpiTone, { bg: string; fg: string }> = {
  green: { bg: 'bg-primary50', fg: 'text-forest-700' },
  red: { bg: 'bg-[#fff2ee]', fg: 'text-danger-bright' },
  amber: { bg: 'bg-tag-softWarnBg', fg: 'text-tag-warnFg' },
  blue: { bg: 'bg-tag-infoBg', fg: 'text-tag-infoFg' },
  muted: { bg: 'bg-ink-100', fg: 'text-ink-500' },
};

interface KpiCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  tone?: KpiTone;
  /** 'row' = ícone à esquerda; 'stack' = ícone acima do valor. */
  layout?: 'row' | 'stack';
}

/** Card de indicador (KPI) usado nos módulos de Usuários e Estoque. */
export function KpiCard({ icon: Icon, value, label, tone = 'green', layout = 'row' }: KpiCardProps) {
  const t = tones[tone];
  const iconEl = (
    <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', t.bg)}>
      <Icon className={cn('h-6 w-6', t.fg)} />
    </span>
  );

  if (layout === 'stack') {
    return (
      <div className="rounded-2xl border border-ink-100 bg-white p-4">
        <span className={cn('mb-2.5 flex h-9 w-9 items-center justify-center rounded-[10px]', t.bg)}>
          <Icon className={cn('h-5 w-5', t.fg)} />
        </span>
        <div className="text-2xl font-bold leading-none text-ink-900">{value}</div>
        <div className="mt-1 text-xs text-ink-500">{label}</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-ink-100 bg-white p-4">
      {iconEl}
      <div>
        <div className="text-2xl font-bold leading-none text-ink-900">{value}</div>
        <div className="mt-1 text-xs text-ink-500">{label}</div>
      </div>
    </div>
  );
}
