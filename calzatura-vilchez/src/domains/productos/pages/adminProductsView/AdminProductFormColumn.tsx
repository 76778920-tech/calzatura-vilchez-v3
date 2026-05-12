import type { AdminProductsViewModel } from "../useAdminProductsPage";
import { AdminProductFormBasics } from "./AdminProductFormBasics";
import { AdminProductFormCampaignAndDescription } from "./AdminProductFormCampaignAndDescription";
import { AdminProductFormCategoryStylePrice } from "./AdminProductFormCategoryStylePrice";
import { AdminProductFormColorChipsRow } from "./AdminProductFormColorChipsRow";
import { AdminProductFormColorEdit } from "./AdminProductFormColorEdit";
import { AdminProductFormEditStockGrid } from "./AdminProductFormEditStockGrid";
import { AdminProductFormFinanceBox } from "./AdminProductFormFinanceBox";
import { AdminProductFormVariantTallasSection } from "./AdminProductFormVariantTallasSection";

type Props = Pick<
  AdminProductsViewModel,
  | "activeColorSlot"
  | "activeColorSlotRef"
  | "colorPaletteOpen"
  | "colorPaletteRef"
  | "currentFootwearTypes"
  | "currentSizes"
  | "editingId"
  | "estiloChipTokens"
  | "estiloSelectOpen"
  | "estiloSelectRef"
  | "estiloSummaryLabel"
  | "form"
  | "formPriceRange"
  | "isMultiColorCreate"
  | "popoverAbove"
  | "setActiveColorSlot"
  | "setColorPaletteOpen"
  | "setEstiloSelectOpen"
  | "setForm"
  | "setPopoverAbove"
  | "setSlotColor"
  | "toggleEstiloOption"
  | "updateCategory"
  | "updateTallaStock"
  | "updateVariantSlotStock"
  | "variantSlots"
>;

export function AdminProductFormColumn(p: Props) {
  return (
    <div className="product-form-fields">
      <AdminProductFormBasics form={p.form} setForm={p.setForm} />

      {p.editingId && (
        <AdminProductFormColorEdit
          form={p.form}
          setForm={p.setForm}
          colorPaletteOpen={p.colorPaletteOpen}
          setColorPaletteOpen={p.setColorPaletteOpen}
          colorPaletteRef={p.colorPaletteRef}
        />
      )}

      <AdminProductFormCategoryStylePrice
        form={p.form}
        setForm={p.setForm}
        updateCategory={p.updateCategory}
        currentFootwearTypes={p.currentFootwearTypes}
        estiloSelectOpen={p.estiloSelectOpen}
        setEstiloSelectOpen={p.setEstiloSelectOpen}
        estiloSelectRef={p.estiloSelectRef}
        estiloSummaryLabel={p.estiloSummaryLabel}
        estiloChipTokens={p.estiloChipTokens}
        toggleEstiloOption={p.toggleEstiloOption}
      />

      <AdminProductFormFinanceBox form={p.form} setForm={p.setForm} formPriceRange={p.formPriceRange} />

      {p.editingId ? (
        <AdminProductFormEditStockGrid currentSizes={p.currentSizes} form={p.form} updateTallaStock={p.updateTallaStock} />
      ) : (
        <AdminProductFormColorChipsRow
          variantSlots={p.variantSlots}
          form={p.form}
          activeColorSlot={p.activeColorSlot}
          activeColorSlotRef={p.activeColorSlotRef}
          popoverAbove={p.popoverAbove}
          setPopoverAbove={p.setPopoverAbove}
          setActiveColorSlot={p.setActiveColorSlot}
          setSlotColor={p.setSlotColor}
        />
      )}

      {!p.editingId && (
        <AdminProductFormVariantTallasSection
          variantSlots={p.variantSlots}
          form={p.form}
          currentSizes={p.currentSizes}
          updateVariantSlotStock={p.updateVariantSlotStock}
        />
      )}

      <AdminProductFormCampaignAndDescription
        form={p.form}
        setForm={p.setForm}
        editingId={p.editingId}
        isMultiColorCreate={p.isMultiColorCreate}
      />
    </div>
  );
}
