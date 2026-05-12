import type { Dispatch, SetStateAction } from "react";
import type { ProductForm } from "../adminProductsInternals";
import { toPositiveNumber } from "../adminProductsInternals";

type Range = {
  precioMinimo: number;
  precioSugerido: number;
  precioMaximo: number;
};

type Props = {
  form: ProductForm;
  setForm: Dispatch<SetStateAction<ProductForm>>;
  formPriceRange: Range;
};

export function AdminProductFormFinanceBox({ form, setForm, formPriceRange }: Props) {
  return (
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
  );
}
