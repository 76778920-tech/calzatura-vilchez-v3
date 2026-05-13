import type { ChangeEvent, MouseEvent, RefObject } from "react";
import type { VariantSlot } from "../adminProductsInternals";
import { AdminProductVariantCarouselCard } from "./AdminProductVariantCarouselCard";

type Props = {
  variantSlots: VariantSlot[];
  compressing: boolean;
  isDraggingVariants: boolean;
  variantsCarouselRef: RefObject<HTMLDivElement | null>;
  handleVariantsMouseDown: (event: MouseEvent<HTMLDivElement>) => void;
  handleVariantsMouseMove: (event: MouseEvent<HTMLDivElement>) => void;
  stopVariantsDrag: () => void;
  handleVariantFileChange: (event: ChangeEvent<HTMLInputElement>, slotIndex: number, imageIndex: number) => void;
  updateVariantSlotImageUrl: (slotIndex: number, imageIndex: number, value: string) => void;
  validateVariantSlotImageUrl: (slotIndex: number, imageIndex: number, value: string) => void;
  updateVariantSlot: (slotIndex: number, updater: (slot: VariantSlot) => VariantSlot) => void;
  setSlotColor: (slotIndex: number, color: string) => void;
};

export function AdminProductCreateVariantsPanel({
  variantSlots,
  compressing,
  isDraggingVariants,
  variantsCarouselRef,
  handleVariantsMouseDown,
  handleVariantsMouseMove,
  stopVariantsDrag,
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
    <section>
      <div
        ref={variantsCarouselRef}
        role="application"
        tabIndex={0}
        aria-label="Carrusel de variantes. Arrastra para desplazar. Escape suelta el arrastre."
        className={`admin-variants-carousel${isDraggingVariants ? " dragging" : ""}`}
        onMouseDown={handleVariantsMouseDown}
        onMouseMove={handleVariantsMouseMove}
        onMouseUp={stopVariantsDrag}
        onMouseLeave={stopVariantsDrag}
      >
        {variantSlots.map((slot, slotIndex) => {
          if (!slot.color) return null;
          return (
            <AdminProductVariantCarouselCard
              key={slot.color}
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
