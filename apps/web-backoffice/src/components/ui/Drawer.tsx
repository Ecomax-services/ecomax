import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Conteúdo abaixo do cabeçalho, dentro do próprio header (ex.: abas). */
  headerExtra?: ReactNode;
  footer?: ReactNode;
  width?: number;
  children: ReactNode;
}

/** Painel lateral (drawer) direito para cadastros/detalhes dos módulos. */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  headerExtra,
  footer,
  width = 480,
  children,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[72] flex justify-end bg-black/45" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-full max-w-[94vw] flex-col bg-white shadow-[-12px_0_40px_rgba(11,27,58,0.18)]"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn('border-b border-ink-100 px-7', headerExtra ? 'pt-[22px]' : 'py-[22px]')}>
          <div className={cn('flex items-start justify-between', !!headerExtra && 'mb-3.5')}>
            <div>
              <h2 className="text-[19px] font-bold text-ink-900">{title}</h2>
              {subtitle && <p className="mt-0.5 text-[13px] text-ink-400">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border border-ink-100 bg-white text-ink-500 hover:bg-ink-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {headerExtra}
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6">{children}</div>

        {footer && <div className="flex gap-3 border-t border-ink-100 px-7 py-[18px]">{footer}</div>}
      </div>
    </div>
  );
}
