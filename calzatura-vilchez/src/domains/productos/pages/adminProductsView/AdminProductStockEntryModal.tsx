import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { X, PackagePlus } from "lucide-react";
import { sizesForCategory } from "@/domains/productos/utils/commercialRules";
import type { AdminProduct } from "../adminProductsInternals";

type Props = Readonly<{
  product: AdminProduct;
  onClose: () => void;
  onSubmit: (
    tallaStock: Record<string, number>,
    costoUnitario: number | undefined,
    proveedor: string,
    observaciones: string,
  ) => Promise<void>;
}>;

function toPositiveInt(value: string): number {
  const n = Number.parseInt(value.replace(/\D/g, ""), 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

function stockSubmitButtonLabel(saving: boolean, totalNuevo: number): string {
  if (saving) return "Registrando...";
  if (totalNuevo > 0) return `Registrar +${totalNuevo}`;
  return "Registrar";
}

export function AdminProductStockEntryModal({ product, onClose, onSubmit }: Props) {
  const modalRef = useRef<HTMLDialogElement | null>(null);
  const sizes = sizesForCategory(product.categoria);
  const [delta, setDelta] = useState<Record<string, number>>(
    Object.fromEntries(sizes.map((s) => [s, 0]))
  );
  const [proveedor, setProveedor]       = useState("");
  const [costo, setCosto]               = useState(
    product.finanzas?.costoCompra ? String(product.finanzas.costoCompra) : ""
  );
  const [observaciones, setObservaciones] = useState("");
  const [saving, setSaving]             = useState(false);

  const totalNuevo = Object.values(delta).reduce((s, v) => s + v, 0);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (totalNuevo === 0) return;
    setSaving(true);
    try {
      const nonZero = Object.fromEntries(
        Object.entries(delta).filter(([, v]) => v > 0)
      );
      const costoNum = costo ? Number.parseFloat(costo) : undefined;
      await onSubmit(nonZero, costoNum, proveedor.trim(), observaciones.trim());
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const first = modalRef.current?.querySelector<HTMLElement>(
      "input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex='-1'])"
    );
    first?.focus();
  }, []);

  const trapFocus = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !modalRef.current) return;
    const focusable = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        "input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex='-1'])"
      )
    ).filter((el) => el.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="product-modal-host">
      <button type="button" className="product-modal-backdrop" aria-label="Cerrar" onClick={onClose} />
      <dialog
        ref={modalRef}
        open
        aria-modal="true"
        aria-labelledby="stock-modal-title"
        className="modal product-modal"
        onKeyDown={trapFocus}
      >
        <div className="modal-header">
          <h2 id="stock-modal-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <PackagePlus size={18} />
            Ingresar Mercancía
          </h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Producto */}
          <div style={{ background: "var(--bg-subtle, #f8f8f8)", borderRadius: "0.5rem", padding: "0.75rem 1rem" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{product.nombre}</p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", opacity: 0.6 }}>
              {product.codigo || "Sin código"} · Stock actual: {product.stock} pares
            </p>
          </div>

          {/* Grid de tallas — cantidades a ingresar */}
          <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
            <legend style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.875rem" }}>
              Unidades que ingresan por talla
            </legend>
            <div className="admin-size-stock-grid">
              {sizes.map((size) => {
                const stockActual = product.tallaStock?.[size] ?? 0;
                return (
                  <label key={size} className="admin-size-stock-item" title={`Stock actual: ${stockActual}`}>
                    <span>{size}</span>
                    <span style={{ fontSize: "0.65rem", opacity: 0.5 }}>({stockActual})</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={delta[size] ?? 0}
                      onChange={(e) => setDelta((prev) => ({ ...prev, [size]: toPositiveInt(e.target.value) }))}
                    />
                  </label>
                );
              })}
            </div>
            {totalNuevo > 0 && (
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-success, #16a34a)" }}>
                Total a ingresar: {totalNuevo} {totalNuevo === 1 ? "par" : "pares"}
              </p>
            )}
          </fieldset>

          {/* Datos del ingreso */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="input-group">
              <label htmlFor="stock-proveedor">Proveedor</label>
              <input
                id="stock-proveedor"
                type="text"
                className="form-input"
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                placeholder="Nombre del proveedor"
                maxLength={80}
              />
            </div>
            <div className="input-group">
              <label htmlFor="stock-costo">Costo unitario (S/)</label>
              <input
                id="stock-costo"
                type="text"
                inputMode="decimal"
                className="form-input"
                value={costo}
                onChange={(e) => setCosto(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
              />
              {costo === "" && (
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "var(--color-alerta, #f59e0b)" }}>
                  Sin costo — afecta métricas de rentabilidad
                </p>
              )}
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="stock-obs">Observaciones</label>
            <textarea
              id="stock-obs"
              className="form-input"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas del ingreso (opcional)"
              maxLength={200}
              rows={2}
              style={{ resize: "none" }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || totalNuevo === 0}
            >
              {stockSubmitButtonLabel(saving, totalNuevo)}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
