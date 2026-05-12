import { PackageSearch, X } from "lucide-react";
import type { DailySale } from "@/types";
import { SALE_DOCUMENT_LABELS } from "./adminSaleDocumentLabels";
import { filterDailySalesBySearch } from "./adminSalesHistorialFilter";

type AdminSalesHistorialTableProps = {
  sales: DailySale[];
  historialSearch: string;
  onHistorialSearchChange: (value: string) => void;
  onClearHistorialSearch: () => void;
  onSelectSale: (sale: DailySale) => void;
};

export function AdminSalesHistorialTable({
  sales,
  historialSearch,
  onHistorialSearchChange,
  onClearHistorialSearch,
  onSelectSale,
}: AdminSalesHistorialTableProps) {
  const filtered = filterDailySalesBySearch(sales, historialSearch);

  return (
    <div className="admin-table-wrapper product-table-wrapper">
      <div className="admin-section-header" style={{ padding: "0.5rem 0 0.25rem" }}>
        <h2 style={{ fontSize: "13px", fontWeight: 700 }}>Historial de ventas</h2>
        <span style={{ fontSize: "12px" }}>Haz clic en una venta para ver el detalle o registrar una devolución</span>
      </div>
      <div className="admin-search-wrapper" style={{ marginBottom: "0.75rem" }}>
        <PackageSearch size={15} />
        <input
          value={historialSearch}
          onChange={(e) => onHistorialSearchChange(e.target.value)}
          placeholder="Buscar por código, producto, color, talla, DNI..."
          style={{ fontSize: "13px" }}
        />
        {historialSearch && (
          <button
            type="button"
            onClick={onClearHistorialSearch}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "0 4px", color: "var(--text-muted)" }}
            aria-label="Limpiar búsqueda"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Producto</th>
            <th>Color</th>
            <th>Talla</th>
            <th>Cant.</th>
            <th>Hora</th>
            <th>Total</th>
            <th>Ganancia</th>
            <th>Documento</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={9} className="admin-empty-cell">
                {sales.length === 0 ? "No hay ventas para esta fecha." : "Sin resultados para esa búsqueda."}
              </td>
            </tr>
          )}
          {filtered.map((sale) => (
            <tr
              key={sale.id}
              className={`sale-row-clickable${sale.devuelto ? " sale-row-devuelto" : ""}`}
              onClick={() => {
                onSelectSale(sale);
              }}
            >
              <td>
                <span className="admin-code-badge">{sale.codigo}</span>
              </td>
              <td>{sale.nombre}</td>
              <td>{sale.color || "-"}</td>
              <td>{sale.talla || "-"}</td>
              <td>{sale.cantidad}</td>
              <td>{new Date(sale.creadoEn).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</td>
              <td>S/ {sale.total.toFixed(2)}</td>
              <td>
                <strong>S/ {sale.ganancia.toFixed(2)}</strong>
              </td>
              <td>
                <div className="admin-sale-document-cell">
                  <strong>{SALE_DOCUMENT_LABELS[sale.documentoTipo ?? "ninguno"]}</strong>
                  {sale.devuelto ? (
                    <span className="sale-devuelto-badge">Devuelto</span>
                  ) : sale.cliente ? (
                    <span>
                      {sale.cliente.dni} - {sale.cliente.nombres}
                    </span>
                  ) : (
                    <span>Venta simple</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
