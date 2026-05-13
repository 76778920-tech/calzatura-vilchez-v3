import { ChevronDown } from "lucide-react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { useId } from "react";
import { capitalizeWords } from "@/utils/colors";
import { COLOR_PALETTE, type ProductForm } from "../adminProductsInternals";

type Props = {
  form: ProductForm;
  setForm: Dispatch<SetStateAction<ProductForm>>;
  colorPaletteOpen: boolean;
  setColorPaletteOpen: Dispatch<SetStateAction<boolean>>;
  colorPaletteRef: RefObject<HTMLDivElement | null>;
};

export function AdminProductFormColorEdit({
  form,
  setForm,
  colorPaletteOpen,
  setColorPaletteOpen,
  colorPaletteRef,
}: Props) {
  const id = useId();
  return (
    <div className="form-row form-row-single">
      <fieldset className="form-group" style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}>
        <legend style={{ padding: 0, marginBottom: "0.35rem", fontSize: "inherit", fontWeight: 600 }}>Color *</legend>
        <div className="admin-material-select" ref={colorPaletteRef}>
          <button
            type="button"
            className={`admin-material-trigger ${colorPaletteOpen ? "active" : ""}`}
            onClick={() => setColorPaletteOpen((current) => !current)}
            aria-label="Abrir paleta de colores"
          >
            <span className="admin-material-trigger-copy">
              <span className="admin-material-trigger-label">Color</span>
              <span className="admin-material-trigger-value">{form.color ?? ""}</span>
            </span>
            <ChevronDown size={14} />
          </button>
          {colorPaletteOpen && (
            <dialog open className="admin-color-popover" aria-label="Paleta de colores">
              <div className="admin-color-popover-grid">
                <button
                  type="button"
                  className={`admin-color-popover-item ${!form.color ? "active" : ""}`}
                  onClick={() => { setForm({ ...form, color: "" }); setColorPaletteOpen(false); }}
                >
                  <span className="admin-color-popover-swatch admin-color-popover-swatch-empty" aria-hidden="true" />
                  <span>Sin color</span>
                </button>
                {COLOR_PALETTE.map((preset) => {
                  const isActive = capitalizeWords(form.color ?? "").toLowerCase() === preset.name.toLowerCase();
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      className={`admin-color-popover-item ${isActive ? "active" : ""}`}
                      onClick={() => { setForm({ ...form, color: preset.name }); setColorPaletteOpen(false); }}
                    >
                      <span
                        className="admin-color-popover-swatch"
                        style={{ background: preset.hex }}
                        aria-hidden="true"
                      />
                      <span>{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </dialog>
          )}
        </div>
        <label htmlFor={`${id}-color-text`} className="sr-only">Escribir color</label>
        <input
          id={`${id}-color-text`}
          value={form.color ?? ""}
          onChange={(event) => setForm({ ...form, color: capitalizeWords(event.target.value) })}
          className="form-input"
          list={`${id}-color-suggestions`}
          placeholder="Escribe un color (ej. Negro, Blanco, Azul Marino)"
          style={{ marginTop: "0.55rem" }}
        />
        <datalist id={`${id}-color-suggestions`}>
          {COLOR_PALETTE.map((preset) => (
            <option key={preset.name} value={preset.name} />
          ))}
        </datalist>
        <small className="admin-help-text">
          Si no se abre la paleta o no encuentras el color, escríbelo aquí.
        </small>
      </fieldset>
    </div>
  );
}
