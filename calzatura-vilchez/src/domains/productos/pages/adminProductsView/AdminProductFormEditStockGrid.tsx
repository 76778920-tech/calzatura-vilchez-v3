import { toPositiveInteger, type ProductForm } from "../adminProductsInternals";

type Props = {
  currentSizes: string[];
  form: ProductForm;
  updateTallaStock: (talla: string, quantity: number) => void;
};

export function AdminProductFormEditStockGrid({ currentSizes, form, updateTallaStock }: Props) {
  return (
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
  );
}
