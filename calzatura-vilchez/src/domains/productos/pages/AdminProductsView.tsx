import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  Copy,
  Link as LinkIcon,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  CATEGORIAS,
  MATERIAL_PRESETS,
  STYLE_OPTIONS,
} from "@/domains/productos/utils/commercialRules";
import { categoryLabel } from "@/utils/labels";
import { capitalizeWords } from "@/utils/colors";
import { sumSizeStock } from "@/utils/stock";
import ImagePreviewModal from "@/domains/administradores/components/ImagePreviewModal";
import { normalizeVariantCode } from "@/domains/productos/utils/variantCreation";
import {
  COLOR_PALETTE,
  FALLBACK_PRODUCT_IMAGE,
  getColorHex,
  LOW_STOCK_LIMIT,
  normalizeImageSlots,
  toPositiveInteger,
  toPositiveNumber,
} from "./adminProductsInternals";
import type { FeaturedFilter, StockFilter } from "./adminProductsListFilters";
import type { AdminProductsViewModel } from "./useAdminProductsPage";

export function AdminProductsView({
  activeColorSlot,
  activeColorSlotRef,
  categoryFilter,
  clearFilters,
  clearImage,
  closeModal,
  colorPaletteOpen,
  colorPaletteRef,
  compressing,
  currentFootwearTypes,
  currentImages,
  currentSizes,
  currentStock,
  editingId,
  estiloChipTokens,
  estiloSelectOpen,
  estiloSelectRef,
  estiloSummaryLabel,
  featuredFilter,
  fileInputRefs,
  filteredProducts,
  form,
  formPriceRange,
  handleDelete,
  handleFileChange,
  handleSave,
  handleVariantFileChange,
  handleVariantsMouseDown,
  handleVariantsMouseMove,
  hasActiveFilters,
  isDraggingVariants,
  isMultiColorCreate,
  loading,
  modalRef,
  openCreate,
  openEdit,
  openVariant,
  popoverAbove,
  previewImage,
  products,
  saving,
  searchTerm,
  setActiveColorSlot,
  setCategoryFilter,
  setColorPaletteOpen,
  setEstiloSelectOpen,
  setFeaturedFilter,
  setForm,
  setPopoverAbove,
  setPreviewImage,
  setSearchTerm,
  setStockFilter,
  setFileInputRef,
  setSlotColor,
  showModal,
  stats,
  stockFilter,
  stopVariantsDrag,
  toggleEstiloOption,
  trapFocus,
  updateCategory,
  updateImageUrl,
  updateTallaStock,
  updateVariantSlot,
  updateVariantSlotImageUrl,
  updateVariantSlotStock,
  validateImageUrl,
  validateVariantSlotImageUrl,
  variantSlots,
  variantTotalStock,
  variantsCarouselRef,
}: AdminProductsViewModel) {
  return (
    <div className="admin-products-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Productos</h1>
        </div>
      </div>

      <div className="admin-stats-grid product-stats-grid">
        <div className="stat-card admin-metric-card">
          <Boxes size={22} />
          <div>
            <span>Total productos</span>
            <strong>{products.length}</strong>
          </div>
        </div>
        <div className="stat-card admin-metric-card">
          <AlertTriangle size={22} />
          <div>
            <span>Stock bajo</span>
            <strong>{stats.bajoStock}</strong>
          </div>
        </div>
        <div className="stat-card admin-metric-card">
          <PackageCheck size={22} />
          <div>
            <span>Stock total</span>
            <strong>{stats.stockTotal}</strong>
          </div>
        </div>
        <div className="stat-card admin-metric-card">
          <Star size={22} />
          <div>
            <span>Destacados</span>
            <strong>{stats.destacados}</strong>
          </div>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search-wrapper">
          <Search size={17} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por código, nombre, marca, color, categoría, tipo o descripción"
          />
        </div>
        <div className="admin-filter-grid">
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="form-input">
            <option value="todos">Todas las categorías</option>
            {CATEGORIAS.map((category) => (
              <option key={category} value={category}>{categoryLabel(category)}</option>
            ))}
          </select>
          <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as StockFilter)} className="form-input">
            <option value="todos">Todo el stock</option>
            <option value="con-stock">Con stock saludable</option>
            <option value="bajo-stock">Stock bajo</option>
            <option value="sin-stock">Sin stock</option>
          </select>
          <select value={featuredFilter} onChange={(event) => setFeaturedFilter(event.target.value as FeaturedFilter)} className="form-input">
            <option value="todos">Todos</option>
            <option value="destacados">Destacados</option>
            <option value="normales">No destacados</option>
          </select>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="btn-outline admin-clear-filters">
              Limpiar
            </button>
          )}
          <button type="button" onClick={openCreate} className="btn-primary admin-toolbar-create">
            <Plus size={16} /> Producto nuevo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="products-grid">
          {[...Array(6)].map((_, index) => <div key={index} className="skeleton-card" />)}
        </div>
      ) : (
        <div className="admin-table-wrapper product-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Código</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Tipo</th>
                <th>Precio</th>
                <th>Rango venta</th>
                <th>Stock</th>
                <th>Destacado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={10} className="admin-empty-cell">
                    {products.length === 0
                      ? "No hay productos. Crea el primero."
                      : "No se encontraron productos con esos filtros."}
                  </td>
                </tr>
              )}
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <button
                      type="button"
                      className="admin-image-thumb-button"
                      onClick={() => setPreviewImage({
                        src: product.imagen || FALLBACK_PRODUCT_IMAGE,
                        title: product.nombre,
                        subtitle: "Producto",
                      })}
                      aria-label={`Abrir imagen de ${product.nombre}`}
                    >
                      <img
                        src={product.imagen || FALLBACK_PRODUCT_IMAGE}
                        alt={product.nombre}
                        className="admin-product-img"
                        onError={(event) => {
                          const img = event.target as HTMLImageElement;
                          img.onerror = null;
                          img.src = FALLBACK_PRODUCT_IMAGE;
                        }}
                      />
                    </button>
                  </td>
                  <td><span className="admin-code-badge">{product.codigo || "SIN-CODIGO"}</span></td>
                  <td>
                    <div className="admin-product-cell">
                      <strong>{product.nombre}</strong>
                      <span>
                        {product.marca || "Sin marca"}
                        {product.material ? ` · ${product.material}` : ""}
                        {product.color ? ` · ${product.color}` : ""}
                      </span>
                    </div>
                  </td>
                  <td><span className="admin-soft-badge">{categoryLabel(product.categoria)}</span></td>
                  <td><span className="admin-soft-badge">{product.tipoCalzado || "Sin tipo"}</span></td>
                  <td>S/ {product.precio.toFixed(2)}</td>
                  <td>
                    {product.finanzas ? (
                      <div className="admin-range-cell">
                        <strong>S/ {product.finanzas.precioMinimo.toFixed(2)} - S/ {product.finanzas.precioMaximo.toFixed(2)}</strong>
                        <span>Sugerido: S/ {product.finanzas.precioSugerido.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="admin-status-badge muted">Sin costo</span>
                    )}
                  </td>
                  <td>
                    <span className={product.stock === 0 ? "stock-badge out" : product.stock <= LOW_STOCK_LIMIT ? "stock-badge low" : "stock-badge in"}>
                      {product.stock}
                    </span>
                  </td>
                  <td>
                    <span className={product.destacado ? "admin-status-badge featured" : "admin-status-badge muted"}>
                      {product.destacado ? "Sí" : "No"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button onClick={() => openVariant(product)} className="action-btn" title="Crear variante de color" aria-label={`Crear variante de ${product.nombre}`}>
                        <Copy size={14} />
                      </button>
                      <button onClick={() => openEdit(product)} className="action-btn edit-btn" aria-label={`Editar ${product.nombre}`}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(product)} className="action-btn delete-btn" aria-label={`Eliminar ${product.nombre}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
            className={`modal product-modal${!editingId ? " product-modal--create" : ""}`}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={trapFocus}
          >
            <div className="modal-header">
              <h2 id="product-modal-title">{editingId ? "Editar producto" : "Nuevo producto"}</h2>
              <button onClick={closeModal} className="modal-close" aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="modal-form">
              <div className="product-form-layout">
                <aside className={`admin-form-card admin-image-card${!editingId ? " admin-variants-card" : ""}`}>
                  <div className="admin-form-card-header">
                    <strong>{editingId ? "Galería" : "Variantes"}</strong>
                    <span className="admin-stock-pill">Stock: <strong>{editingId ? currentStock : variantTotalStock}</strong></span>
                  </div>
                  {editingId ? (
                    <div className="admin-image-grid">
                      {currentImages.map((image, index) => (
                      <div key={index} className="admin-image-slot">
                        <button
                          type="button"
                          className="image-upload-area"
                          onClick={() => {
                            if (compressing) return;
                            if (image) {
                              setPreviewImage({
                                src: image,
                                title: `${form.nombre || "Producto"} - Imagen ${index + 1}`,
                                subtitle: "Galería",
                              });
                              return;
                            }
                            fileInputRefs.current[index]?.click();
                          }}
                          disabled={compressing}
                        >
                          {image ? (
                            <img src={image} alt={`Vista previa ${index + 1}`} className="image-preview" />
                          ) : (
                            <div className="image-upload-placeholder">
                              <Upload size={28} />
                              <span>{compressing ? "Subiendo..." : `Imagen ${index + 1}`}</span>
                              <small>JPG, PNG o WEBP</small>
                            </div>
                          )}
                        </button>
                        <input
                          ref={setFileInputRef(index)}
                          type="file"
                          accept="image/*"
                          onChange={(event) => handleFileChange(event, index)}
                          style={{ display: "none" }}
                        />
                        <div className="input-wrapper">
                          <LinkIcon size={14} className="input-icon" />
                          <input
                            type="text"
                            inputMode="url"
                            value={image.startsWith("data:") ? "" : image}
                            onChange={(event) => updateImageUrl(index, event.target.value)}
                            onBlur={(event) => validateImageUrl(index, event.target.value)}
                            placeholder={`URL de imagen ${index + 1}`}
                            className="form-input with-icon with-action"
                          />
                          {image && (
                            <button
                              type="button"
                              className="input-action-btn"
                              onClick={() => clearImage(index)}
                              aria-label={`Quitar imagen ${index + 1}`}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {variantSlots.every((s) => !s.color) ? (
                        <div className="admin-variants-empty">
                          <p>Selecciona un color para ver aquí las imágenes de cada variante.</p>
                        </div>
                      ) : (
                        <div
                          ref={variantsCarouselRef}
                          className={`admin-variants-carousel${isDraggingVariants ? " dragging" : ""}`}
                          onMouseDown={handleVariantsMouseDown}
                          onMouseMove={handleVariantsMouseMove}
                          onMouseUp={stopVariantsDrag}
                          onMouseLeave={stopVariantsDrag}
                        >
                          {variantSlots.map((slot, slotIndex) => {
                            if (!slot.color) return null;
                            const slotImages = normalizeImageSlots(slot.imagenes);
                            const colorHex = getColorHex(slot.color);
                            return (
                              <div key={slotIndex} className="admin-variant-carousel-card">
                                <div className="admin-variant-block-header">
                                  <span className="admin-variant-block-label">
                                    <span className="admin-variant-color-dot" style={{ background: colorHex }} />
                                    {slot.color}
                                  </span>
                                  <button
                                    type="button"
                                    className="admin-variant-block-clear"
                                    onClick={() => setSlotColor(slotIndex, "")}
                                    aria-label={`Quitar Color ${slotIndex + 1}`}
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                                <div className="admin-image-grid">
                                  {slotImages.map((image, imageIndex) => (
                                    <div key={imageIndex} className="admin-image-slot">
                                      <button
                                        type="button"
                                        className="image-upload-area"
                                        onClick={() => {
                                          if (compressing) return;
                                          const input = document.getElementById(`variant-upload-${slotIndex}-${imageIndex}`) as HTMLInputElement | null;
                                          input?.click();
                                        }}
                                        disabled={compressing}
                                      >
                                        {image ? (
                                          <img src={image} alt={`Color ${slotIndex + 1} imagen ${imageIndex + 1}`} className="image-preview" />
                                        ) : (
                                          <div className="image-upload-placeholder">
                                            <Upload size={22} />
                                            <span>{compressing ? "Subiendo..." : `Imagen ${imageIndex + 1}`}</span>
                                            <small>JPG · PNG · WEBP</small>
                                          </div>
                                        )}
                                      </button>
                                      <input
                                        id={`variant-upload-${slotIndex}-${imageIndex}`}
                                        type="file"
                                        accept="image/*"
                                        onChange={(event) => handleVariantFileChange(event, slotIndex, imageIndex)}
                                        style={{ display: "none" }}
                                      />
                                      <div className="input-wrapper">
                                        <LinkIcon size={14} className="input-icon" />
                                        <input
                                          type="text"
                                          inputMode="url"
                                          value={image.startsWith("data:") ? "" : image}
                                          onChange={(event) => updateVariantSlotImageUrl(slotIndex, imageIndex, event.target.value)}
                                          onBlur={(event) => validateVariantSlotImageUrl(slotIndex, imageIndex, event.target.value)}
                                          placeholder={`URL imagen ${imageIndex + 1}`}
                                          className="form-input with-icon"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <details className="admin-variant-details">
                                  <summary>Texto y visibilidad ({slot.color})</summary>
                                  <div className="admin-variant-details-body">
                                    <label className="checkbox-label admin-variant-details-check">
                                      <input
                                        type="checkbox"
                                        checked={slot.activo}
                                        onChange={(event) =>
                                          updateVariantSlot(slotIndex, (s) => ({ ...s, activo: event.target.checked }))
                                        }
                                      />
                                      Visible en tienda (solo este color)
                                    </label>
                                    <label className="admin-variant-details-label" htmlFor={`variant-desc-${slotIndex}`}>
                                      Descripción del color
                                    </label>
                                    <textarea
                                      id={`variant-desc-${slotIndex}`}
                                      value={slot.descripcion}
                                      onChange={(event) =>
                                        updateVariantSlot(slotIndex, (s) => ({ ...s, descripcion: event.target.value }))
                                      }
                                      rows={2}
                                      className="form-input admin-variant-details-textarea"
                                      placeholder="Tonos, material visible en este color, combinaciones…"
                                    />
                                    <p className="admin-variant-details-hint">
                                      Si lo dejas vacío, se usará la descripción común del final del formulario.
                                    </p>
                                  </div>
                                </details>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </aside>

                <div className="product-form-fields">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Código interno *</label>
                      <input
                        value={form.codigo ?? ""}
                        onChange={(event) => setForm({ ...form, codigo: normalizeVariantCode(event.target.value) })}
                        required
                        className="form-input"
                        placeholder="CV-FOR-001"
                      />
                    </div>
                    <div className="form-group">
                      <label>Nombre *</label>
                      <input
                        value={form.nombre}
                        onChange={(event) => setForm({ ...form, nombre: event.target.value })}
                        required
                        className="form-input"
                        placeholder="Zapato formal negro"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Marca *</label>
                      <input
                        value={form.marca ?? ""}
                        onChange={(event) => setForm({ ...form, marca: event.target.value })}
                        required
                        className="form-input"
                        placeholder="Calzatura Vilchez"
                      />
                    </div>
                    <div className="form-group">
                      <label>Material</label>
                      <select
                        value={form.material ?? ""}
                        onChange={(event) => setForm({ ...form, material: event.target.value || undefined })}
                        className="form-input"
                      >
                        <option value="">Sin material</option>
                        {MATERIAL_PRESETS.map((material) => (
                          <option key={material} value={material}>
                            {material}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {editingId && (
                    <div className="form-row form-row-single">
                      <div className="form-group">
                        <label>Color *</label>
                        <div className="admin-material-select" ref={colorPaletteRef}>
                          <button
                            type="button"
                            className={`admin-material-trigger ${colorPaletteOpen ? "active" : ""}`}
                            onClick={() => setColorPaletteOpen((current) => !current)}
                            aria-label="Abrir paleta de colores"
                          >
                            <span className="admin-material-trigger-copy">
                              <span className="admin-material-trigger-label">Color</span>
                              <span className="admin-material-trigger-value">{form.color ?? ""}</span>
                            </span>
                            <ChevronDown size={14} />
                          </button>
                          {colorPaletteOpen && (
                            <div className="admin-color-popover" role="dialog" aria-label="Paleta de colores">
                              <div className="admin-color-popover-grid">
                                <button
                                  type="button"
                                  className={`admin-color-popover-item ${!form.color ? "active" : ""}`}
                                  onClick={() => { setForm({ ...form, color: "" }); setColorPaletteOpen(false); }}
                                >
                                  <span className="admin-color-popover-swatch admin-color-popover-swatch-empty" aria-hidden="true" />
                                  <span>Sin color</span>
                                </button>
                                {COLOR_PALETTE.map((preset) => {
                                  const isActive = capitalizeWords(form.color ?? "").toLowerCase() === preset.name.toLowerCase();
                                  return (
                                    <button
                                      key={preset.name}
                                      type="button"
                                      className={`admin-color-popover-item ${isActive ? "active" : ""}`}
                                      onClick={() => { setForm({ ...form, color: preset.name }); setColorPaletteOpen(false); }}
                                    >
                                      <span
                                        className="admin-color-popover-swatch"
                                        style={{ background: preset.hex }}
                                        aria-hidden="true"
                                      />
                                      <span>{preset.name}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        <input
                          value={form.color ?? ""}
                          onChange={(event) => setForm({ ...form, color: capitalizeWords(event.target.value) })}
                          className="form-input"
                          list="admin-color-suggestions"
                          placeholder="Escribe un color (ej. Negro, Blanco, Azul Marino)"
                          style={{ marginTop: "0.55rem" }}
                        />
                        <datalist id="admin-color-suggestions">
                          {COLOR_PALETTE.map((preset) => (
                            <option key={preset.name} value={preset.name} />
                          ))}
                        </datalist>
                        <small className="admin-help-text">
                          Si no se abre la paleta o no encuentras el color, escríbelo aquí.
                        </small>
                      </div>
                    </div>
                  )}

                  <div className="form-row product-core-row">
                    <div className="form-group">
                      <label>Categoría</label>
                      <select value={form.categoria} onChange={(event) => updateCategory(event.target.value)} className="form-input" required>
                        <option value="">Selecciona la categoría</option>
                        {CATEGORIAS.map((category) => (
                          <option key={category} value={category}>{categoryLabel(category)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Tipo de calzado *</label>
                      <select
                        value={form.tipoCalzado ?? ""}
                        onChange={(event) => setForm({ ...form, tipoCalzado: event.target.value })}
                        required
                        className="form-input"
                        disabled={!form.categoria}
                      >
                        <option value="">Selecciona un tipo</option>
                        {currentFootwearTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label id="admin-estilo-label">Estilo</label>
                      <div className="admin-estilo-dropdown" ref={estiloSelectRef}>
                        <button
                          type="button"
                          className={`admin-estilo-dropdown-trigger${estiloSelectOpen ? " active" : ""}`}
                          aria-haspopup="listbox"
                          aria-expanded={estiloSelectOpen}
                          aria-labelledby="admin-estilo-label"
                          onClick={() => setEstiloSelectOpen((o) => !o)}
                        >
                          <span className="admin-estilo-dropdown-value">{estiloSummaryLabel}</span>
                          <ChevronDown size={18} aria-hidden />
                        </button>
                        {estiloSelectOpen && (
                          <div
                            className="admin-estilo-dropdown-panel"
                            role="listbox"
                            aria-multiselectable="true"
                            aria-labelledby="admin-estilo-label"
                          >
                            {STYLE_OPTIONS.map((opt) => (
                              <label key={opt} className="admin-estilo-check-row" role="option" aria-selected={estiloChipTokens.includes(opt)}>
                                <input
                                  type="checkbox"
                                  checked={estiloChipTokens.includes(opt)}
                                  onChange={() => toggleEstiloOption(opt)}
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Precio (S/) *</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.precio === 0 ? "" : form.precio}
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) => setForm({ ...form, precio: toPositiveNumber(event.target.value) })}
                        required
                        className="form-input"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="admin-finance-box">
                    <div>
                      <span className="admin-page-kicker admin-finance-kicker">Rentabilidad <span>(Rango óptimo de venta)</span></span>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Costo real de compra (S/) *</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.costoCompra === 0 ? "" : form.costoCompra}
                          onFocus={(event) => event.currentTarget.select()}
                          onChange={(event) => setForm({ ...form, costoCompra: toPositiveNumber(event.target.value) })}
                          required
                          className="form-input"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="form-group">
                        <label>Margen objetivo (%)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.margenObjetivo}
                          onChange={(event) => setForm({ ...form, margenObjetivo: Math.min(300, toPositiveNumber(event.target.value)) })}
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Margen mínimo (%)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.margenMinimo}
                          onChange={(event) => setForm({ ...form, margenMinimo: Math.min(300, toPositiveNumber(event.target.value)) })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Margen máximo (%)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.margenMaximo}
                          onChange={(event) => setForm({ ...form, margenMaximo: Math.min(300, toPositiveNumber(event.target.value)) })}
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="admin-price-preview">
                      <span>Mínimo: S/ {formPriceRange.precioMinimo.toFixed(2)}</span>
                      <strong>Sugerido: S/ {formPriceRange.precioSugerido.toFixed(2)}</strong>
                      <span>Máximo: S/ {formPriceRange.precioMaximo.toFixed(2)}</span>
                    </div>
                  </div>

                  {editingId ? (
                    <div className="form-group">
                      <div className="admin-stock-heading">
                        <label>Stock por talla</label>
                      </div>
                      {currentSizes.length === 0 ? (
                        <p className="admin-empty">Selecciona la categoría para ver sus tallas.</p>
                      ) : (
                        <div className="admin-size-stock-grid">
                          {currentSizes.map((size) => (
                            <label key={size} className="admin-size-stock-item">
                              <span>{size}</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={form.tallaStock[size] ?? 0}
                                onChange={(event) => updateTallaStock(size, toPositiveInteger(event.target.value))}
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>Colores del producto</label>
                      <div className="variant-chips-row">
                        {variantSlots.map((slot, index) => {
                          const isAvailable = index === 0 || Boolean(variantSlots[index - 1].color);
                          const colorHex = slot.color ? getColorHex(slot.color) : null;
                          return (
                            <div
                              key={index}
                              className="variant-chip-wrap"
                              ref={activeColorSlot === index ? activeColorSlotRef : null}
                            >
                              <button
                                type="button"
                                disabled={!isAvailable}
                                className={`variant-chip${slot.color ? " variant-chip--active" : ""}${!isAvailable ? " variant-chip--locked" : ""}`}
                                onClick={(e) => {
                                  if (!isAvailable) return;
                                  if (activeColorSlot === index) { setActiveColorSlot(null); return; }
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setPopoverAbove(window.innerHeight - rect.bottom < 300);
                                  setActiveColorSlot(index);
                                }}
                              >
                                {colorHex ? (
                                  <span className="variant-chip-swatch" style={{ background: colorHex }} />
                                ) : (
                                  <span className="variant-chip-empty-swatch" />
                                )}
                                <span className="variant-chip-label">Color {index + 1}</span>
                                {slot.color && <span className="variant-chip-name">{slot.color}</span>}
                              </button>
                              {activeColorSlot === index && isAvailable && (
                                <div className={`variant-chip-popover${popoverAbove ? " variant-chip-popover--above" : ""}`}>
                                  <div className="admin-color-popover-grid">
                                    <button
                                      type="button"
                                      className={`admin-color-popover-item${!slot.color ? " active" : ""}`}
                                      onClick={() => setSlotColor(index, "")}
                                    >
                                      <span className="admin-color-popover-swatch admin-color-popover-swatch-empty" aria-hidden="true" />
                                      <span>Sin color</span>
                                    </button>
                                    {COLOR_PALETTE.map((preset) => {
                                      const isActive = slot.color.toLowerCase() === preset.name.toLowerCase();
                                      const isUsedByAnotherSlot = variantSlots.some(
                                        (s, i) => i !== index && s.color.toLowerCase() === preset.name.toLowerCase()
                                      );
                                      return (
                                        <button
                                          key={preset.name}
                                          type="button"
                                          disabled={isUsedByAnotherSlot}
                                          className={`admin-color-popover-item${isActive ? " active" : ""}${isUsedByAnotherSlot ? " disabled" : ""}`}
                                          onClick={() => setSlotColor(index, preset.name)}
                                        >
                                          <span className="admin-color-popover-swatch" style={{ background: preset.hex }} aria-hidden="true" />
                                          <span>{preset.name}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {!form.categoria && (
                        <small className="admin-help-text">Selecciona la categoría para habilitar las tallas.</small>
                      )}
                    </div>
                  )}

                  {!editingId && variantSlots.some((s) => s.color) && (
                    <div className="variant-tallas-section">
                      <label>Tallas y stock por color</label>
                      {!form.categoria ? (
                        <p className="admin-empty">Selecciona la categoría para ver las tallas.</p>
                      ) : (
                        <div className="variant-tallas-list">
                          {variantSlots.map((slot, slotIndex) => {
                            if (!slot.color) return null;
                            return (
                              <div key={slotIndex} className="variant-tallas-block">
                                <div className="variant-tallas-block-head">
                                  <span className="admin-variant-color-dot" style={{ background: getColorHex(slot.color) }} />
                                  <span className="variant-tallas-color-name">{slot.color}</span>
                                  <span className="variant-tallas-stock-badge">Stock: {sumSizeStock(slot.tallaStock)}</span>
                                </div>
                                <div className="admin-size-stock-grid">
                                  {currentSizes.map((size) => (
                                    <label key={`t-${slotIndex}-${size}`} className="admin-size-stock-item">
                                      <span>{size}</span>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={slot.tallaStock[size] ?? 0}
                                        onChange={(event) => updateVariantSlotStock(slotIndex, size, toPositiveInteger(event.target.value))}
                                      />
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label>Campaña</label>
                      <select
                        value={form.campana ?? ""}
                        onChange={(event) => setForm({ ...form, campana: event.target.value || undefined })}
                        className="form-input"
                      >
                        <option value="">Sin campaña</option>
                        <option value="lanzamiento">Lanzamiento</option>
                        <option value="nueva-temporada">Nueva Temporada</option>
                        <option value="cyber-wow">Cyber Wow</option>
                        <option value="club-calzado">Club Calzado</option>
                        <option value="outlet">Outlet</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Descuento Cyber Wow</label>
                      <select
                        value={form.descuento ?? ""}
                        onChange={(event) => {
                          const val = event.target.value;
                          setForm({ ...form, descuento: val ? (Number(val) as 10 | 20 | 30) : undefined });
                        }}
                        className="form-input"
                      >
                        <option value="">Sin descuento</option>
                        <option value="10">10%</option>
                        <option value="20">20%</option>
                        <option value="30">30%</option>
                      </select>
                    </div>
                    <label className="checkbox-label" style={{ alignSelf: "flex-end", paddingBottom: "0.5rem" }}>
                      <input
                        type="checkbox"
                        checked={form.destacado ?? false}
                        onChange={(event) => setForm({ ...form, destacado: event.target.checked })}
                      />
                      Producto destacado
                    </label>
                    {(editingId || !isMultiColorCreate) && (
                      <label className="checkbox-label" style={{ alignSelf: "flex-end", paddingBottom: "0.5rem" }}>
                        <input
                          type="checkbox"
                          checked={form.activo ?? true}
                          onChange={(event) => setForm({ ...form, activo: event.target.checked })}
                        />
                        Visible en tienda
                      </label>
                    )}
                  </div>

                  {isMultiColorCreate && (
                    <p className="admin-help-text" style={{ marginTop: "-0.25rem", marginBottom: "0.35rem" }}>
                      La visibilidad en tienda es por color: en la columna <strong>Variantes</strong>, abre <strong>Texto y visibilidad</strong> en cada tarjeta.
                    </p>
                  )}

                  <div className="form-group">
                    <label>{isMultiColorCreate ? "Descripción común (respaldo)" : "Descripción"}</label>
                    <textarea
                      value={form.descripcion}
                      onChange={(event) => setForm({ ...form, descripcion: event.target.value })}
                      rows={isMultiColorCreate ? 2 : 3}
                      className="form-input"
                      placeholder={
                        isMultiColorCreate
                          ? "Se aplica a los colores que no tengan texto propio…"
                          : "Material, acabado, ocasión de uso..."
                      }
                    />
                    {isMultiColorCreate && (
                      <small className="admin-help-text">
                        Cada color puede tener su propia descripción en <strong>Variantes → Texto y visibilidad</strong>.
                      </small>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-outline">Cancelar</button>
                <button type="submit" disabled={saving || compressing} className="btn-primary">
                  {saving ? "Guardando..." : compressing ? "Subiendo imagen..." : editingId ? "Actualizar" : "Crear producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewImage && (
        <ImagePreviewModal
          src={previewImage.src}
          title={previewImage.title}
          subtitle={previewImage.subtitle}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
