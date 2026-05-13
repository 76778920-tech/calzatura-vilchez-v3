import { ChevronDown } from "lucide-react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { useId } from "react";
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
  const id = useId();
  const estiloLabelId = `${id}-estilo-lbl`;
  const estiloTriggerId = `${id}-estilo-trigger`;
  return (
    <div className="form-row product-core-row">
      <div className="form-group">
        <label htmlFor={`${id}-categoria`}>Categoría</label>
        <select id={`${id}-categoria`} value={form.categoria} onChange={(event) => updateCategory(event.target.value)} className="form-input" required>
          <option value="">Selecciona la categoría</option>
          {CATEGORIAS.map((category) => (
            <option key={category} value={category}>{categoryLabel(category)}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor={`${id}-tipo`}>Tipo de calzado *</label>
        <select
          id={`${id}-tipo`}
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
        <label id={estiloLabelId} htmlFor={estiloTriggerId}>Estilo</label>
        <div className="admin-estilo-dropdown" ref={estiloSelectRef}>
          <button
            id={estiloTriggerId}
            type="button"
            className={`admin-estilo-dropdown-trigger${estiloSelectOpen ? " active" : ""}`}
            aria-haspopup="true"
            aria-expanded={estiloSelectOpen}
            onClick={() => setEstiloSelectOpen((o) => !o)}
          >
            <span className="admin-estilo-dropdown-value">{estiloSummaryLabel}</span>
            <ChevronDown size={18} aria-hidden />
          </button>
          {estiloSelectOpen && (
            <fieldset
              className="admin-estilo-dropdown-panel"
              aria-labelledby={estiloLabelId}
            >
              {STYLE_OPTIONS.map((opt) => (
                <label key={opt} className="admin-estilo-check-row">
                  <input
                    type="checkbox"
                    checked={estiloChipTokens.includes(opt)}
                    onChange={() => toggleEstiloOption(opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </fieldset>
          )}
        </div>
      </div>
      <div className="form-group">
        <label htmlFor={`${id}-precio`}>Precio (S/) *</label>
        <input
          id={`${id}-precio`}
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
