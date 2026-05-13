import { MATERIAL_PRESETS } from "@/domains/productos/utils/commercialRules";
import { normalizeVariantCode } from "@/domains/productos/utils/variantCreation";
import type { Dispatch, SetStateAction } from "react";
import { useId } from "react";
import type { ProductForm } from "../adminProductsInternals";

type Props = Readonly<{
  form: ProductForm;
  setForm: Dispatch<SetStateAction<ProductForm>>;
}>;

export function AdminProductFormBasics({ form, setForm }: Props) {
  const id = useId();
  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor={`${id}-codigo`}>Código interno *</label>
          <input
            id={`${id}-codigo`}
            value={form.codigo ?? ""}
            onChange={(event) => setForm({ ...form, codigo: normalizeVariantCode(event.target.value) })}
            required
            className="form-input"
            placeholder="CV-FOR-001"
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${id}-nombre`}>Nombre *</label>
          <input
            id={`${id}-nombre`}
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
          <label htmlFor={`${id}-marca`}>Marca *</label>
          <input
            id={`${id}-marca`}
            value={form.marca ?? ""}
            onChange={(event) => setForm({ ...form, marca: event.target.value })}
            required
            className="form-input"
            placeholder="Calzatura Vilchez"
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${id}-material`}>Material</label>
          <select
            id={`${id}-material`}
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
    </>
  );
}
