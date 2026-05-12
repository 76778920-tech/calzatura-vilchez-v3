import { ChevronDown } from "lucide-react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { CATEGORIAS, STYLE_OPTIONS } from "@/domains/productos/utils/commercialRules";
import { categoryLabel } from "@/utils/labels";
import { toPositiveNumber, type ProductForm } from "../adminProductsInternals";

type Props = {
  form: ProductForm;
  setForm: Dispatch<SetStateAction<ProductForm>>;
  updateCategory: (categoria: string) => void;
  currentFootwearTypes: string[];
  estiloSelectOpen: boolean;
  setEstiloSelectOpen: Dispatch<SetStateAction<boolean>>;
  estiloSelectRef: RefObject<HTMLDivElement | null>;
  estiloSummaryLabel: string;
  estiloChipTokens: string[];
  toggleEstiloOption: (opt: (typeof STYLE_OPTIONS)[number]) => void;
};

export function AdminProductFormCategoryStylePrice({
  form,
  setForm,
  updateCategory,
  currentFootwearTypes,
  estiloSelectOpen,
  setEstiloSelectOpen,
  estiloSelectRef,
  estiloSummaryLabel,
  estiloChipTokens,
  toggleEstiloOption,
}: Props) {
  return (
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
  );
}
