import { Calculator, CircleDollarSign, FileText, IdCard, PackageSearch, Plus, Trash2, TrendingUp, Truck } from "lucide-react";
import { AdminSaleDetailModal } from "./AdminSaleDetailModal";
import { AdminSalesHistorialTable } from "./AdminSalesHistorialTable";
import type { AdminSalesPageModel } from "./useAdminSalesPage";
import { saleLineTotal } from "./adminSalesRegisterLogic";

export type AdminSalesLoadedViewProps = Omit<AdminSalesPageModel, "loading">;

export function AdminSalesLoadedView(p: AdminSalesLoadedViewProps) {
  return (
    <div className="admin-products-page">
      <div className="admin-page-header">
        <div>
          <span className="admin-page-kicker">Ventas diarias</span>
          <h1 className="admin-page-title">Consulta y registro de ventas</h1>
          <p className="admin-page-subtitle">
            Agrega una o varias tallas al detalle y registra la venta completa.
          </p>
        </div>
        <div className="admin-date-label-group">
          <span className="admin-date-label">Fecha de métricas y registro</span>
          <input type="date" value={p.date} onChange={(e) => p.setDate(e.target.value)} className="form-input admin-date-input" />
        </div>
      </div>

      <div className="admin-stats-grid product-stats-grid">
        <div className="stat-card admin-metric-card">
          <CircleDollarSign size={22} />
          <div><span>Vendido — {new Date(p.date + "T12:00:00").toLocaleDateString("es-PE", { day: "numeric", month: "short" })}</span><strong>S/ {p.totals.total.toFixed(2)}</strong></div>
        </div>
        <div className="stat-card admin-metric-card">
          <TrendingUp size={22} />
          <div><span>Ganancia</span><strong>S/ {p.totals.ganancia.toFixed(2)}</strong></div>
        </div>
        <div className="stat-card admin-metric-card">
          <PackageSearch size={22} />
          <div><span>Unidades</span><strong>{p.totals.cantidad}</strong></div>
        </div>
        <div className="stat-card admin-metric-card">
          <Calculator size={22} />
          <div><span>Productos</span><strong>{p.products.length}</strong></div>
        </div>
      </div>

      <div className="admin-sales-grid">
        <div className="admin-sale-panel">
          <div className="admin-sale-section">
            <div className="admin-section-header">
              <div>
                <h2>Buscar producto</h2>
                <span>Primero marca, luego codigo o modelo.</span>
              </div>
            </div>

            <div className="admin-sale-lookup-grid">
              <div className="form-group admin-suggest-field">
                <label>Marca</label>
                <div className="admin-search-wrapper">
                  <PackageSearch size={17} />
                  <input
                    value={p.brandSearch}
                    onChange={(e) => p.handleBrandSearchChange(e.target.value)}
                    onFocus={() => p.setBrandFocused(true)}
                    onBlur={() => window.setTimeout(() => p.setBrandFocused(false), 120)}
                    placeholder="Escribe la marca"
                  />
                </div>
                {p.brandFocused && p.brandSuggestions.length > 0 && (
                  <div className="admin-suggestions-list">
                    {p.brandSuggestions.map((brand) => (
                      <button
                        key={brand}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => p.selectBrand(brand)}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group admin-suggest-field">
                <label>Codigo o modelo</label>
                <div className="admin-search-wrapper">
                  <PackageSearch size={17} />
                  <input
                    value={p.codeSearch}
                    onChange={(e) => p.handleCodeSearchChange(e.target.value)}
                    onFocus={() => p.setCodeFocused(true)}
                    onBlur={() => window.setTimeout(() => p.setCodeFocused(false), 120)}
                    placeholder="Escribe codigo o nombre"
                  />
                </div>
                {p.codeFocused && p.codeSuggestions.length > 0 && (
                  <div className="admin-suggestions-list product-suggestions-list">
                    {p.codeSuggestions.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => p.selectProduct(product)}
                      >
                        <span className="admin-code-badge">{product.codigo || "SIN-CODIGO"}</span>
                        <strong>{product.nombre}</strong>
                        <small>{product.marca || "Sin marca"}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {p.selectedProduct ? (
              <div className="admin-selected-product">
                <span className="admin-code-badge">{p.selectedProduct.codigo || "SIN-CODIGO"}</span>
                <div>
                  <strong>{p.selectedProduct.nombre}</strong>
                  <small>{p.selectedProduct.marca || "Sin marca"}</small>
                </div>
              </div>
            ) : (
              <p className="admin-empty">Busca y selecciona un producto para continuar con la venta.</p>
            )}
          </div>

          {p.selectedProduct && (
            <div className="admin-sale-config-grid">
            <div className="admin-sale-section">
              <div className="admin-section-header">
                <div>
                  <h2>Color y talla</h2>
                  <span>Elige manualmente la variante que se vendera.</span>
                </div>
              </div>

              {p.availableColors.length > 0 && (
                <div className="form-group">
                  <label>Color</label>
                  <div className="admin-choice-grid">
                    {p.availableColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => p.handleColorChange(color)}
                        className={`admin-choice-btn ${p.selectedColor === color ? "active" : ""}`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {p.availableColors.length > 0 && !p.selectedColor ? (
                <p className="admin-empty">Selecciona un color para ver sus tallas disponibles.</p>
              ) : p.availableSizes.length > 0 ? (
                <div className="form-group">
                  <label>Talla</label>
                  <div className="admin-size-picker">
                    {p.availableSizes.map((size) => {
                      const stock = p.availableForSize(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          disabled={stock <= 0}
                          onClick={() => p.setSelectedTalla(size)}
                          className={`admin-size-choice ${p.selectedTalla === size ? "active" : ""}`}
                        >
                          <strong>{size}</strong>
                          <span>{stock} disp.</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="admin-empty">No hay tallas disponibles para esta seleccion.</p>
              )}
            </div>

            <div className="admin-sale-section">
              <div className="admin-section-header">
                <div>
                  <h2>Precio y cantidad</h2>
                  <span>Confirma el precio dentro del rango permitido.</span>
                </div>
              </div>

              {p.selectedProduct.finanzas ? (
                <div className="admin-price-consult">
                  <span>Minimo: S/ {p.selectedProduct.finanzas.precioMinimo.toFixed(2)}</span>
                  <strong>Sugerido: S/ {p.selectedProduct.finanzas.precioSugerido.toFixed(2)}</strong>
                  <span>Maximo: S/ {p.selectedProduct.finanzas.precioMaximo.toFixed(2)}</span>
                </div>
              ) : (
                <p className="admin-empty">Este producto necesita costo real y margenes en Productos.</p>
              )}

          <div className="form-row">
            <div className="form-group">
              <label>Cantidad</label>
              <input
                type="number"
                min={1}
                max={p.availableForSelected || 1}
                value={p.quantity}
                onChange={(e) => p.setQuantity(Number(e.target.value))}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Precio de venta</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={p.salePrice}
                onChange={(e) => p.setSalePrice(Number(e.target.value))}
                className="form-input"
              />
            </div>
          </div>

          <div className="admin-sale-summary">
            <span>Stock disponible: {p.availableForSelected}</span>
            <strong>Total linea: S/ {(p.salePrice * p.quantity).toFixed(2)}</strong>
          </div>

              <button type="button" onClick={p.addLine} className="btn-outline admin-sale-add-line">
                <Plus size={16} /> Agregar al detalle
              </button>
            </div>
            </div>
          )}

          <div className="admin-pending-sale">
            <div className="admin-section-header">
              <h2>Detalle por registrar</h2>
              <strong>S/ {p.totals.pending.total.toFixed(2)}</strong>
            </div>
            {p.pendingLines.length === 0 ? (
              <p className="admin-empty">Aun no agregaste productos a esta venta.</p>
            ) : (
              <div className="admin-pending-lines">
                {p.pendingLines.map((line) => {
                  const product = p.products.find((pr) => pr.id === line.productId);
                  return (
                    <div key={line.id} className="admin-pending-line">
                      <div>
                        <strong>{product?.nombre}</strong>
                        <span>
                          {line.color || "Sin color"} - Talla {line.talla || "-"} - x{line.quantity}
                        </span>
                      </div>
                      <strong>S/ {saleLineTotal(line).toFixed(2)}</strong>
                      <button type="button" onClick={() => p.removeLine(line.id)} className="action-btn delete-btn" aria-label="Quitar línea">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="admin-sale-document-box">
            <div className="admin-section-header">
              <div>
                <h2>Documento del cliente</h2>
                <span>Selecciona nota o guia solo si el cliente la solicita.</span>
              </div>
            </div>

            <div className="admin-document-options" role="radiogroup" aria-label="Documento de venta">
              <button
                type="button"
                onClick={() => p.handleDocumentTypeChange("ninguno")}
                className={`admin-document-option ${p.documentType === "ninguno" ? "active" : ""}`}
              >
                <FileText size={16} />
                <span>Venta simple</span>
              </button>
              <button
                type="button"
                onClick={() => p.handleDocumentTypeChange("nota_venta")}
                className={`admin-document-option ${p.documentType === "nota_venta" ? "active" : ""}`}
              >
                <FileText size={16} />
                <span>Nota de venta</span>
              </button>
              <button
                type="button"
                onClick={() => p.handleDocumentTypeChange("guia_remision")}
                className={`admin-document-option ${p.documentType === "guia_remision" ? "active" : ""}`}
              >
                <Truck size={16} />
                <span>Guia de remision</span>
              </button>
            </div>

            {p.requiresCustomer && (
              <div className="admin-sale-customer-box">
                <div className="admin-sale-dni-row">
                  <div className="form-group">
                    <label>DNI del cliente</label>
                    <input
                      value={p.customer.dni}
                      onChange={(e) => p.handleCustomerDniChange(e.target.value)}
                      maxLength={8}
                      inputMode="numeric"
                      className="form-input"
                      placeholder="12345678"
                    />
                  </div>
                  <button type="button" onClick={() => void p.validateCustomerDni()} disabled={p.lookingUpDni} className="btn-outline admin-sale-dni-btn">
                    <IdCard size={16} /> {p.lookingUpDni ? "Validando..." : "Validar DNI"}
                  </button>
                </div>

                <div className="admin-sale-customer-grid">
                  <div className="form-group">
                    <label>Nombres</label>
                    <input value={p.customer.nombres} readOnly className="form-input" placeholder="Se completa al validar" />
                  </div>
                  <div className="form-group">
                    <label>Apellidos</label>
                    <input value={p.customer.apellidos} readOnly className="form-input" placeholder="Se completa al validar" />
                  </div>
                </div>

                {p.customerIsValidated && <span className="admin-sale-validated">Cliente validado por DNI</span>}
              </div>
            )}
          </div>

          <button type="button" onClick={p.registerPendingLines} disabled={p.saving || p.pendingLines.length === 0} className="btn-primary">
            <Plus size={16} /> {p.saving ? "Registrando..." : "Registrar venta completa"}
          </button>
        </div>

        <AdminSalesHistorialTable
          sales={p.sales}
          historialSearch={p.historialSearch}
          onHistorialSearchChange={p.setHistorialSearch}
          onClearHistorialSearch={() => p.setHistorialSearch("")}
          onSelectSale={(sale) => {
            p.setSelectedSale(sale);
            p.setReturnMotivo("");
          }}
        />
      </div>

      {p.selectedSale && (
        <AdminSaleDetailModal
          sale={p.selectedSale}
          onClose={() => p.setSelectedSale(null)}
          returnMotivo={p.returnMotivo}
          onReturnMotivoChange={p.setReturnMotivo}
          onReturn={() => void p.handleReturn()}
          returning={p.returning}
          onViewDocument={p.handleViewDocument}
        />
      )}
    </div>
  );
}
