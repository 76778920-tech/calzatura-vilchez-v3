import type { Dispatch, SetStateAction } from "react";
import type { ProductForm } from "../adminProductsInternals";

type Props = {
  form: ProductForm;
  setForm: Dispatch<SetStateAction<ProductForm>>;
  editingId: string | null;
  isMultiColorCreate: boolean;
};

export function AdminProductFormCampaignAndDescription({
  form,
  setForm,
  editingId,
  isMultiColorCreate,
}: Props) {
  return (
    <>
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
    </>
  );
}
