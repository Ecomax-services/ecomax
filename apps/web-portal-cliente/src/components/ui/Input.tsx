import { forwardRef, useId, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode;
  error?: string;
}

/** Input padrão do design system (label opcional, estado de erro). */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-medium text-ink-900">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        className={cn(
          'h-12 w-full rounded-[10px] border bg-ink-50 px-[15px] text-sm text-ink-900',
          'placeholder:text-ink-300 focus:bg-white focus-visible:focus-ring',
          error ? 'border-danger' : 'border-ink-200',
          className,
        )}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
});

/** Campo de senha com toggle "Mostrar"/"Ocultar" (RF-005). */
export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(function PasswordInput(
  { label, error, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-medium text-ink-900">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={show ? 'text' : 'password'}
          aria-invalid={!!error}
          className={cn(
            'h-12 w-full rounded-[10px] border bg-ink-50 pl-[15px] pr-[76px] text-sm text-ink-900',
            'placeholder:text-ink-300 focus:bg-white focus-visible:focus-ring',
            error ? 'border-danger' : 'border-ink-200',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-[15px] top-1/2 -translate-y-1/2 text-xs font-medium text-ink-500 hover:text-ink-900"
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {show ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
});
