import type { ChangeEvent, RefObject } from "react";
import type { VariantSlot } from "../adminProductsInternals";
import { AdminProductVariantCarouselCard } from "./AdminProductVariantCarouselCard";

type Props = Readonly<{
  variantSlots: VariantSlot[];
  compressing: boolean;
  isDraggingVariants: boolean;
  variantsCarouselRef: RefObject<HTMLDivElement | null>;
  handleVariantFileChange: (event: ChangeEvent<HTMLInputElement>, slotIndex: number, imageIndex: number) => void;
  updateVariantSlotImageUrl: (slotIndex: number, imageIndex: number, value: string) => void;
  validateVariantSlotImageUrl: (slotIndex: number, imageIndex: number, value: string) => void;
  updateVariantSlot: (slotIndex: number, updater: (slot: VariantSlot) => VariantSlot) => void;
  setSlotColor: (slotIndex: number, color: string) => void;
}>;

export function AdminProductCreateVariantsPanel({
  variantSlots,
  compressing,
  isDraggingVariants,
  variantsCarouselRef,
  handleVariantFileChange,
  updateVariantSlotImageUrl,
  validateVariantSlotImageUrl,
  updateVariantSlot,
  setSlotColor,
}: Props) {
  const noColors = variantSlots.every((s) => !s.color);
  if (noColors) {
    return (
      <div className="admin-variants-empty">
        <p>Selecciona un color para ver aquí las imágenes de cada variante.</p>
      </div>
    );
  }

  return (
    <section className="admin-variants-panel">
      <div
        ref={variantsCarouselRef}
        role="region"
        aria-label="Carrusel de variantes. Arrastra para desplazar."
        className={`admin-variants-carousel${isDraggingVariants ? " dragging" : ""}`}
      >
        {variantSlots.map((slot, slotIndex) => {
          if (!slot.color) return null;
          const slotKey = slot.color || `slot-${slotIndex}`;
          return (
            <AdminProductVariantCarouselCard
              key={slotKey}
              slot={slot}
              slotIndex={slotIndex}
              compressing={compressing}
              handleVariantFileChange={handleVariantFileChange}
              updateVariantSlotImageUrl={updateVariantSlotImageUrl}
              validateVariantSlotImageUrl={validateVariantSlotImageUrl}
              updateVariantSlot={updateVariantSlot}
              setSlotColor={setSlotColor}
            />
          );
        })}
      </div>
    </section>
  );
}
