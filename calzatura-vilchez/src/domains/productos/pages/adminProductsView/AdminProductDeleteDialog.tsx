import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { AdminProduct } from "../adminProductsInternals";
import { useDialogKeyboardTrap } from "@/hooks/useDialogKeyboardTrap";

type Props = Readonly<{
  product: AdminProduct;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}>;

export function AdminProductDeleteDialog({ product, deleting, onCancel, onConfirm }: Props) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus();
  }, []);

  useDialogKeyboardTrap(dialogRef, {
    onEscape: () => {
      if (!deleting) onCancel();
    },
  });

  return (
    <div className="product-modal-host">
      <button
        type="button"
        className="product-modal-backdrop"
        aria-label="Cancelar eliminacion"
        onClick={deleting ? undefined : onCancel}
      />
      <dialog
        ref={dialogRef}
        open
        aria-modal="true"
        aria-labelledby="product-delete-title"
        aria-describedby="product-delete-description"
        className="modal product-delete-dialog"
      >
        <div className="modal-header">
          <h2 id="product-delete-title">
            <AlertTriangle size={18} aria-hidden="true" />
            Eliminar producto
          </h2>
          <button type="button" onClick={onCancel} className="modal-close" aria-label="Cerrar" disabled={deleting}>
            <X size={20} />
          </button>
        </div>

        <div className="product-delete-dialog__body">
          <p id="product-delete-description">
            Esta accion eliminara <strong>{product.nombre}</strong>
            {product.codigo ? ` (${product.codigo})` : ""} del catalogo. No se puede deshacer.
          </p>
          <div className="product-delete-dialog__actions">
            <button type="button" className="btn-outline" onClick={onCancel} disabled={deleting}>
              Cancelar
            </button>
            <button type="button" className="btn-danger" onClick={onConfirm} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar producto"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
