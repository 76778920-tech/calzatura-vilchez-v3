import { Eye, RotateCcw, X } from "lucide-react";
import type { DailySale } from "@/types";
import { SALE_DOCUMENT_LABELS } from "./adminSaleDocumentLabels";

type AdminSaleDetailModalProps = {
  sale: DailySale;
  onClose: () => void;
  returnMotivo: string;
  onReturnMotivoChange: (value: string) => void;
  onReturn: () => void;
  returning: boolean;
  onViewDocument: (sale: DailySale) => void;
};

export function AdminSaleDetailModal({
  sale,
  onClose,
  returnMotivo,
  onReturnMotivoChange,
  onReturn,
  returning,
  onViewDocument,
}: AdminSaleDetailModalProps) {
  return (
    <div className="sale-modal-overlay">
      <button type="button" className="manufacturer-modal-backdrop" aria-label="Cerrar" onClick={onClose} />
      <div className="sale-modal">
        <div className="sale-modal-header">
          <div>
            <h2>Detalle de venta</h2>
            {sale.devuelto && <span className="sale-devuelto-badge">Devuelto</span>}
          </div>
          <button type="button" className="sale-modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="sale-modal-body">
          <div className="sale-modal-product">
            <span className="admin-code-badge">{sale.codigo}</span>
            <div>
              <strong>{sale.nombre}</strong>
              {(sale.color || sale.talla) && (
                <span>
                  {[sale.color && `Color: ${sale.color}`, sale.talla && `Talla: ${sale.talla}`].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
          </div>

          <div className="sale-modal-grid">
            <div className="sale-modal-info">
              <span className="sale-modal-info-label">Fecha y hora</span>
              <span>{new Date(sale.creadoEn).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" })}</span>
            </div>
            <div className="sale-modal-info">
              <span className="sale-modal-info-label">Comprobante</span>
              <span>{SALE_DOCUMENT_LABELS[sale.documentoTipo ?? "ninguno"]}</span>
            </div>
          </div>

          <div className="sale-modal-amounts">
            <div>
              <span>Cantidad</span>
              <strong>{sale.cantidad} ud.</strong>
            </div>
            <div>
              <span>Precio unitario</span>
              <strong>S/ {sale.precioVenta.toFixed(2)}</strong>
            </div>
            <div>
              <span>Total vendido</span>
              <strong>S/ {sale.total.toFixed(2)}</strong>
            </div>
            <div>
              <span>Ganancia</span>
              <strong>S/ {sale.ganancia.toFixed(2)}</strong>
            </div>
          </div>

          {sale.cliente && (
            <div className="sale-modal-customer">
              <span className="sale-modal-info-label">Cliente</span>
              <strong>
                {sale.cliente.nombres} {sale.cliente.apellidos}
              </strong>
              <span>DNI: {sale.cliente.dni}</span>
            </div>
          )}

          {sale.devuelto && (
            <div className="sale-modal-return-info">
              <strong>Devolución registrada</strong>
              {sale.devueltoEn && (
                <span>{new Date(sale.devueltoEn).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" })}</span>
              )}
              <p>Motivo: {sale.motivoDevolucion}</p>
            </div>
          )}

          {sale.documentoTipo && sale.documentoTipo !== "ninguno" && sale.cliente && (
            <button type="button" className="btn-outline sale-modal-doc-btn" onClick={() => onViewDocument(sale)}>
              <Eye size={15} /> Ver comprobante (PDF)
            </button>
          )}

          {!sale.devuelto && (
            <div className="sale-modal-return">
              <h3>
                <RotateCcw size={14} /> Devolución o corrección
              </h3>
              <p>Indica el motivo. El stock será restaurado automáticamente.</p>
              <textarea
                aria-label="Motivo de devolución"
                value={returnMotivo}
                onChange={(e) => onReturnMotivoChange(e.target.value)}
                placeholder="Ej: Talla equivocada, venta duplicada, cliente desistió..."
                rows={3}
                className="form-input"
              />
              <button type="button" onClick={onReturn} disabled={returning} className="btn-danger sale-modal-return-btn">
                {returning ? "Procesando..." : "Confirmar devolución"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
