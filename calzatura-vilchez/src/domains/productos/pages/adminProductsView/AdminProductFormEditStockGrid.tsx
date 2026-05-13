import { toPositiveInteger, type ProductForm } from "../adminProductsInternals";

type Props = {
  currentSizes: string[];
  form: ProductForm;
  updateTallaStock: (talla: string, quantity: number) => void;
};

export function AdminProductFormEditStockGrid({ currentSizes, form, updateTallaStock }: Props) {
  return (
    <fieldset className="form-group" style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}>
      <legend className="admin-stock-heading" style={{ padding: 0, width: "100%", marginBottom: "0.35rem", fontSize: "inherit", fontWeight: 600 }}>
        Stock por talla
      </legend>
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
    </fieldset>
  );
}
