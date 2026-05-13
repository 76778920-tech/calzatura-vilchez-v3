import type { Dispatch, SetStateAction } from "react";
import { useId } from "react";
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
  const id = useId();
  return (
    <div className="admin-finance-box">
      <div>
        <span className="admin-page-kicker admin-finance-kicker">Rentabilidad <span>(Rango óptimo de venta)</span></span>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor={`${id}-costo`}>Costo real de compra (S/) *</label>
          <input
            id={`${id}-costo`}
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
          <label htmlFor={`${id}-margen-obj`}>Margen objetivo (%)</label>
          <input
            id={`${id}-margen-obj`}
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
          <label htmlFor={`${id}-margen-min`}>Margen mínimo (%)</label>
          <input
            id={`${id}-margen-min`}
            type="text"
            inputMode="decimal"
            value={form.margenMinimo}
            onChange={(event) => setForm({ ...form, margenMinimo: Math.min(300, toPositiveNumber(event.target.value)) })}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${id}-margen-max`}>Margen máximo (%)</label>
          <input
            id={`${id}-margen-max`}
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
