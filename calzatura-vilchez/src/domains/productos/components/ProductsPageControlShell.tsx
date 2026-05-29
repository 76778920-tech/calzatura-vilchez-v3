import { ChevronRight, X } from "lucide-react";
import { CatalogFilterRail } from "@/domains/productos/components/CatalogFilterRail";
import { CatalogFilterPopovers } from "@/domains/productos/components/CatalogFilterPopovers";
import { CYBER_DISCOUNT_PILL_OPTIONS } from "@/domains/productos/pages/productsPageConstants";
import type { FilterMenuConfig } from "@/domains/productos/utils/productsPageCatalogModel";
import type { CatalogFilterGroup } from "@/domains/productos/utils/productsPageCatalogDerivations";
import type { useCatalogFacetPopovers } from "@/domains/productos/hooks/useCatalogFacetPopovers";

type FacetPopovers = ReturnType<typeof useCatalogFacetPopovers>;

type Breadcrumb = { label: string; params: Record<string, string | undefined> };

type ActiveFacet = { label: string; onClear: () => void };

type Props = Readonly<{
  breadcrumbs: Breadcrumb[];
  primaryFilters: CatalogFilterGroup;
  contextualFilters: CatalogFilterGroup;
  showContextualFilterGroup: boolean;
  campana: string;
  cyberShelfParams: Record<string, string | undefined> | null;
  filterMenus: FilterMenuConfig[];
  activeFacets: ActiveFacet[];
  marcas: Array<{ label: string; value: string }>;
  availableSizes: string[];
  availableColors: Array<{ label: string; value: string; swatch: string }>;
  availableMaterials: Array<{ value: string; label: string }>;
  priceBounds: { min: number; max: number; low: number; high: number };
  isQuickFilterActive: (params: Record<string, string | undefined>) => boolean;
  applySectionFilter: (next: Record<string, string | undefined>) => void;
  popovers: FacetPopovers;
}>;

export function ProductsPageControlShell({
  breadcrumbs,
  primaryFilters,
  contextualFilters,
  showContextualFilterGroup,
  campana,
  cyberShelfParams,
  filterMenus,
  activeFacets,
  marcas,
  availableSizes,
  availableColors,
  availableMaterials,
  priceBounds,
  isQuickFilterActive,
  applySectionFilter,
  popovers,
}: Props) {
  const { activeMenu, filterRailRef, toggleMenu, triggerRefs, price, size, color, material, discount, marca } =
    popovers;

  return (
    <>
      {breadcrumbs.length > 1 && (
        <nav className="catalog-breadcrumbs" aria-label="Navegación del catálogo">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <div key={`${crumb.label}-${index}`} className="catalog-breadcrumb-item">
                <button
                  type="button"
                  className={`catalog-breadcrumb-btn ${isLast ? "is-current" : ""}`}
                  onClick={() => applySectionFilter(crumb.params)}
                  disabled={isLast}
                >
                  {crumb.label}
                </button>
                {!isLast && <ChevronRight size={14} className="catalog-breadcrumb-separator" />}
              </div>
            );
          })}
        </nav>
      )}

      <section className="catalog-control-shell">
        <div className="catalog-section-tabs" aria-label={primaryFilters.title}>
          {primaryFilters.items.map((item) => (
            <button
              key={`section-${item.label}`}
              type="button"
              className={`catalog-section-tab ${isQuickFilterActive(item.params) ? "is-active" : ""}`}
              onClick={() => applySectionFilter(item.params)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {showContextualFilterGroup && (
          <div className="catalog-context-strip">
            <span className="catalog-context-label">{contextualFilters.title}</span>
            <div className="catalog-context-pills">
              {contextualFilters.items.map((item) => (
                <button
                  key={`context-${contextualFilters.title}-${item.label}`}
                  type="button"
                  className={`catalog-context-pill ${isQuickFilterActive(item.params) ? "is-active" : ""}`}
                  onClick={() => applySectionFilter(item.params)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {campana === "cyber" && cyberShelfParams && (
          <div
            className="catalog-context-strip catalog-context-strip--cyber-descuentos"
            aria-label="Descuentos Cyber Wow"
          >
            <span className="catalog-context-label">Descuento Cyber Wow</span>
            <div className="catalog-context-pills">
              {CYBER_DISCOUNT_PILL_OPTIONS.map((opt) => {
                const params = { ...cyberShelfParams, descuento: opt.value };
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`catalog-context-pill ${isQuickFilterActive(params) ? "is-active" : ""}`}
                    onClick={() => applySectionFilter(params)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <CatalogFilterRail
          filterRailRef={filterRailRef}
          menus={filterMenus.map((menu) => ({ key: menu.key, label: menu.label, value: menu.value }))}
          activeMenu={activeMenu}
          toggleMenu={toggleMenu}
          triggerRefs={triggerRefs}
        />

        <CatalogFilterPopovers
          activeMenu={activeMenu}
          filterMenus={filterMenus}
          priceBounds={priceBounds}
          price={price}
          size={size}
          color={color}
          material={material}
          discount={discount}
          marca={marca}
          availableSizes={availableSizes}
          availableColors={availableColors}
          availableMaterials={availableMaterials}
          marcas={marcas}
        />

        {activeFacets.length > 0 && (
          <div className="catalog-active-facets" aria-label="Filtros activos">
            {activeFacets.map((facet) => (
              <button key={facet.label} type="button" className="catalog-active-facet" onClick={facet.onClear}>
                <span>{facet.label}</span>
                <X size={12} />
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
