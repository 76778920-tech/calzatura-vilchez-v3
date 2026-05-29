import { CATALOG_ROUTE_PARAM_KEYS } from "@/routes/catalogRouting";
import { slugifyCatalogValue } from "@/utils/catalog";
import { categoryLabel } from "@/utils/labels";
import type { Product } from "@/types";
import type { PublicCatalogBrowseResult } from "@/utils/publicBffClient";
import {
  buildActiveCatalogFacetChips,
  buildCatalogBreadcrumbs,
  buildContextualCatalogFilters,
  buildFacetFilteredCatalogProducts,
  buildRouteFilteredCatalogProducts,
  DISCOUNT_OPTIONS,
  getPriceLabel,
  getProductSizes,
  humanizeSlug,
  MATERIAL_FILTER_ORDER,
  MATERIAL_RULES,
  parseColorSelection,
  parseDiscountSelection,
  parseMaterialSelection,
  parseSizeSelection,
  resolveProductsPageTitle,
  type CatalogFilterGroup,
} from "@/domains/productos/utils/productsPageCatalogDerivations";
import {
  COLOR_SWATCH_MAP,
  COLOR_SWATCH_ORDER,
  CATALOG_PAGE_SIZE,
  productCountLabel,
} from "@/domains/productos/pages/productsPageConstants";

export type FilterMenuConfig = {
  key: string;
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onSelect: (value: string) => void;
};

export type RouteFacetParams = {
  categoria: string;
  vista: string | null;
  marca: string;
  marcaSlug: string;
  campana: string;
  promocion: string;
  coleccion: string;
  estilo: string;
  tipo: string;
  linea: string;
  segmento: string;
  color: string;
  rangoEdad: string;
  precio: string;
  talla: string;
  material: string;
  descuento: string;
  trimmedQuery: string;
};

type CatalogModelInput = {
  products: Product[];
  browse: PublicCatalogBrowseResult | null;
  useBffBrowse: boolean;
  catalogPage: number;
  route: RouteFacetParams;
  applyFacetFilter: (next: Record<string, string | undefined>) => void;
};

export function buildPrimaryCatalogFilters(): CatalogFilterGroup {
  return {
    title: "Sección",
    items: [
      { label: "Todos", params: {} },
      { label: "Mujer", params: { categoria: "mujer" } },
      { label: "Hombre", params: { categoria: "hombre" } },
      { label: "Infantil", params: { categoria: "nino" } },
      { label: "Marcas", params: { vista: "marcas" } },
    ],
  };
}

export function buildRouteFilteredProducts(products: Product[], route: RouteFacetParams) {
  return buildRouteFilteredCatalogProducts({
    products,
    categoria: route.categoria,
    vista: route.vista,
    marca: route.marca,
    marcaSlug: route.marcaSlug,
    campana: route.campana,
    promocion: route.promocion,
    coleccion: route.coleccion,
    tipo: route.tipo,
    linea: route.linea,
    estilo: route.estilo,
    segmento: route.segmento,
    rangoEdad: route.rangoEdad,
    color: route.color,
    trimmedQuery: route.trimmedQuery,
  });
}

export function buildMarcasFromProducts(routeFiltered: Product[]) {
  const names = routeFiltered
    .map((product) => product.marca?.trim())
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set(names))
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ label: value, value: slugifyCatalogValue(value) }));
}

export function buildAvailableColors() {
  return COLOR_SWATCH_ORDER.map((value) => ({
    label: humanizeSlug(value),
    value,
    swatch: COLOR_SWATCH_MAP[value],
  }));
}

export function buildAvailableSizesFromProducts(routeFiltered: Product[]) {
  const numericSizes = routeFiltered
    .flatMap((product) => getProductSizes(product))
    .map(Number)
    .filter(Number.isFinite);
  return Array.from(new Set(numericSizes))
    .sort((left, right) => left - right)
    .map(String);
}

export function buildAvailableMaterials() {
  return MATERIAL_FILTER_ORDER.map((slug) => ({
    value: slug,
    label: MATERIAL_RULES.find((rule) => rule.slug === slug)?.label ?? humanizeSlug(slug),
  }));
}

export function buildPriceBoundsFromProducts(routeFiltered: Product[]) {
  if (routeFiltered.length === 0) return { min: 0, max: 0, low: 0, high: 0 };
  const prices = routeFiltered.map((product) => product.precio).filter(Number.isFinite);
  if (prices.length === 0) return { min: 0, max: 0, low: 0, high: 0 };
  const min = Math.floor(Math.min(...prices));
  const max = Math.ceil(Math.max(...prices));
  const low = Math.max(min, Math.round((min + (max - min) * 0.35) / 10) * 10);
  const high = Math.max(low + 10, Math.round((min + (max - min) * 0.68) / 10) * 10);
  return { min, max, low, high: Math.min(high, max) };
}

export function buildProductsPageFilterMenus(
  route: RouteFacetParams,
  marcas: Array<{ label: string; value: string }>,
  priceBounds: { min: number; max: number },
  applyFacetFilter: (next: Record<string, string | undefined>) => void,
): FilterMenuConfig[] {
  return [
    {
      key: "precio",
      label: "Precio",
      value: route.precio ? getPriceLabel(route.precio, priceBounds.min, priceBounds.max) : "",
      options: [],
      onSelect: (value) => applyFacetFilter({ precio: value || undefined }),
    },
    {
      key: "talla",
      label: "Talla",
      value: route.talla ? parseSizeSelection(route.talla).join(", ") : "",
      options: [],
      onSelect: (value) => applyFacetFilter({ talla: value || undefined }),
    },
    {
      key: "marcaSlug",
      label: "Marca",
      value: route.marcaSlug ? humanizeSlug(route.marcaSlug) : "",
      options: marcas,
      onSelect: (value) =>
        applyFacetFilter({
          vista: value ? "marcas" : route.vista || undefined,
          marcaSlug: value || undefined,
        }),
    },
    {
      key: "color",
      label: "Color",
      value: route.color ? parseColorSelection(route.color).map(humanizeSlug).join(", ") : "",
      options: [],
      onSelect: (value) => applyFacetFilter({ color: value || undefined }),
    },
    {
      key: "material",
      label: "Material",
      value: route.material ? parseMaterialSelection(route.material).map(humanizeSlug).join(", ") : "",
      options: [],
      onSelect: (value) => applyFacetFilter({ material: value || undefined }),
    },
    {
      key: "descuento",
      label: "Descuento %",
      value: route.descuento
        ? parseDiscountSelection(route.descuento)
            .map((value) => DISCOUNT_OPTIONS.find((option) => option.value === value)?.label ?? value)
            .join(", ")
        : "",
      options: [],
      onSelect: (value) => applyFacetFilter({ descuento: value || undefined }),
    },
  ];
}

export function shouldShowContextualFilterGroup(
  contextualFilters: CatalogFilterGroup,
  primaryFilters: CatalogFilterGroup,
) {
  if (contextualFilters.title === "Categoría") return false;
  if (contextualFilters.items.length !== primaryFilters.items.length) return true;
  return contextualFilters.items.some((item, index) => {
    const primaryItem = primaryFilters.items[index];
    if (!primaryItem) return true;
    if (item.label !== primaryItem.label) return true;
    return CATALOG_ROUTE_PARAM_KEYS.some(
      (key) => (item.params[key] ?? "") !== (primaryItem.params[key] ?? ""),
    );
  });
}

export function resolvePageSubtitle(route: RouteFacetParams, catalogTotal: number) {
  const visibleCount = productCountLabel(catalogTotal);
  if (route.campana || route.promocion || route.coleccion) {
    return `${visibleCount} visibles dentro de la selección activa. Explora por filtros rápidos sin perder la línea visual de la colección.`;
  }
  if (route.categoria === "todos") {
    return `${visibleCount} listos para comparar con una navegación más limpia, directa y coherente con la marca.`;
  }
  return `${visibleCount} listos para explorar dentro de ${categoryLabel(route.categoria).toLowerCase()}. Usa los menús horizontales para afinar color, talla, material o promociones.`;
}

export function buildCatalogModel(input: CatalogModelInput) {
  const { products, browse, useBffBrowse, catalogPage, route, applyFacetFilter } = input;

  const routeFiltered = useBffBrowse ? [] : buildRouteFilteredProducts(products, route);
  const marcasClient = buildMarcasFromProducts(routeFiltered);
  const marcas = useBffBrowse ? (browse?.meta.marcas ?? []) : marcasClient;
  const availableColors = buildAvailableColors();
  const availableSizesClient = buildAvailableSizesFromProducts(routeFiltered);
  const availableSizes = useBffBrowse ? (browse?.meta.availableSizes ?? []) : availableSizesClient;
  const availableMaterials = buildAvailableMaterials();
  const priceBoundsClient = buildPriceBoundsFromProducts(routeFiltered);
  const priceBounds = useBffBrowse
    ? (browse?.meta.priceBounds ?? { min: 0, max: 0, low: 0, high: 0 })
    : priceBoundsClient;

  const filtered = useBffBrowse
    ? []
    : buildFacetFilteredCatalogProducts(routeFiltered, {
        precio: route.precio,
        talla: route.talla,
        color: route.color,
        material: route.material,
        descuento: route.descuento,
      });

  const catalogTotal = useBffBrowse ? (browse?.total ?? 0) : filtered.length;
  const totalCatalogPages = useBffBrowse
    ? (browse?.totalPages ?? 0)
    : Math.ceil(filtered.length / CATALOG_PAGE_SIZE);
  const pagedProductsClient = filtered.slice(
    (catalogPage - 1) * CATALOG_PAGE_SIZE,
    catalogPage * CATALOG_PAGE_SIZE,
  );
  const pagedProducts = useBffBrowse ? (browse?.products ?? []) : pagedProductsClient;

  const pageTitle = resolveProductsPageTitle({
    vista: route.vista,
    campana: route.campana,
    promocion: route.promocion,
    coleccion: route.coleccion,
    linea: route.linea,
    tipo: route.tipo,
    estilo: route.estilo,
    segmento: route.segmento,
    marcaSlug: route.marcaSlug,
    categoria: route.categoria,
    trimmedQuery: route.trimmedQuery,
  });

  const pageSubtitle = resolvePageSubtitle(route, catalogTotal);
  const primaryFilters = buildPrimaryCatalogFilters();
  const contextualFilters = buildContextualCatalogFilters({
    vista: route.vista,
    campana: route.campana,
    categoria: route.categoria,
    coleccion: route.coleccion,
    tipo: route.tipo,
    linea: route.linea,
    segmento: route.segmento,
    color: route.color,
    descuento: route.descuento,
    rangoEdad: route.rangoEdad,
    marcas,
  });

  const filterMenus = buildProductsPageFilterMenus(route, marcas, priceBounds, applyFacetFilter);
  const activeFacets = buildActiveCatalogFacetChips(
    {
      precio: route.precio,
      talla: route.talla,
      marcaSlug: route.marcaSlug,
      color: route.color,
      material: route.material,
      descuento: route.descuento,
      categoria: route.categoria,
      vista: route.vista,
      priceBoundsMin: priceBounds.min,
      priceBoundsMax: priceBounds.max,
    },
    applyFacetFilter,
  );

  const breadcrumbs = buildCatalogBreadcrumbs({
    vista: route.vista,
    categoria: route.categoria,
    campana: route.campana,
    coleccion: route.coleccion,
    linea: route.linea,
    tipo: route.tipo,
    estilo: route.estilo,
    segmento: route.segmento,
    rangoEdad: route.rangoEdad,
    color: route.color,
    marca: route.marca,
    marcaSlug: route.marcaSlug,
    descuento: route.descuento,
    precio: route.precio,
    talla: route.talla,
    material: route.material,
  });

  const sectionLabel =
    route.vista === "marcas" ? "Marcas" : route.categoria !== "todos" ? categoryLabel(route.categoria) : "Todo el catálogo";

  const visibleBrandCount = new Set(pagedProducts.map((product) => product.marca).filter(Boolean)).size;

  return {
    routeFiltered,
    marcas,
    availableColors,
    availableSizes,
    availableMaterials,
    priceBounds,
    filtered,
    catalogTotal,
    totalCatalogPages,
    pagedProducts,
    pageTitle,
    pageSubtitle,
    primaryFilters,
    contextualFilters,
    showContextualFilterGroup: shouldShowContextualFilterGroup(contextualFilters, primaryFilters),
    filterMenus,
    activeFacets,
    breadcrumbs,
    sectionLabel,
    visibleBrandCount,
    hasAnyProducts: catalogTotal > 0,
  };
}
