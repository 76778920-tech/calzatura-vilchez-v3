import { X } from "lucide-react";
import type { AdminProductsViewModel } from "../useAdminProductsPage";
import { AdminProductFormColumn } from "./AdminProductFormColumn";
import { AdminProductModalImageColumn } from "./AdminProductModalImageColumn";

type ModalState = Omit<
  AdminProductsViewModel,
  | "modalRef"
  | "fileInputRefs"
  | "variantsCarouselRef"
  | "colorPaletteRef"
  | "estiloSelectRef"
  | "activeColorSlotRef"
>;

function submitButtonLabel(m: Pick<AdminProductsViewModel, "saving" | "compressing" | "editingId">): string {
  if (m.saving) return "Guardando...";
  if (m.compressing) return "Subiendo imagen...";
  if (m.editingId) return "Actualizar";
  return "Crear producto";
}

export function AdminProductModal(props: AdminProductsViewModel) {
  const {
    modalRef,
    fileInputRefs,
    variantsCarouselRef,
    colorPaletteRef,
    estiloSelectRef,
    activeColorSlotRef,
    ...m
  } = props;

  const s: ModalState = m;

  return (
    <div className="product-modal-host">
      <button type="button" className="product-modal-backdrop" aria-label="Cerrar" onClick={s.closeModal} />
      <dialog
        ref={modalRef}
        open
        aria-modal="true"
        aria-labelledby="product-modal-title"
        className={`modal product-modal${!s.editingId ? " product-modal--create" : ""}`}
        onKeyDown={s.trapFocus}
      >
        <div className="modal-header">
          <h2 id="product-modal-title">{s.editingId ? "Editar producto" : "Nuevo producto"}</h2>
          <button type="button" onClick={s.closeModal} className="modal-close" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={s.handleSave} className="modal-form">
          <div className="product-form-layout">
            <AdminProductModalImageColumn
              editingId={s.editingId}
              currentStock={s.currentStock}
              variantTotalStock={s.variantTotalStock}
              currentImages={s.currentImages}
              form={s.form}
              variantSlots={s.variantSlots}
              compressing={s.compressing}
              isDraggingVariants={s.isDraggingVariants}
              fileInputRefs={fileInputRefs}
              variantsCarouselRef={variantsCarouselRef}
              setPreviewImage={s.setPreviewImage}
              setFileInputRef={s.setFileInputRef}
              handleFileChange={s.handleFileChange}
              updateImageUrl={s.updateImageUrl}
              validateImageUrl={s.validateImageUrl}
              clearImage={s.clearImage}
              handleVariantsMouseDown={s.handleVariantsMouseDown}
              handleVariantsMouseMove={s.handleVariantsMouseMove}
              stopVariantsDrag={s.stopVariantsDrag}
              handleVariantFileChange={s.handleVariantFileChange}
              updateVariantSlotImageUrl={s.updateVariantSlotImageUrl}
              validateVariantSlotImageUrl={s.validateVariantSlotImageUrl}
              updateVariantSlot={s.updateVariantSlot}
              setSlotColor={s.setSlotColor}
            />
            <AdminProductFormColumn
              activeColorSlot={s.activeColorSlot}
              activeColorSlotRef={activeColorSlotRef}
              colorPaletteOpen={s.colorPaletteOpen}
              colorPaletteRef={colorPaletteRef}
              currentFootwearTypes={s.currentFootwearTypes}
              currentSizes={s.currentSizes}
              editingId={s.editingId}
              estiloChipTokens={s.estiloChipTokens}
              estiloSelectOpen={s.estiloSelectOpen}
              estiloSelectRef={estiloSelectRef}
              estiloSummaryLabel={s.estiloSummaryLabel}
              form={s.form}
              formPriceRange={s.formPriceRange}
              isMultiColorCreate={s.isMultiColorCreate}
              popoverAbove={s.popoverAbove}
              setActiveColorSlot={s.setActiveColorSlot}
              setColorPaletteOpen={s.setColorPaletteOpen}
              setEstiloSelectOpen={s.setEstiloSelectOpen}
              setForm={s.setForm}
              setPopoverAbove={s.setPopoverAbove}
              setSlotColor={s.setSlotColor}
              toggleEstiloOption={s.toggleEstiloOption}
              updateCategory={s.updateCategory}
              updateTallaStock={s.updateTallaStock}
              updateVariantSlotStock={s.updateVariantSlotStock}
              variantSlots={s.variantSlots}
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={s.closeModal} className="btn-outline">Cancelar</button>
            <button type="submit" disabled={s.saving || s.compressing} className="btn-primary">
              {submitButtonLabel(s)}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
