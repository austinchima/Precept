import { Button, Dialog } from './kit';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmationModalProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      testId="confirmation-modal"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} data-testid="confirm-cancel">
            {cancelText}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} data-testid="confirm-accept">
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-[14px] leading-relaxed text-fg-2">{message}</p>
    </Dialog>
  );
}
