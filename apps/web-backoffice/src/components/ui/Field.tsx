import { forwardRef } from 'react';
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

const control =
  'w-full rounded-[10px] border bg-white px-3.5 py-3 text-sm text-ink-800 outline-none placeholder:text-ink-400 focus-visible:focus-ring';

/** Rótulo de campo compacto (com asterisco de obrigatório opcional). */
export function FieldLabel({
  children,
  required,
  className,
}: {
  children: ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cn('mb-1.5 block text-[13px] font-semibold text-ink-800', className)}>
      {children}
      {required && <span className="text-danger-bright"> *</span>}
    </label>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, required, hint, error, className, ...props },
  ref,
) {
  return (
    <div>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <input
        ref={ref}
        className={cn(control, error ? 'border-[#ffb8a8]' : 'border-ink-200', className)}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-[13px] text-danger-bright">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
});

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, required, options, className, children, ...props },
  ref,
) {
  return (
    <div>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <select ref={ref} className={cn(control, 'border-ink-200 font-sans', className)} {...props}>
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          : children}
      </select>
    </div>
  );
});

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  required?: boolean;
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  function TextareaField({ label, required, className, ...props }, ref) {
    return (
      <div>
        {label && <FieldLabel required={required}>{label}</FieldLabel>}
        <textarea
          ref={ref}
          className={cn(control, 'min-h-[70px] resize-y border-ink-200', className)}
          {...props}
        />
      </div>
    );
  },
);

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

/** Campo de busca com ícone de lupa. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className, containerClassName, ...props },
  ref,
) {
  return (
    <div className={cn('relative', containerClassName)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
      <input
        ref={ref}
        className={cn(
          'w-full rounded-[10px] border border-ink-200 bg-white py-2.5 pl-11 pr-3.5 text-sm text-ink-800 outline-none placeholder:text-ink-400 focus-visible:focus-ring',
          className,
        )}
        {...props}
      />
    </div>
  );
});
