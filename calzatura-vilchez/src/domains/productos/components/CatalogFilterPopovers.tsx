import { DISCOUNT_OPTIONS, toggleCatalogStringListMember } from "@/domains/productos/utils/productsPageCatalogDerivations";
import type { FilterMenuConfig } from "@/domains/productos/utils/productsPageCatalogModel";
import { computePriceSliderFill } from "@/domains/productos/hooks/useCatalogFacetPopovers";
import type { RefObject } from "react";

type PopoverStyle = { top: number; left: number; width: number };

type FacetPopoverState = {
  draftSelected: string[];
  setDraftSelected: (value: string[] | ((current: string[]) => string[])) => void;
  popoverStyle: PopoverStyle | null;
  popoverRef: RefObject<HTMLDialogElement | null>;
};

type Props = Readonly<{
  activeMenu: string | null;
  filterMenus: FilterMenuConfig[];
  priceBounds: { min: number; max: number };
  price: {
    draftMin: number;
    draftMax: number;
    setDraftMin: (value: number) => void;
    setDraftMax: (value: number) => void;
    popoverStyle: PopoverStyle | null;
    popoverRef: RefObject<HTMLDialogElement | null>;
  };
  size: FacetPopoverState;
  color: FacetPopoverState;
  material: FacetPopoverState;
  discount: FacetPopoverState;
  marca: FacetPopoverState;
  availableSizes: string[];
  availableColors: Array<{ label: string; value: string; swatch: string }>;
  availableMaterials: Array<{ value: string; label: string }>;
  marcas: Array<{ label: string; value: string }>;
}>;

function popoverStyleProps(style: PopoverStyle) {
  return {
    top: `${style.top}px`,
    left: `${style.left}px`,
    width: `${style.width}px`,
  };
}

export function CatalogFilterPopovers({
  activeMenu,
  filterMenus,
  priceBounds,
  price,
  size,
  color,
  material,
  discount,
  marca,
  availableSizes,
  availableColors,
  availableMaterials,
  marcas,
}: Props) {
  const {
    draftMin: priceDraftMin,
    draftMax: priceDraftMax,
    setDraftMin: setPriceDraftMin,
    setDraftMax: setPriceDraftMax,
    popoverStyle: pricePopoverStyle,
    popoverRef: pricePopoverRef,
  } = price;
  const priceFill = computePriceSliderFill(priceBounds, priceDraftMin, priceDraftMax);

  return (
    <>
      {activeMenu === "precio" && pricePopoverStyle && (
        <dialog
          open
          id="catalog-price-popover"
          ref={pricePopoverRef}
          className="catalog-price-popover"
          aria-label="Filtro de precio"
          style={popoverStyleProps(pricePopoverStyle)}
        >
          <div className="catalog-filter-menu catalog-filter-menu-price">
            <div className="catalog-price-fields">
              <label className="catalog-price-field" aria-label="Precio mínimo">
                <div className="catalog-price-input-shell">
                  <span className="catalog-price-input-label">Mínimo</span>
                  <input
                    aria-label="Precio mínimo"
                    type="number"
                    min={priceBounds.min}
                    max={priceDraftMax}
                    value={priceDraftMin}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (!Number.isFinite(next)) return;
                      setPriceDraftMin(Math.max(priceBounds.min, Math.min(next, priceDraftMax)));
                    }}
                  />
                  <em>S/.</em>
                </div>
              </label>
              <label className="catalog-price-field" aria-label="Precio máximo">
                <div className="catalog-price-input-shell">
                  <span className="catalog-price-input-label">Máximo</span>
                  <input
                    aria-label="Precio máximo"
                    type="number"
                    min={priceDraftMin}
                    max={priceBounds.max}
                    value={priceDraftMax}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (!Number.isFinite(next)) return;
                      setPriceDraftMax(Math.min(priceBounds.max, Math.max(next, priceDraftMin)));
                    }}
                  />
                  <em>S/.</em>
                </div>
              </label>
            </div>
            <div className="catalog-price-slider-shell">
              <div className="catalog-price-slider-track" />
              <div className="catalog-price-slider-range" style={{ left: priceFill.left, right: priceFill.right }} />
              <input
                className="catalog-price-slider catalog-price-slider-min"
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                step={1}
                value={priceDraftMin}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setPriceDraftMin(Math.min(next, priceDraftMax));
                }}
              />
              <input
                className="catalog-price-slider catalog-price-slider-max"
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                step={1}
                value={priceDraftMax}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setPriceDraftMax(Math.max(next, priceDraftMin));
                }}
              />
            </div>
            <button
              type="button"
              className="catalog-price-apply"
              onClick={() => {
                filterMenus.find((menu) => menu.key === "precio")?.onSelect(`range:${priceDraftMin}:${priceDraftMax}`);
              }}
            >
              Mostrar resultados
            </button>
          </div>
        </dialog>
      )}

      {activeMenu === "talla" && size.popoverStyle && (
        <SizeFacetPopover
          popoverRef={size.popoverRef}
          style={size.popoverStyle}
          availableSizes={availableSizes}
          draftSelected={size.draftSelected}
          setDraftSelected={size.setDraftSelected}
          onApply={() => filterMenus.find((m) => m.key === "talla")?.onSelect(size.draftSelected.join(","))}
        />
      )}

      {activeMenu === "color" && color.popoverStyle && (
        <ColorFacetPopover
          popoverRef={color.popoverRef}
          style={color.popoverStyle}
          availableColors={availableColors}
          draftSelected={color.draftSelected}
          setDraftSelected={color.setDraftSelected}
          onApply={() => filterMenus.find((m) => m.key === "color")?.onSelect(color.draftSelected.join(","))}
        />
      )}

      {activeMenu === "material" && material.popoverStyle && (
        <MaterialFacetPopover
          popoverRef={material.popoverRef}
          style={material.popoverStyle}
          availableMaterials={availableMaterials}
          draftSelected={material.draftSelected}
          setDraftSelected={material.setDraftSelected}
          onApply={() => filterMenus.find((m) => m.key === "material")?.onSelect(material.draftSelected.join(","))}
        />
      )}

      {activeMenu === "descuento" && discount.popoverStyle && (
        <DiscountFacetPopover
          popoverRef={discount.popoverRef}
          style={discount.popoverStyle}
          draftSelected={discount.draftSelected}
          setDraftSelected={discount.setDraftSelected}
          onApply={() => filterMenus.find((m) => m.key === "descuento")?.onSelect(discount.draftSelected.join(","))}
        />
      )}

      {activeMenu === "marcaSlug" && marca.popoverStyle && (
        <MarcaFacetPopover
          popoverRef={marca.popoverRef}
          style={marca.popoverStyle}
          marcas={marcas}
          draftSelected={marca.draftSelected}
          setDraftSelected={marca.setDraftSelected}
          onApply={() => filterMenus.find((m) => m.key === "marcaSlug")?.onSelect(marca.draftSelected[0] ?? "")}
        />
      )}
    </>
  );
}

function SizeFacetPopover({
  popoverRef,
  style,
  availableSizes,
  draftSelected,
  setDraftSelected,
  onApply,
}: Readonly<{
  popoverRef: RefObject<HTMLDialogElement | null>;
  style: PopoverStyle;
  availableSizes: string[];
  draftSelected: string[];
  setDraftSelected: FacetPopoverState["setDraftSelected"];
  onApply: () => void;
}>) {
  return (
    <dialog
      open
      id="catalog-size-popover"
      ref={popoverRef}
      className="catalog-price-popover"
      aria-label="Filtro de talla"
      style={popoverStyleProps(style)}
    >
      <div className="catalog-filter-menu catalog-filter-menu-price">
        <fieldset className="catalog-size-grid">
          <legend className="sr-only">Tallas disponibles</legend>
          {availableSizes.length === 0 ? (
            <p className="catalog-size-empty">No hay tallas disponibles para los filtros actuales.</p>
          ) : (
            availableSizes.map((sizeValue) => {
              const checked = draftSelected.includes(sizeValue);
              return (
                <label key={sizeValue} className="catalog-size-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setDraftSelected((current) =>
                        toggleCatalogStringListMember(current, sizeValue, checked),
                      );
                    }}
                  />
                  <span>{sizeValue}</span>
                </label>
              );
            })
          )}
        </fieldset>
        <button type="button" className="catalog-price-apply" onClick={onApply}>
          Mostrar resultados
        </button>
      </div>
    </dialog>
  );
}

function ColorFacetPopover({
  popoverRef,
  style,
  availableColors,
  draftSelected,
  setDraftSelected,
  onApply,
}: Readonly<{
  popoverRef: RefObject<HTMLDialogElement | null>;
  style: PopoverStyle;
  availableColors: Array<{ label: string; value: string; swatch: string }>;
  draftSelected: string[];
  setDraftSelected: FacetPopoverState["setDraftSelected"];
  onApply: () => void;
}>) {
  return (
    <dialog
      open
      id="catalog-color-popover"
      ref={popoverRef}
      className="catalog-price-popover"
      aria-label="Filtro de color"
      style={popoverStyleProps(style)}
    >
      <div className="catalog-filter-menu catalog-filter-menu-price">
        <fieldset className="catalog-color-grid">
          <legend className="sr-only">Colores disponibles</legend>
          {availableColors.length === 0 ? (
            <p className="catalog-size-empty">No hay colores disponibles para los filtros actuales.</p>
          ) : (
            availableColors.map((colorOption) => {
              const checked = draftSelected.includes(colorOption.value);
              return (
                <button
                  key={colorOption.value}
                  type="button"
                  className={`catalog-color-item ${checked ? "is-active" : ""}`}
                  onClick={() => {
                    setDraftSelected((current) =>
                      toggleCatalogStringListMember(current, colorOption.value, checked),
                    );
                  }}
                >
                  <span className="catalog-color-swatch" style={{ background: colorOption.swatch }} aria-hidden="true" />
                  <span>{colorOption.label}</span>
                </button>
              );
            })
          )}
        </fieldset>
        <button type="button" className="catalog-price-apply" onClick={onApply}>
          Mostrar resultados
        </button>
      </div>
    </dialog>
  );
}

function MaterialFacetPopover({
  popoverRef,
  style,
  availableMaterials,
  draftSelected,
  setDraftSelected,
  onApply,
}: Readonly<{
  popoverRef: RefObject<HTMLDialogElement | null>;
  style: PopoverStyle;
  availableMaterials: Array<{ value: string; label: string }>;
  draftSelected: string[];
  setDraftSelected: FacetPopoverState["setDraftSelected"];
  onApply: () => void;
}>) {
  return (
    <dialog
      open
      id="catalog-material-popover"
      ref={popoverRef}
      className="catalog-price-popover"
      aria-label="Filtro de material"
      style={popoverStyleProps(style)}
    >
      <div className="catalog-filter-menu catalog-filter-menu-price catalog-filter-menu-material">
        <fieldset className="catalog-material-grid">
          <legend className="sr-only">Materiales disponibles</legend>
          {availableMaterials.length === 0 ? (
            <p className="catalog-size-empty">No hay materiales disponibles para los filtros actuales.</p>
          ) : (
            availableMaterials.map((materialOption) => {
              const checked = draftSelected.includes(materialOption.value);
              return (
                <label key={materialOption.value} className="catalog-material-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setDraftSelected((current) =>
                        toggleCatalogStringListMember(current, materialOption.value, checked),
                      );
                    }}
                  />
                  <span>{materialOption.label}</span>
                </label>
              );
            })
          )}
        </fieldset>
        <button type="button" className="catalog-price-apply" onClick={onApply}>
          Mostrar resultados
        </button>
      </div>
    </dialog>
  );
}

function DiscountFacetPopover({
  popoverRef,
  style,
  draftSelected,
  setDraftSelected,
  onApply,
}: Readonly<{
  popoverRef: RefObject<HTMLDialogElement | null>;
  style: PopoverStyle;
  draftSelected: string[];
  setDraftSelected: FacetPopoverState["setDraftSelected"];
  onApply: () => void;
}>) {
  return (
    <dialog
      open
      id="catalog-discount-popover"
      ref={popoverRef}
      className="catalog-price-popover"
      aria-label="Filtro de descuento"
      style={popoverStyleProps(style)}
    >
      <div className="catalog-filter-menu catalog-filter-menu-price">
        <fieldset className="catalog-checklist-vertical">
          <legend className="sr-only">Descuentos disponibles</legend>
          {DISCOUNT_OPTIONS.map((discountOption) => {
            const checked = draftSelected.includes(discountOption.value);
            return (
              <label key={discountOption.value} className="catalog-size-item">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setDraftSelected((current) =>
                      toggleCatalogStringListMember(current, discountOption.value, checked),
                    );
                  }}
                />
                <span>{discountOption.label}</span>
              </label>
            );
          })}
        </fieldset>
        <button type="button" className="catalog-price-apply" onClick={onApply}>
          Mostrar resultados
        </button>
      </div>
    </dialog>
  );
}

function MarcaFacetPopover({
  popoverRef,
  style,
  marcas,
  draftSelected,
  setDraftSelected,
  onApply,
}: Readonly<{
  popoverRef: RefObject<HTMLDialogElement | null>;
  style: PopoverStyle;
  marcas: Array<{ label: string; value: string }>;
  draftSelected: string[];
  setDraftSelected: FacetPopoverState["setDraftSelected"];
  onApply: () => void;
}>) {
  return (
    <dialog
      open
      id="catalog-marca-popover"
      ref={popoverRef}
      className="catalog-price-popover"
      aria-label="Filtro de marca"
      style={popoverStyleProps(style)}
    >
      <div className="catalog-filter-menu catalog-filter-menu-price">
        <fieldset className="catalog-checklist-vertical">
          <legend className="sr-only">Marcas disponibles</legend>
          {marcas.length === 0 ? (
            <p className="catalog-size-empty">No hay marcas disponibles.</p>
          ) : (
            marcas.map((brandOption) => {
              const selected = draftSelected[0] === brandOption.value;
              return (
                <label key={brandOption.value} className="catalog-size-item">
                  <input
                    type="radio"
                    name="catalog-marca-radio"
                    checked={selected}
                    onChange={() => {
                      setDraftSelected(selected ? [] : [brandOption.value]);
                    }}
                  />
                  <span>{brandOption.label}</span>
                </label>
              );
            })
          )}
        </fieldset>
        <button type="button" className="catalog-price-apply" onClick={onApply}>
          Mostrar resultados
        </button>
      </div>
    </dialog>
  );
}
