import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Larguras disponíveis.
 *
 * `padrao` serve às confirmações (sair da conta, descartar). `largo` existe
 * para o visualizador de documento: o protótipo desenha o leitor de PDF com
 * 760px, e 416px deixaria a página ilegível.
 */
type Largura = 'padrao' | 'largo';

const larguras: Record<Largura, string> = {
  padrao: 'max-w-[416px]',
  largo: 'max-w-[760px]',
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  largura?: Largura;
}

/** Overlay modal acessível (fecha com ESC e clique no backdrop). */
export function Modal({ open, onClose, children, labelledBy, largura = 'padrao' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        // O `max-h` com rolagem própria substitui um `overflow-hidden` sem
        // limite de altura, que cortava conteúdo mais alto que a tela — e o que
        // ficava de fora não tinha como ser alcançado. Mesma correção que o
        // Modal do Backoffice já tinha recebido.
        className={cn(
          'flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-modal',
          larguras[largura],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
