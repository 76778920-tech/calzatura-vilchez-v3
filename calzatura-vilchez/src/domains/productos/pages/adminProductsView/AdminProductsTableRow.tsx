import { Copy, Pencil, Trash2 } from "lucide-react";
import { categoryLabel } from "@/utils/labels";
import { FALLBACK_PRODUCT_IMAGE, LOW_STOCK_LIMIT, type AdminProduct } from "../adminProductsInternals";

type Props = {
  product: AdminProduct;
  setPreviewImage: (v: { src: string; title: string; subtitle?: string }) => void;
  openVariant: (product: AdminProduct) => void;
  openEdit: (product: AdminProduct) => void;
  handleDelete: (product: AdminProduct) => void;
};

export function AdminProductsTableRow({
  product,
  setPreviewImage,
  openVariant,
  openEdit,
  handleDelete,
}: Props) {
  const thumb = product.imagen || FALLBACK_PRODUCT_IMAGE;
  let stockClass = "stock-badge in";
  if (product.stock === 0) stockClass = "stock-badge out";
  else if (product.stock <= LOW_STOCK_LIMIT) stockClass = "stock-badge low";

  return (
    <tr>
      <td>
        <button
          type="button"
          className="admin-image-thumb-button"
          onClick={() =>
            setPreviewImage({
              src: thumb,
              title: product.nombre,
              subtitle: "Producto",
            })
          }
          aria-label={`Abrir imagen de ${product.nombre}`}
        >
          <img
            src={thumb}
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
        <span className={stockClass}>{product.stock}</span>
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
  );
}
