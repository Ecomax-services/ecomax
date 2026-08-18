import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Cabeçalho de coluna. Compartilhado para as tabelas do portal não divergirem. */
export const TH = 'px-4 py-2.5 text-left text-xs font-bold uppercase text-ink-400';

export function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-ink-900">
        {title}
        {count !== undefined && (
          <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[11px] font-semibold text-ink-500">
            {count}
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-ink-200 bg-white text-center text-sm text-ink-400">
      {children}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-ink-200 bg-white text-sm text-ink-400">
      Carregando…
    </div>
  );
}

export function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 rounded-lg bg-expiredTag-bg px-4 py-3 text-sm text-expiredTag-fg">{children}</p>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  /** Rótulo acessível — o campo não tem <label> visível, só o ícone. */
  label: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-10 w-[300px] max-w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-[13px] text-ink-900 placeholder:text-ink-400 focus:border-forest-500 focus:outline-none"
      />
    </div>
  );
}

/**
 * Contador em destaque acima da tabela ("5 ordens de serviço abertas").
 * O plural vem pronto de quem chama — as três telas têm substantivos diferentes.
 */
export function CountHeadline({ n, singular, plural }: { n: number; singular: string; plural: string }) {
  return (
    <p className="text-[15px] text-ink-700">
      <span className="text-[22px] font-bold text-forest-900">{n}</span> {n === 1 ? singular : plural}
    </p>
  );
}
