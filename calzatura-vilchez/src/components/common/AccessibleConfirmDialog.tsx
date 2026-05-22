import { useEffect, useRef, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useDialogKeyboardTrap } from "@/hooks/useDialogKeyboardTrap";

type AccessibleConfirmDialogProps = Readonly<{
  title: string;
  description: ReactNode;
  confirmLabel: string;
  loadingLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}>;

export function AccessibleConfirmDialog({
  title,
  description,
  confirmLabel,
  loadingLabel = "Procesando...",
  cancelLabel = "Cancelar",
  loading = false,
  onCancel,
  onConfirm,
}: AccessibleConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = "accessible-confirm-title";
  const descriptionId = "accessible-confirm-description";

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus();
  }, []);

  useDialogKeyboardTrap(dialogRef, {
    onEscape: () => {
      if (!loading) onCancel();
    },
  });

  return (
    <div className="product-modal-host">
      <button
        type="button"
        className="product-modal-backdrop"
        aria-label={cancelLabel}
        onClick={loading ? undefined : onCancel}
      />
      <dialog
        ref={dialogRef}
        open
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="modal product-delete-dialog"
      >
        <div className="modal-header">
          <h2 id={titleId}>
            <AlertTriangle size={18} aria-hidden="true" />
            {title}
          </h2>
          <button type="button" onClick={onCancel} className="modal-close" aria-label="Cerrar" disabled={loading}>
            <X size={20} />
          </button>
        </div>

        <div className="product-delete-dialog__body">
          <div id={descriptionId} className="product-delete-dialog__description">
            {description}
          </div>
          <div className="product-delete-dialog__actions">
            <button type="button" className="btn-outline" onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </button>
            <button type="button" className="btn-danger" onClick={onConfirm} disabled={loading}>
              {loading ? loadingLabel : confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
