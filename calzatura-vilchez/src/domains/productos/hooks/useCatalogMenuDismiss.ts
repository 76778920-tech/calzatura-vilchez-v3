import { useEffect, type RefObject } from "react";

type MenuDismissRefs = {
  filterRailRef: RefObject<HTMLElement | null>;
  pricePopoverRef: RefObject<HTMLElement | null>;
  priceTriggerRef: RefObject<HTMLElement | null>;
  sizePopoverRef: RefObject<HTMLElement | null>;
  sizeTriggerRef: RefObject<HTMLElement | null>;
  colorPopoverRef: RefObject<HTMLElement | null>;
  colorTriggerRef: RefObject<HTMLElement | null>;
  materialPopoverRef: RefObject<HTMLElement | null>;
  materialTriggerRef: RefObject<HTMLElement | null>;
  discountPopoverRef: RefObject<HTMLElement | null>;
  discountTriggerRef: RefObject<HTMLElement | null>;
  marcaPopoverRef: RefObject<HTMLElement | null>;
  marcaTriggerRef: RefObject<HTMLElement | null>;
};

function isInside(ref: RefObject<HTMLElement | null>, target: Node) {
  return ref.current?.contains(target) ?? false;
}

/** Cierra menús de facetas al hacer clic fuera o pulsar Escape. */
export function useCatalogMenuDismiss(refs: MenuDismissRefs, setActiveMenu: (value: string | null) => void) {
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        setActiveMenu(null);
        return;
      }
      if (isInside(refs.pricePopoverRef, target)) return;
      if (isInside(refs.priceTriggerRef, target)) return;
      if (isInside(refs.sizePopoverRef, target)) return;
      if (isInside(refs.sizeTriggerRef, target)) return;
      if (isInside(refs.colorPopoverRef, target)) return;
      if (isInside(refs.colorTriggerRef, target)) return;
      if (isInside(refs.materialPopoverRef, target)) return;
      if (isInside(refs.materialTriggerRef, target)) return;
      if (isInside(refs.discountPopoverRef, target)) return;
      if (isInside(refs.discountTriggerRef, target)) return;
      if (isInside(refs.marcaPopoverRef, target)) return;
      if (isInside(refs.marcaTriggerRef, target)) return;
      if (isInside(refs.filterRailRef, target)) {
        setActiveMenu(null);
        return;
      }
      setActiveMenu(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveMenu(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [
    setActiveMenu,
    refs.filterRailRef,
    refs.pricePopoverRef,
    refs.priceTriggerRef,
    refs.sizePopoverRef,
    refs.sizeTriggerRef,
    refs.colorPopoverRef,
    refs.colorTriggerRef,
    refs.materialPopoverRef,
    refs.materialTriggerRef,
    refs.discountPopoverRef,
    refs.discountTriggerRef,
    refs.marcaPopoverRef,
    refs.marcaTriggerRef,
  ]);
}
