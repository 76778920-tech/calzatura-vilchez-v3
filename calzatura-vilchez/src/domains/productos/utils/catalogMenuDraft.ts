import {
  filterParsedColorsForCatalogDraft,
  filterParsedMaterialsForCatalogDraft,
  filterParsedSizesForCatalogDraft,
  parseColorSelection,
  parseDiscountSelection,
  parseMaterialSelection,
  parsePriceRange,
  parseSizeSelection,
} from "@/domains/productos/utils/productsPageCatalogDerivations";

type PriceBounds = { min: number; max: number };

type ColorOption = { label: string; value: string; swatch: string };

type MaterialOption = { label: string; value: string };

type MenuDraftSetters = {
  setPricePopoverStyle: (value: null) => void;
  setDraftPriceMin: (value: number) => void;
  setDraftPriceMax: (value: number) => void;
  setSizePopoverStyle: (value: null) => void;
  setDraftSelectedSizes: (value: string[]) => void;
  setColorPopoverStyle: (value: null) => void;
  setDraftSelectedColors: (value: string[]) => void;
  setMaterialPopoverStyle: (value: null) => void;
  setDraftSelectedMaterials: (value: string[]) => void;
  setDiscountPopoverStyle: (value: null) => void;
  setDraftSelectedDiscounts: (value: string[]) => void;
};

export function primeCatalogMenuDraft(
  menuKey: string,
  input: {
    precio: string;
    talla: string;
    color: string;
    material: string;
    descuento: string;
    priceBounds: PriceBounds;
    availableSizes: string[];
    availableColors: ColorOption[];
    availableMaterials: MaterialOption[];
  },
  setters: MenuDraftSetters,
) {
  if (menuKey === "precio") {
    setters.setPricePopoverStyle(null);
    const nextRange = parsePriceRange(input.precio, input.priceBounds.min, input.priceBounds.max);
    setters.setDraftPriceMin(nextRange.min);
    setters.setDraftPriceMax(nextRange.max);
    return;
  }
  if (menuKey === "talla") {
    setters.setSizePopoverStyle(null);
    setters.setDraftSelectedSizes(
      filterParsedSizesForCatalogDraft(parseSizeSelection(input.talla), input.availableSizes),
    );
    return;
  }
  if (menuKey === "color") {
    setters.setColorPopoverStyle(null);
    setters.setDraftSelectedColors(
      filterParsedColorsForCatalogDraft(parseColorSelection(input.color), input.availableColors),
    );
    return;
  }
  if (menuKey === "material") {
    setters.setMaterialPopoverStyle(null);
    setters.setDraftSelectedMaterials(
      filterParsedMaterialsForCatalogDraft(parseMaterialSelection(input.material), input.availableMaterials),
    );
    return;
  }
  if (menuKey === "descuento") {
    setters.setDiscountPopoverStyle(null);
    setters.setDraftSelectedDiscounts(parseDiscountSelection(input.descuento));
  }
}
