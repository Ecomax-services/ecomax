import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost';
type Size = 'md' | 'lg' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

/**
 * A primária é `forest-600` (#1a5c1a), com hover `forest-700` (#155015).
 *
 * Vem do handoff do design system: "Primária #1a5c1a, hover #155015" para
 * Backoffice e Portal. Os protótipos concordam — no do Portal, todo botão
 * primário é `background:#1a5c1a` com `style-hover="background:#155015"`, 34
 * ocorrências contra 1 do tom que este arquivo usava antes.
 *
 * O `forest-500` (#347a34) não existe na paleta do handoff: é uma variação
 * "parecida" do #2e7d32, que a seção "não faça" desaconselha explicitamente.
 */
const variants: Record<Variant, string> = {
  primary: 'bg-forest-600 text-white hover:bg-forest-700 disabled:bg-forest-600/50',
  secondary: 'bg-white border border-ink-200 text-ink-500 hover:bg-ink-50',
  destructive: 'bg-danger text-white hover:opacity-90',
  ghost: 'bg-forest-100 text-forest-500 hover:bg-forest-100/70',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-11 px-4 text-sm',
  lg: 'h-[50px] px-4 text-[15px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-colors',
        'focus-visible:focus-ring disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    />
  );
});
