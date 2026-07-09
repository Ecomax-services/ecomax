import type { ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Corpo extra (ex.: campo de justificativa) entre a descrição e as ações. */
  children?: ReactNode;
  icon?: ReactNode;
}

/** Diálogo de confirmação reutilizável (ações auditadas dos módulos). */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  destructive,
  children,
  icon,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="px-7 pb-5 pt-[26px]">
        {icon}
        <h2 className="text-[19px] font-bold text-ink-900">{title}</h2>
        {description && (
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{description}</p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>
      <div className="flex gap-3 px-7 pb-6">
        <Button variant="secondary" fullWidth onClick={onClose} className="h-[52px]">
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'destructive' : 'primary'}
          fullWidth
          onClick={onConfirm}
          className="h-[52px]"
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
