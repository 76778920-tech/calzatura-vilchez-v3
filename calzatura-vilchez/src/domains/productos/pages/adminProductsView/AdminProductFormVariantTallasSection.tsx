import { sumSizeStock } from "@/utils/stock";
import { getColorHex, toPositiveInteger, type ProductForm, type VariantSlot } from "../adminProductsInternals";

type Props = {
  variantSlots: VariantSlot[];
  form: ProductForm;
  currentSizes: string[];
  updateVariantSlotStock: (slotIndex: number, talla: string, quantity: number) => void;
};

export function AdminProductFormVariantTallasSection({
  variantSlots,
  form,
  currentSizes,
  updateVariantSlotStock,
}: Props) {
  const hasColor = variantSlots.some((s) => s.color);
  if (!hasColor) return null;

  return (
    <div className="variant-tallas-section">
      <label>Tallas y stock por color</label>
      {!form.categoria ? (
        <p className="admin-empty">Selecciona la categoría para ver las tallas.</p>
      ) : (
        <div className="variant-tallas-list">
          {variantSlots.map((slot, slotIndex) => {
            if (!slot.color) return null;
            return (
              <div key={slotIndex} className="variant-tallas-block">
                <div className="variant-tallas-block-head">
                  <span className="admin-variant-color-dot" style={{ background: getColorHex(slot.color) }} />
                  <span className="variant-tallas-color-name">{slot.color}</span>
                  <span className="variant-tallas-stock-badge">Stock: {sumSizeStock(slot.tallaStock)}</span>
                </div>
                <div className="admin-size-stock-grid">
                  {currentSizes.map((size) => (
                    <label key={`t-${slotIndex}-${size}`} className="admin-size-stock-item">
                      <span>{size}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={slot.tallaStock[size] ?? 0}
                        onChange={(event) => updateVariantSlotStock(slotIndex, size, toPositiveInteger(event.target.value))}
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
