import { LogOut } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface LogoutModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Overlay "Confirmar Saída" (node 82:255). */
export function LogoutModal({ open, onCancel, onConfirm }: LogoutModalProps) {
  return (
    <Modal open={open} onClose={onCancel} labelledBy="logout-title">
      <div className="px-8 pb-6 pt-7">
        <div className="flex items-center gap-3">
          <LogOut className="h-7 w-7 text-danger" strokeWidth={2.2} />
          <h2 id="logout-title" className="text-lg font-semibold text-ink-900">
            Sair da conta?
          </h2>
        </div>
        <p className="mt-4 text-[13px] text-ink-500">Você será desconectado do sistema.</p>
      </div>
      <div className="border-t border-ink-200" />
      <div className="flex gap-3 p-6">
        <Button variant="secondary" fullWidth onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="destructive" fullWidth onClick={onConfirm}>
          Sair
        </Button>
      </div>
    </Modal>
  );
}
