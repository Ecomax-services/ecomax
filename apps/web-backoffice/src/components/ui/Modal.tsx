import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
}

/** Overlay modal acessível (fecha com ESC e clique no backdrop). */
export function Modal({ open, onClose, children, labelledBy }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // z-80 fica acima do Drawer, que é z-72. Com o valor antigo (z-50) o modal
  // abria **atrás** do drawer: quem clicava em fechar o "Novo follow-up" via a
  // tela parar de responder, porque a confirmação de descarte estava lá,
  // invisível, esperando resposta. Vale para as cinco telas que abrem uma
  // confirmação de dentro de um drawer.
  //
  // O `max-h` com rolagem própria substitui um `overflow-hidden` sem limite de
  // altura, que cortava conteúdo mais alto que a tela — e o que ficava de fora
  // não tinha como ser alcançado. Apareceu na cotação com vários fornecedores,
  // mas valia para todos os modais.
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-[416px] flex-col overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
