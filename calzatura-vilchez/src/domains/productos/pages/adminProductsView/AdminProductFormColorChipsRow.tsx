import type { Dispatch, RefObject, SetStateAction } from "react";
import { COLOR_PALETTE, getColorHex, type ProductForm, type VariantSlot } from "../adminProductsInternals";

const VARIANT_COLOR_ROW_KEYS = ["vc-slot-0", "vc-slot-1", "vc-slot-2", "vc-slot-3", "vc-slot-4"] as const;

type Props = {
  variantSlots: VariantSlot[];
  form: ProductForm;
  activeColorSlot: number | null;
  activeColorSlotRef: RefObject<HTMLDivElement | null>;
  popoverAbove: boolean;
  setPopoverAbove: Dispatch<SetStateAction<boolean>>;
  setActiveColorSlot: Dispatch<SetStateAction<number | null>>;
  setSlotColor: (slotIndex: number, color: string) => void;
};

export function AdminProductFormColorChipsRow({
  variantSlots,
  form,
  activeColorSlot,
  activeColorSlotRef,
  popoverAbove,
  setPopoverAbove,
  setActiveColorSlot,
  setSlotColor,
}: Props) {
  return (
    <fieldset className="form-group" style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}>
      <legend style={{ float: "left", width: "100%", padding: 0, marginBottom: "0.35rem", fontSize: "inherit", fontWeight: 600 }}>
        Colores del producto
      </legend>
      <div className="variant-chips-row" style={{ clear: "both" }}>
        {variantSlots.map((slot, index) => {
          const isAvailable = index === 0 || Boolean(variantSlots[index - 1].color);
          const colorHex = slot.color ? getColorHex(slot.color) : null;
          return (
            <div
              key={VARIANT_COLOR_ROW_KEYS[index] ?? `vc-slot-${index}`}
              className="variant-chip-wrap"
              ref={activeColorSlot === index ? activeColorSlotRef : null}
            >
              <button
                type="button"
                disabled={!isAvailable}
                className={`variant-chip${slot.color ? " variant-chip--active" : ""}${!isAvailable ? " variant-chip--locked" : ""}`}
                onClick={(e) => {
                  if (!isAvailable) return;
                  if (activeColorSlot === index) { setActiveColorSlot(null); return; }
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setPopoverAbove(window.innerHeight - rect.bottom < 300);
                  setActiveColorSlot(index);
                }}
              >
                {colorHex ? (
                  <span className="variant-chip-swatch" style={{ background: colorHex }} />
                ) : (
                  <span className="variant-chip-empty-swatch" />
                )}
                <span className="variant-chip-label">Color {index + 1}</span>
                {slot.color && <span className="variant-chip-name">{slot.color}</span>}
              </button>
              {activeColorSlot === index && isAvailable && (
                <div className={`variant-chip-popover${popoverAbove ? " variant-chip-popover--above" : ""}`}>
                  <div className="admin-color-popover-grid">
                    <button
                      type="button"
                      className={`admin-color-popover-item${!slot.color ? " active" : ""}`}
                      onClick={() => setSlotColor(index, "")}
                    >
                      <span className="admin-color-popover-swatch admin-color-popover-swatch-empty" aria-hidden="true" />
                      <span>Sin color</span>
                    </button>
                    {COLOR_PALETTE.map((preset) => {
                      const isActive = slot.color.toLowerCase() === preset.name.toLowerCase();
                      const isUsedByAnotherSlot = variantSlots.some(
                        (s, i) => i !== index && s.color.toLowerCase() === preset.name.toLowerCase()
                      );
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          disabled={isUsedByAnotherSlot}
                          className={`admin-color-popover-item${isActive ? " active" : ""}${isUsedByAnotherSlot ? " disabled" : ""}`}
                          onClick={() => setSlotColor(index, preset.name)}
                        >
                          <span className="admin-color-popover-swatch" style={{ background: preset.hex }} aria-hidden="true" />
                          <span>{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!form.categoria && (
        <small className="admin-help-text">Selecciona la categoría para habilitar las tallas.</small>
      )}
    </fieldset>
  );
}
