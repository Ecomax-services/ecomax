import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone =
  | 'success'
  | 'successStrong'
  | 'info'
  | 'warn'
  | 'danger'
  | 'muted'
  | 'softWarn'
  | 'exp';

const tones: Record<BadgeTone, string> = {
  success: 'bg-tag-successBg text-tag-successFg',
  successStrong: 'bg-tag-successStrongBg text-tag-successStrongFg',
  info: 'bg-tag-infoBg text-tag-infoFg',
  warn: 'bg-tag-warnBg text-tag-warnFg',
  danger: 'bg-tag-dangerBg text-tag-dangerFg',
  muted: 'bg-tag-mutedBg text-tag-mutedFg',
  softWarn: 'bg-tag-softWarnBg text-tag-softWarnFg',
  exp: 'bg-tag-expBg text-tag-expFg',
};

/** Pílula de status reutilizável nas tabelas dos módulos. */
export function Badge({
  tone = 'muted',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
