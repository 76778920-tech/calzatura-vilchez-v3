import { useCallback, useMemo, useRef, useState } from "react";
import { useCatalogMenuDismiss } from "@/domains/productos/hooks/useCatalogMenuDismiss";
import { primeCatalogMenuDraft } from "@/domains/productos/utils/catalogMenuDraft";
import {
  measureColorCatalogPopover,
  measureDiscountCatalogPopover,
  measureMarcaCatalogPopover,
  measureMaterialCatalogPopover,
  measurePriceCatalogPopover,
  measureSizeCatalogPopover,
} from "@/domains/productos/utils/productsPagePopoverLayouts";
import { usePopoverDockEffect } from "@/hooks/usePopoverDockEffect";

type PopoverStyle = { top: number; left: number; width: number } | null;

type MenuDraftContext = {
  precio: string;
  talla: string;
  color: string;
  material: string;
  descuento: string;
  marcaSlug: string;
  priceBounds: { min: number; max: number; low: number; high: number };
  availableSizes: string[];
  availableColors: Array<{ label: string; value: string; swatch: string }>;
  availableMaterials: Array<{ value: string; label: string }>;
};

export function useCatalogFacetPopovers(menuDraftContext: MenuDraftContext) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const filterRailRef = useRef<HTMLDivElement | null>(null);

  const [draftPriceMin, setDraftPriceMin] = useState(0);
  const [draftPriceMax, setDraftPriceMax] = useState(0);
  const [pricePopoverStyle, setPricePopoverStyle] = useState<PopoverStyle>(null);
  const priceTriggerRef = useRef<HTMLButtonElement | null>(null);
  const pricePopoverRef = useRef<HTMLDialogElement | null>(null);
  const pricePopoverFrameRef = useRef<number | null>(null);

  const [draftSelectedSizes, setDraftSelectedSizes] = useState<string[]>([]);
  const [sizePopoverStyle, setSizePopoverStyle] = useState<PopoverStyle>(null);
  const sizeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const sizePopoverRef = useRef<HTMLDialogElement | null>(null);
  const sizePopoverFrameRef = useRef<number | null>(null);

  const [draftSelectedColors, setDraftSelectedColors] = useState<string[]>([]);
  const [colorPopoverStyle, setColorPopoverStyle] = useState<PopoverStyle>(null);
  const colorTriggerRef = useRef<HTMLButtonElement | null>(null);
  const colorPopoverRef = useRef<HTMLDialogElement | null>(null);
  const colorPopoverFrameRef = useRef<number | null>(null);

  const [draftSelectedMaterials, setDraftSelectedMaterials] = useState<string[]>([]);
  const [materialPopoverStyle, setMaterialPopoverStyle] = useState<PopoverStyle>(null);
  const materialTriggerRef = useRef<HTMLButtonElement | null>(null);
  const materialPopoverRef = useRef<HTMLDialogElement | null>(null);
  const materialPopoverFrameRef = useRef<number | null>(null);

  const [draftSelectedDiscounts, setDraftSelectedDiscounts] = useState<string[]>([]);
  const [discountPopoverStyle, setDiscountPopoverStyle] = useState<PopoverStyle>(null);
  const discountTriggerRef = useRef<HTMLButtonElement | null>(null);
  const discountPopoverRef = useRef<HTMLDialogElement | null>(null);
  const discountPopoverFrameRef = useRef<number | null>(null);

  const [draftSelectedMarcas, setDraftSelectedMarcas] = useState<string[]>([]);
  const [marcaPopoverStyle, setMarcaPopoverStyle] = useState<PopoverStyle>(null);
  const marcaTriggerRef = useRef<HTMLButtonElement | null>(null);
  const marcaPopoverRef = useRef<HTMLDialogElement | null>(null);
  const marcaPopoverFrameRef = useRef<number | null>(null);

  useCatalogMenuDismiss(
    {
      filterRailRef,
      pricePopoverRef,
      priceTriggerRef,
      sizePopoverRef,
      sizeTriggerRef,
      colorPopoverRef,
      colorTriggerRef,
      materialPopoverRef,
      materialTriggerRef,
      discountPopoverRef,
      discountTriggerRef,
      marcaPopoverRef,
      marcaTriggerRef,
    },
    setActiveMenu,
  );

  const layoutPricePopover = useCallback(
    (rect: DOMRect, viewport: { innerWidth: number; innerHeight: number }) =>
      measurePriceCatalogPopover(rect, viewport),
    [],
  );
  const layoutSizePopover = useCallback(
    (rect: DOMRect, viewport: { innerWidth: number; innerHeight: number }) =>
      measureSizeCatalogPopover(rect, viewport),
    [],
  );
  const layoutColorPopover = useCallback(
    (rect: DOMRect, viewport: { innerWidth: number; innerHeight: number }) =>
      measureColorCatalogPopover(rect, viewport),
    [],
  );
  const layoutMaterialPopover = useCallback(
    (rect: DOMRect, viewport: { innerWidth: number; innerHeight: number }) =>
      measureMaterialCatalogPopover(rect, viewport),
    [],
  );
  const layoutDiscountPopover = useCallback(
    (rect: DOMRect, viewport: { innerWidth: number; innerHeight: number }) =>
      measureDiscountCatalogPopover(rect, viewport),
    [],
  );
  const layoutMarcaPopover = useCallback(
    (rect: DOMRect, viewport: { innerWidth: number; innerHeight: number }) =>
      measureMarcaCatalogPopover(rect, viewport),
    [],
  );

  usePopoverDockEffect(activeMenu === "precio", priceTriggerRef, pricePopoverFrameRef, setPricePopoverStyle, layoutPricePopover);
  usePopoverDockEffect(activeMenu === "talla", sizeTriggerRef, sizePopoverFrameRef, setSizePopoverStyle, layoutSizePopover);
  usePopoverDockEffect(activeMenu === "color", colorTriggerRef, colorPopoverFrameRef, setColorPopoverStyle, layoutColorPopover);
  usePopoverDockEffect(activeMenu === "material", materialTriggerRef, materialPopoverFrameRef, setMaterialPopoverStyle, layoutMaterialPopover);
  usePopoverDockEffect(activeMenu === "descuento", discountTriggerRef, discountPopoverFrameRef, setDiscountPopoverStyle, layoutDiscountPopover);
  usePopoverDockEffect(activeMenu === "marcaSlug", marcaTriggerRef, marcaPopoverFrameRef, setMarcaPopoverStyle, layoutMarcaPopover);

  const menuDraftSetters = useMemo(
    () => ({
      setPricePopoverStyle,
      setDraftPriceMin,
      setDraftPriceMax,
      setSizePopoverStyle,
      setDraftSelectedSizes,
      setColorPopoverStyle,
      setDraftSelectedColors,
      setMaterialPopoverStyle,
      setDraftSelectedMaterials,
      setDiscountPopoverStyle,
      setDraftSelectedDiscounts,
      setMarcaPopoverStyle,
      setDraftSelectedMarcas,
    }),
    [],
  );

  const toggleMenu = useCallback(
    (menuKey: string) => {
      setActiveMenu((current) => {
        if (current === menuKey) return null;
        primeCatalogMenuDraft(menuKey, menuDraftContext, menuDraftSetters);
        return menuKey;
      });
    },
    [menuDraftContext, menuDraftSetters],
  );

  const closeMenus = useCallback(() => setActiveMenu(null), []);

  return {
    activeMenu,
    closeMenus,
    filterRailRef,
    toggleMenu,
    triggerRefs: {
      priceTriggerRef,
      sizeTriggerRef,
      marcaTriggerRef,
      colorTriggerRef,
      materialTriggerRef,
      discountTriggerRef,
    },
    price: {
      draftMin: draftPriceMin,
      draftMax: draftPriceMax,
      setDraftMin: setDraftPriceMin,
      setDraftMax: setDraftPriceMax,
      popoverStyle: pricePopoverStyle,
      popoverRef: pricePopoverRef,
    },
    size: {
      draftSelected: draftSelectedSizes,
      setDraftSelected: setDraftSelectedSizes,
      popoverStyle: sizePopoverStyle,
      popoverRef: sizePopoverRef,
    },
    color: {
      draftSelected: draftSelectedColors,
      setDraftSelected: setDraftSelectedColors,
      popoverStyle: colorPopoverStyle,
      popoverRef: colorPopoverRef,
    },
    material: {
      draftSelected: draftSelectedMaterials,
      setDraftSelected: setDraftSelectedMaterials,
      popoverStyle: materialPopoverStyle,
      popoverRef: materialPopoverRef,
    },
    discount: {
      draftSelected: draftSelectedDiscounts,
      setDraftSelected: setDraftSelectedDiscounts,
      popoverStyle: discountPopoverStyle,
      popoverRef: discountPopoverRef,
    },
    marca: {
      draftSelected: draftSelectedMarcas,
      setDraftSelected: setDraftSelectedMarcas,
      popoverStyle: marcaPopoverStyle,
      popoverRef: marcaPopoverRef,
    },
  };
}

export function computePriceSliderFill(
  priceBounds: { min: number; max: number },
  draftMin: number,
  draftMax: number,
) {
  if (priceBounds.max <= priceBounds.min) {
    return { left: "10px", right: "10px" };
  }
  const l = (draftMin - priceBounds.min) / (priceBounds.max - priceBounds.min);
  const r = (draftMax - priceBounds.min) / (priceBounds.max - priceBounds.min);
  return {
    left: `calc(${(l * 100).toFixed(2)}% + ${(10 - l * 20).toFixed(2)}px)`,
    right: `calc(${((1 - r) * 100).toFixed(2)}% + ${(r * 20 - 10).toFixed(2)}px)`,
  };
}
