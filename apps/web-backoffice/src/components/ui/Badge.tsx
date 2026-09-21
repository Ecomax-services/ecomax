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
  cores,
  children,
  className,
}: {
  tone?: BadgeTone;
  /**
   * Par de cores explícito, em hexadecimal, no lugar do `tone`.
   *
   * Serve ao mapa de status compartilhado (`lib/statusOs.ts`), que entrega hex
   * porque o App Operador é React Native e não tem Tailwind. Traduzir hex para
   * classe exigiria safelist — e é na tradução que a divergência entre os três
   * ambientes nascia.
   *
   * As famílias que continuam em `tone` (orçamento, estoque, garantias) não
   * mudam: os tokens `tag.*` são compartilhados por elas e alterá-los teria
   * efeito muito além do status de OS.
   */
  cores?: { bg: string; fg: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
        !cores && tones[tone],
        className,
      )}
      style={cores ? { backgroundColor: cores.bg, color: cores.fg } : undefined}
    >
      {children}
    </span>
  );
}
