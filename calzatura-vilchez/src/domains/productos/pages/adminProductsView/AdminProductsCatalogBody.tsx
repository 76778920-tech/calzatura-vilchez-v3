import type { AdminProduct } from "../adminProductsInternals";
import { AdminProductsTableRow } from "./AdminProductsTableRow";

type Props = Readonly<{
  loading: boolean;
  filteredProducts: AdminProduct[];
  products: AdminProduct[];
  setPreviewImage: (v: { src: string; title: string; subtitle?: string }) => void;
  openVariant: (product: AdminProduct) => void;
  openEdit: (product: AdminProduct) => void;
  openStockEntry: (product: AdminProduct) => void;
  handleDelete: (product: AdminProduct) => void;
}>;

export function AdminProductsCatalogBody({
  loading,
  filteredProducts,
  products,
  setPreviewImage,
  openVariant,
  openEdit,
  openStockEntry,
  handleDelete,
}: Props) {
  if (loading) {
    return (
      <div className="products-grid">
        {["sk1", "sk2", "sk3", "sk4", "sk5", "sk6"].map((id) => (
          <div key={id} className="skeleton-card" />
        ))}
      </div>
    );
  }

  return (
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
                {products.length === 0 ? "No hay productos. Crea el primero." : "No se encontraron productos con esos filtros."}
              </td>
            </tr>
          )}
          {filteredProducts.map((product) => (
            <AdminProductsTableRow
              key={product.id}
              product={product}
              setPreviewImage={setPreviewImage}
              openVariant={openVariant}
              openEdit={openEdit}
              openStockEntry={openStockEntry}
              handleDelete={handleDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
