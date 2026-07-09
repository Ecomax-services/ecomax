import { cn } from '@/lib/cn';

const LOGO_SRC = '/assets/ecomax-logo.png'; // wordmark completo (símbolo + ECOMAX)
const MARK_SRC = '/assets/ecomax-mark.png'; // só o símbolo (swoosh)

/**
 * Marca Ecomax usando os assets oficiais.
 * - `variant="full"`: wordmark completo.
 * - `variant="mark"`: só o símbolo (swoosh).
 * - `mono`: aplica filtro branco para fundos escuros.
 */
export function Logo({
  className,
  variant = 'full',
  mono = false,
}: {
  className?: string;
  variant?: 'full' | 'mark';
  mono?: boolean;
}) {
  const filter = mono ? 'brightness(0) invert(1)' : undefined;

  if (variant === 'mark') {
    return (
      <img
        src={MARK_SRC}
        alt="Ecomax"
        className={cn('h-12 w-auto', className)}
        style={{ filter }}
      />
    );
  }

  return (
    <img src={LOGO_SRC} alt="Ecomax" className={cn('w-auto', className)} style={{ filter }} />
  );
}
