import type { RefObject } from "react";
import { ChevronDown } from "lucide-react";

export type CatalogFilterRailMenu = {
  key: string;
  label: string;
  value: string;
};

export type CatalogFilterTriggerRefs = {
  priceTriggerRef: RefObject<HTMLButtonElement | null>;
  sizeTriggerRef: RefObject<HTMLButtonElement | null>;
  marcaTriggerRef: RefObject<HTMLButtonElement | null>;
  colorTriggerRef: RefObject<HTMLButtonElement | null>;
  materialTriggerRef: RefObject<HTMLButtonElement | null>;
  discountTriggerRef: RefObject<HTMLButtonElement | null>;
};

const EXPANDABLE_FILTER_KEYS = new Set([
  "precio",
  "talla",
  "marcaSlug",
  "color",
  "material",
  "descuento",
]);

function catalogFilterPopoverDomId(menuKey: string): string {
  switch (menuKey) {
    case "precio":
      return "catalog-price-popover";
    case "talla":
      return "catalog-size-popover";
    case "marcaSlug":
      return "catalog-marca-popover";
    case "color":
      return "catalog-color-popover";
    case "material":
      return "catalog-material-popover";
    default:
      return "catalog-discount-popover";
  }
}

function triggerRefForMenuKey(
  menuKey: string,
  refs: CatalogFilterTriggerRefs
): RefObject<HTMLButtonElement | null> | undefined {
  if (menuKey === "precio") return refs.priceTriggerRef;
  if (menuKey === "talla") return refs.sizeTriggerRef;
  if (menuKey === "marcaSlug") return refs.marcaTriggerRef;
  if (menuKey === "color") return refs.colorTriggerRef;
  if (menuKey === "material") return refs.materialTriggerRef;
  if (menuKey === "descuento") return refs.discountTriggerRef;
  return undefined;
}

type CatalogFilterRailProps = {
  filterRailRef: RefObject<HTMLDivElement | null>;
  menus: CatalogFilterRailMenu[];
  activeMenu: string | null;
  toggleMenu: (menuKey: string) => void;
  triggerRefs: CatalogFilterTriggerRefs;
};

export function CatalogFilterRail({
  filterRailRef,
  menus,
  activeMenu,
  toggleMenu,
  triggerRefs,
}: CatalogFilterRailProps) {
  return (
    <div className="catalog-filter-rail" ref={filterRailRef}>
      {menus.map((menu) => {
        const isExpandable = EXPANDABLE_FILTER_KEYS.has(menu.key);
        const isOpen = activeMenu === menu.key;
        const popoverId = catalogFilterPopoverDomId(menu.key);
        const triggerRef = triggerRefForMenuKey(menu.key, triggerRefs);

        return (
          <div
            key={menu.key}
            className={`catalog-filter-item ${isOpen ? "is-open" : ""} ${!isExpandable ? "is-static" : ""}`}
          >
            <button
              type="button"
              className="catalog-filter-trigger"
              onClick={isExpandable ? () => toggleMenu(menu.key) : undefined}
              disabled={!isExpandable}
              aria-disabled={!isExpandable}
              aria-haspopup={isExpandable ? "dialog" : undefined}
              aria-expanded={isExpandable ? isOpen : undefined}
              aria-controls={isExpandable && isOpen ? popoverId : undefined}
              ref={triggerRef}
            >
              <span className="catalog-filter-label">{menu.label}</span>
              <span className="catalog-filter-value">{menu.value}</span>
              {isExpandable && <ChevronDown size={14} className="catalog-filter-chevron" />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
