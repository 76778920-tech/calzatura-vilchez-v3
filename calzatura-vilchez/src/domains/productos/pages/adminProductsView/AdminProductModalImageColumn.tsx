import type { ChangeEvent, MouseEvent, MutableRefObject, RefObject } from "react";
import type { ProductForm, VariantSlot } from "../adminProductsInternals";
import { AdminProductCreateVariantsPanel } from "./AdminProductCreateVariantsPanel";
import { AdminProductEditGallery } from "./AdminProductEditGallery";

type Props = {
  editingId: string | null;
  currentStock: number;
  variantTotalStock: number;
  currentImages: string[];
  form: ProductForm;
  variantSlots: VariantSlot[];
  compressing: boolean;
  isDraggingVariants: boolean;
  fileInputRefs: MutableRefObject<Array<HTMLInputElement | null>>;
  variantsCarouselRef: RefObject<HTMLDivElement | null>;
  setPreviewImage: (v: { src: string; title: string; subtitle?: string }) => void;
  setFileInputRef: (index: number) => (element: HTMLInputElement | null) => void;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>, index: number) => void;
  updateImageUrl: (index: number, value: string) => void;
  validateImageUrl: (index: number, value: string) => void;
  clearImage: (index: number) => void;
  handleVariantsMouseDown: (event: MouseEvent<HTMLDivElement>) => void;
  handleVariantsMouseMove: (event: MouseEvent<HTMLDivElement>) => void;
  stopVariantsDrag: () => void;
  handleVariantFileChange: (event: ChangeEvent<HTMLInputElement>, slotIndex: number, imageIndex: number) => void;
  updateVariantSlotImageUrl: (slotIndex: number, imageIndex: number, value: string) => void;
  validateVariantSlotImageUrl: (slotIndex: number, imageIndex: number, value: string) => void;
  updateVariantSlot: (slotIndex: number, updater: (slot: VariantSlot) => VariantSlot) => void;
  setSlotColor: (slotIndex: number, color: string) => void;
};

export function AdminProductModalImageColumn(p: Props) {
  const isEdit = Boolean(p.editingId);

  return (
    <aside className={`admin-form-card admin-image-card${!isEdit ? " admin-variants-card" : ""}`}>
      <div className="admin-form-card-header">
        <strong>{isEdit ? "Galería" : "Variantes"}</strong>
        <span className="admin-stock-pill">Stock: <strong>{isEdit ? p.currentStock : p.variantTotalStock}</strong></span>
      </div>
      {isEdit ? (
        <AdminProductEditGallery
          currentImages={p.currentImages}
          form={p.form}
          compressing={p.compressing}
          setPreviewImage={p.setPreviewImage}
          fileInputRefs={p.fileInputRefs}
          setFileInputRef={p.setFileInputRef}
          handleFileChange={p.handleFileChange}
          updateImageUrl={p.updateImageUrl}
          validateImageUrl={p.validateImageUrl}
          clearImage={p.clearImage}
        />
      ) : (
        <AdminProductCreateVariantsPanel
          variantSlots={p.variantSlots}
          compressing={p.compressing}
          isDraggingVariants={p.isDraggingVariants}
          variantsCarouselRef={p.variantsCarouselRef}
          handleVariantsMouseDown={p.handleVariantsMouseDown}
          handleVariantsMouseMove={p.handleVariantsMouseMove}
          stopVariantsDrag={p.stopVariantsDrag}
          handleVariantFileChange={p.handleVariantFileChange}
          updateVariantSlotImageUrl={p.updateVariantSlotImageUrl}
          validateVariantSlotImageUrl={p.validateVariantSlotImageUrl}
          updateVariantSlot={p.updateVariantSlot}
          setSlotColor={p.setSlotColor}
        />
      )}
    </aside>
  );
}
