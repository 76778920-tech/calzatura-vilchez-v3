import { CYBER_WOW_DEFAULT_DESCUENTO } from "@/routes/catalogRouting";
import type { Product } from "@/types";
import { getProductColors } from "@/utils/colors";
import {
  productMatchesBrandSlug,
  productMatchesCategory,
  productMatchesSearch,
  productMatchesTaxonomy,
  slugifyCatalogValue,
} from "@/utils/catalog";
import { categoryLabel } from "@/utils/labels";

export type CatalogQuickFilter = {
  label: string;
  params: Record<string, string | undefined>;
};

export type CatalogFilterGroup = {
  title: string;
  items: CatalogQuickFilter[];
};

export type CatalogBreadcrumb = {
  label: string;
  params: Record<string, string | undefined>;
};

type MaterialRule = {
  slug: string;
  label: string;
  terms: string[];
};

export const MATERIAL_RULES: MaterialRule[] = [
  { slug: "cuero", label: "Cuero", terms: ["cuero", "leather"] },
  { slug: "charol", label: "Charol", terms: ["charol", "patent"] },
  { slug: "nubuk", label: "Nubuk", terms: ["nubuk"] },
  { slug: "sintetico", label: "Sintético", terms: ["sintetico", "sintética", "synthetic"] },
  { slug: "textil", label: "Textil", terms: ["textil", "mesh", "tejido"] },
  { slug: "gamuza", label: "Gamuza", terms: ["gamuza", "suede"] },
  { slug: "lona", label: "Lona", terms: ["lona", "canvas"] },
];

export const MATERIAL_FILTER_ORDER = ["cuero", "gamuza", "charol", "nubuk", "sintetico", "textil"] as const;

export const DISCOUNT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "10", label: "10 %" },
  { value: "20", label: "20 %" },
  { value: "30", label: "30 %" },
  { value: "all", label: "Todo con descuento" },
];

function normalizeText(value = "") {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function humanizeSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function inferProductMaterials(product: Product) {
  const haystack = normalizeText(
    [product.nombre, product.descripcion, product.tipoCalzado, product.color, product.marca]
      .filter(Boolean)
      .join(" ")
  );

  return MATERIAL_RULES.filter((rule) => rule.terms.some((term) => haystack.includes(normalizeText(term))));
}

export function getProductSizes(product: Product) {
  const fromTallas = Array.isArray(product.tallas) ? product.tallas : [];
  const fromStock = product.tallaStock ? Object.keys(product.tallaStock) : [];
  return Array.from(new Set([...fromTallas, ...fromStock].map((value) => value.trim()).filter(Boolean)));
}

function parsePriceParts(value: string) {
  const [mode, rawFirst, rawSecond] = value.split(":");
  return { mode, first: Number(rawFirst), second: Number(rawSecond) };
}

export function getPriceLabel(value: string, min: number, max: number) {
  if (!value) return "";
  const { mode, first, second } = parsePriceParts(value);
  if (mode === "under" && Number.isFinite(first)) return `Hasta S/ ${first}`;
  if (mode === "between" && Number.isFinite(first) && Number.isFinite(second)) return `S/ ${first} - ${second}`;
  if (mode === "over" && Number.isFinite(first)) return `Desde S/ ${first}`;
  if (mode === "range" && Number.isFinite(first) && Number.isFinite(second)) return `S/ ${first} - ${second}`;
  return min === max ? `S/ ${min}` : "";
}

function matchesPriceBucket(price: number, bucket: string) {
  if (!bucket) return true;
  const { mode, first, second } = parsePriceParts(bucket);
  if (mode === "under" && Number.isFinite(first)) return price <= first;
  if (mode === "between" && Number.isFinite(first) && Number.isFinite(second)) {
    return price >= first && price <= second;
  }
  if (mode === "over" && Number.isFinite(first)) return price >= first;
  if (mode === "range" && Number.isFinite(first) && Number.isFinite(second)) {
    return price >= Math.min(first, second) && price <= Math.max(first, second);
  }
  return true;
}

export function parsePriceRange(value: string, fallbackMin: number, fallbackMax: number) {
  const { mode, first, second } = parsePriceParts(value);
  if (mode === "range" && Number.isFinite(first) && Number.isFinite(second)) {
    return { min: Math.min(first, second), max: Math.max(first, second) };
  }
  return { min: fallbackMin, max: fallbackMax };
}

export function parseCommaSeparatedTokens(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const parseSizeSelection = parseCommaSeparatedTokens;
export const parseColorSelection = parseCommaSeparatedTokens;
export const parseMaterialSelection = parseCommaSeparatedTokens;
export const parseDiscountSelection = parseCommaSeparatedTokens;

export function inferProductDiscountPercent(product: Product) {
  return product.descuento ?? null;
}

export type CatalogRouteFilterInput = {
  products: Product[];
  categoria: string;
  vista: string | null;
  marca: string;
  marcaSlug: string;
  campana: string;
  promocion: string;
  coleccion: string;
  tipo: string;
  linea: string;
  estilo: string;
  segmento: string;
  rangoEdad: string;
  color: string;
  trimmedQuery: string;
};

export function buildRouteFilteredCatalogProducts(input: CatalogRouteFilterInput): Product[] {
  let result = [...input.products];
  const {
    categoria,
    vista,
    marca,
    marcaSlug,
    campana,
    promocion,
    coleccion,
    tipo,
    linea,
    estilo,
    segmento,
    rangoEdad,
    color,
    trimmedQuery,
  } = input;

  if (categoria !== "todos") {
    result = result.filter((product) => productMatchesCategory(product.categoria, categoria));
  }

  if (vista === "marcas" && marca !== "todas") {
    result = result.filter((product) => product.marca?.toLowerCase() === marca.toLowerCase());
  }

  if (marcaSlug) {
    result = result.filter((product) => productMatchesBrandSlug(product, marcaSlug));
  }

  const taxonomyFilters = [
    { key: "campana" as const, value: campana },
    { key: "promocion" as const, value: promocion },
    { key: "coleccion" as const, value: coleccion },
    { key: "tipo" as const, value: tipo },
    { key: "linea" as const, value: linea },
    { key: "estilo" as const, value: estilo },
    { key: "segmento" as const, value: segmento },
    { key: "rangoEdad" as const, value: rangoEdad },
  ];
  for (const { key, value } of taxonomyFilters) {
    if (value) result = result.filter((p) => productMatchesTaxonomy(p, key, value));
  }

  if (color && !color.includes(",")) {
    result = result.filter((product) => productMatchesTaxonomy(product, "color", color));
  }

  if (trimmedQuery) {
    result = result.filter((product) => productMatchesSearch(product, trimmedQuery));
  }

  return result;
}

export type CatalogFacetFilterInput = {
  precio: string;
  talla: string;
  color: string;
  material: string;
  descuento: string;
};

export function buildFacetFilteredCatalogProducts(routeFiltered: Product[], facets: CatalogFacetFilterInput): Product[] {
  let result = [...routeFiltered];
  const { precio, talla, color, material, descuento } = facets;

  if (precio) {
    result = result.filter((product) => matchesPriceBucket(product.precio, precio));
  }

  if (talla) {
    const selectedSizes = parseSizeSelection(talla);
    result = result.filter((product) => {
      const productSizes = getProductSizes(product);
      return selectedSizes.some((size) => productSizes.includes(size));
    });
  }

  if (color?.includes(",")) {
    const selectedColors = parseColorSelection(color);
    result = result.filter((product) => {
      const productColorSet = new Set(getProductColors(product).map((value) => slugifyCatalogValue(value)));
      return selectedColors.some((selected) => productColorSet.has(selected));
    });
  }

  if (material) {
    const selectedMaterials = parseMaterialSelection(material);
    result = result.filter((product) =>
      inferProductMaterials(product).some((rule) => selectedMaterials.includes(rule.slug))
    );
  }

  if (descuento) {
    const selectedDiscounts = parseDiscountSelection(descuento);
    const hasAllDiscount = selectedDiscounts.includes("all");
    const selectedPercents = selectedDiscounts
      .filter((item) => item !== "all")
      .map(Number)
      .filter(Number.isFinite);

    result = result.filter((product) => {
      const fieldPercent = inferProductDiscountPercent(product);

      if (hasAllDiscount) {
        return fieldPercent !== null;
      }

      if (selectedPercents.length === 0) return true;
      if (fieldPercent === null) return false;
      return selectedPercents.some((percent) => fieldPercent >= percent);
    });
  }

  return result;
}

export type ProductsPageTitleInput = {
  vista: string | null;
  campana: string;
  promocion: string;
  coleccion: string;
  linea: string;
  tipo: string;
  estilo: string;
  segmento: string;
  marcaSlug: string;
  categoria: string;
  trimmedQuery: string;
};

function catalogLineTipoEstiloTitle(segment: string, categoria: string): string {
  const base = humanizeSlug(segment);
  if (categoria === "todos") return base;
  return `${base} ${categoryLabel(categoria)}`.trim();
}

function tryResolveLineTipoEstiloTitle(input: ProductsPageTitleInput): string | null {
  if (input.linea) return catalogLineTipoEstiloTitle(input.linea, input.categoria);
  if (input.tipo) return catalogLineTipoEstiloTitle(input.tipo, input.categoria);
  if (input.estilo) return catalogLineTipoEstiloTitle(input.estilo, input.categoria);
  return null;
}

export function resolveProductsPageTitle(input: ProductsPageTitleInput): string {
  if (input.vista === "marcas") return "Marcas seleccionadas";
  if (input.campana) return `Campaña ${humanizeSlug(input.campana)}`;
  if (input.promocion) return `Selección ${humanizeSlug(input.promocion)}`;
  if (input.coleccion) return humanizeSlug(input.coleccion);
  const lineTipoEstilo = tryResolveLineTipoEstiloTitle(input);
  if (lineTipoEstilo) return lineTipoEstilo;
  if (input.segmento) return humanizeSlug(input.segmento);
  if (input.marcaSlug) return `Marca ${humanizeSlug(input.marcaSlug)}`;
  if (input.categoria !== "todos") return `Calzado ${categoryLabel(input.categoria)}`;
  if (input.trimmedQuery) return `Resultados para "${input.trimmedQuery}"`;
  return "Todos los productos";
}

export type ContextualFiltersInput = {
  vista: string | null;
  campana: string;
  categoria: string;
  coleccion: string;
  tipo: string;
  linea: string;
  segmento: string;
  color: string;
  descuento: string;
  rangoEdad: string;
  marcas: { label: string; value: string }[];
};

type CatalogFilterMaker = (title: string, items: CatalogQuickFilter[]) => CatalogFilterGroup;

function tryContextualMarcas(input: ContextualFiltersInput, make: CatalogFilterMaker): CatalogFilterGroup | null {
  if (input.vista !== "marcas") return null;
  return make("Marcas", [
    { label: "Todas", params: { vista: "marcas" } },
    ...input.marcas.map((brand) => ({
      label: brand.label,
      params: { vista: "marcas", marcaSlug: brand.value },
    })),
  ]);
}

function tryContextualCyberLineaZapatillas(
  input: ContextualFiltersInput,
  make: CatalogFilterMaker,
  cyberDesc: string
): CatalogFilterGroup | null {
  if (input.campana !== "cyber" || input.linea !== "zapatillas") return null;
  return make("Cyber Zapatillas", [
    { label: "Todos", params: { linea: "zapatillas", campana: "cyber", descuento: cyberDesc } },
    {
      label: "Mujer",
      params: { categoria: "mujer", tipo: "zapatillas", campana: "cyber", descuento: cyberDesc },
    },
    {
      label: "Hombre",
      params: { categoria: "hombre", tipo: "zapatillas", campana: "cyber", descuento: cyberDesc },
    },
    {
      label: "Ni\u00f1os",
      params: { categoria: "nino", tipo: "zapatillas", campana: "cyber", descuento: cyberDesc },
    },
  ]);
}

function tryContextualCyberHombre(
  input: ContextualFiltersInput,
  make: CatalogFilterMaker,
  cyberDesc: string
): CatalogFilterGroup | null {
  if (input.campana !== "cyber" || input.categoria !== "hombre") return null;
  return make("Cyber Hombre", [
    { label: "Todos", params: { categoria: "hombre", campana: "cyber", descuento: cyberDesc } },
    {
      label: "Zapatillas Cyber",
      params: { categoria: "hombre", campana: "cyber", tipo: "zapatillas", descuento: cyberDesc },
    },
    {
      label: "Zapatos Cyber",
      params: { categoria: "hombre", campana: "cyber", tipo: "zapatos", descuento: cyberDesc },
    },
    {
      label: "Botines Cyber",
      params: { categoria: "hombre", campana: "cyber", tipo: "botines", descuento: cyberDesc },
    },
  ]);
}

function tryContextualCyberMujer(
  input: ContextualFiltersInput,
  make: CatalogFilterMaker,
  cyberDesc: string
): CatalogFilterGroup | null {
  if (input.campana !== "cyber" || input.categoria !== "mujer") return null;
  return make("Cyber Mujer", [
    { label: "Todos", params: { categoria: "mujer", campana: "cyber", descuento: cyberDesc } },
    {
      label: "Zapatillas Cyber",
      params: { categoria: "mujer", campana: "cyber", tipo: "zapatillas", descuento: cyberDesc },
    },
    {
      label: "Sandalias Cyber",
      params: { categoria: "mujer", campana: "cyber", tipo: "sandalias", descuento: cyberDesc },
    },
    {
      label: "Botines Cyber",
      params: { categoria: "mujer", campana: "cyber", tipo: "botines", descuento: cyberDesc },
    },
  ]);
}

function tryContextualCyberNino(
  input: ContextualFiltersInput,
  make: CatalogFilterMaker,
  cyberDesc: string
): CatalogFilterGroup | null {
  if (input.campana !== "cyber" || input.categoria !== "nino") return null;
  return make("Cyber Infantil", [
    { label: "Todos", params: { categoria: "nino", campana: "cyber", descuento: cyberDesc } },
    {
      label: "Escolar Cyber",
      params: { categoria: "nino", campana: "cyber", tipo: "escolar", descuento: cyberDesc },
    },
    {
      label: "Juvenil Activo",
      params: { categoria: "nino", campana: "cyber", segmento: "juvenil", descuento: cyberDesc },
    },
    {
      label: "Zapatillas Cyber",
      params: { categoria: "nino", campana: "cyber", tipo: "zapatillas", descuento: cyberDesc },
    },
  ]);
}

function tryContextualNuevasMujer(input: ContextualFiltersInput, make: CatalogFilterMaker): CatalogFilterGroup | null {
  if (
    input.categoria !== "mujer" ||
    !(
      input.campana === "nueva-temporada" ||
      ["pasos-radiantes", "urban-glow", "sunset-chic"].includes(input.coleccion)
    )
  ) {
    return null;
  }
  return make("Nuevas tendencias", [
    { label: "Nueva temporada", params: { categoria: "mujer", campana: "nueva-temporada" } },
    { label: "Pasos radiantes", params: { categoria: "mujer", coleccion: "pasos-radiantes" } },
    { label: "Urban glow", params: { categoria: "mujer", coleccion: "urban-glow" } },
    { label: "Sunset chic", params: { categoria: "mujer", coleccion: "sunset-chic" } },
  ]);
}

function tryContextualNuevasHombre(input: ContextualFiltersInput, make: CatalogFilterMaker): CatalogFilterGroup | null {
  if (
    input.categoria !== "hombre" ||
    !(
      input.campana === "nueva-temporada" ||
      ["ruta-urbana", "paso-ejecutivo", "weekend-flow"].includes(input.coleccion)
    )
  ) {
    return null;
  }
  return make("Nuevas tendencias", [
    { label: "Nueva temporada", params: { categoria: "hombre", campana: "nueva-temporada" } },
    { label: "Ruta urbana", params: { categoria: "hombre", coleccion: "ruta-urbana" } },
    { label: "Paso ejecutivo", params: { categoria: "hombre", coleccion: "paso-ejecutivo" } },
    { label: "Weekend flow", params: { categoria: "hombre", coleccion: "weekend-flow" } },
  ]);
}

function tryContextualNuevasNino(input: ContextualFiltersInput, make: CatalogFilterMaker): CatalogFilterGroup | null {
  if (
    input.categoria !== "nino" ||
    !(input.campana === "nueva-temporada" || ["vuelta-al-cole", "mini-aventuras"].includes(input.coleccion))
  ) {
    return null;
  }
  return make("Nuevas tendencias", [
    { label: "Nueva temporada", params: { categoria: "nino", campana: "nueva-temporada" } },
    { label: "Vuelta al cole", params: { categoria: "nino", coleccion: "vuelta-al-cole" } },
    { label: "Paso activo", params: { categoria: "nino", tipo: "zapatillas" } },
    { label: "Mini aventuras", params: { categoria: "nino", coleccion: "mini-aventuras" } },
  ]);
}

function tryContextualZapatillasCategoria(input: ContextualFiltersInput, make: CatalogFilterMaker): CatalogFilterGroup | null {
  const cat = input.categoria;
  if ((cat !== "mujer" && cat !== "hombre") || input.tipo !== "zapatillas") return null;
  const title = cat === "mujer" ? "Zapatillas mujer" : "Zapatillas hombre";
  return make(title, [
    { label: "Todos", params: { categoria: cat, tipo: "zapatillas" } },
    { label: "Urbanas", params: { categoria: cat, tipo: "zapatillas", estilo: "urbanas" } },
    { label: "Deportivas", params: { categoria: cat, tipo: "zapatillas", estilo: "deportivas" } },
    { label: "Casuales", params: { categoria: cat, tipo: "zapatillas", estilo: "casuales" } },
    { label: "Outdoor", params: { categoria: cat, tipo: "zapatillas", estilo: "outdoor" } },
  ]);
}

function tryContextualZapatillasBlancas(input: ContextualFiltersInput, make: CatalogFilterMaker): CatalogFilterGroup | null {
  if (input.color !== "blanco" || (input.linea !== "zapatillas" && input.tipo !== "zapatillas")) return null;
  return make("Zapatillas blancas", [
    { label: "Todos", params: { linea: "zapatillas", color: "blanco" } },
    { label: "Mujer", params: { categoria: "mujer", tipo: "zapatillas", color: "blanco" } },
    { label: "Hombre", params: { categoria: "hombre", tipo: "zapatillas", color: "blanco" } },
    { label: "Ni\u00f1os", params: { categoria: "nino", tipo: "zapatillas", color: "blanco" } },
    { label: "Juvenil", params: { categoria: "nino", segmento: "juvenil", tipo: "zapatillas", color: "blanco" } },
  ]);
}

function tryContextualNinas(input: ContextualFiltersInput, make: CatalogFilterMaker): CatalogFilterGroup | null {
  if (input.categoria !== "nino" || input.segmento !== "ninas") return null;
  return make("Ni\u00f1as", [
    { label: "Todos", params: { categoria: "nino", segmento: "ninas" } },
    { label: "Escolar", params: { categoria: "nino", segmento: "ninas", tipo: "escolar" } },
    { label: "Zapatillas", params: { categoria: "nino", segmento: "ninas", tipo: "zapatillas" } },
    { label: "Ballerinas", params: { categoria: "nino", segmento: "ninas", tipo: "ballerinas" } },
    { label: "Botas y botines", params: { categoria: "nino", segmento: "ninas", tipo: "botas" } },
    { label: "Sandalias", params: { categoria: "nino", segmento: "ninas", tipo: "sandalias" } },
    { label: "Zapatos", params: { categoria: "nino", segmento: "ninas", tipo: "zapatos" } },
  ]);
}

function tryContextualNinos(input: ContextualFiltersInput, make: CatalogFilterMaker): CatalogFilterGroup | null {
  if (
    input.categoria !== "nino" ||
    !(input.segmento === "ninos" || input.segmento === "junior" || input.rangoEdad)
  ) {
    return null;
  }
  return make("Ni\u00f1os", [
    { label: "Todos", params: { categoria: "nino", segmento: "ninos" } },
    { label: "Infantil 1-3", params: { categoria: "nino", rangoEdad: "1-3" } },
    { label: "Niños 4-6", params: { categoria: "nino", segmento: "ninos" } },
    { label: "Junior 7-10", params: { categoria: "nino", segmento: "junior" } },
    { label: "Zapatos", params: { categoria: "nino", tipo: "zapatos" } },
    { label: "Zapatillas", params: { categoria: "nino", tipo: "zapatillas" } },
  ]);
}

function tryContextualCalzadoMujer(input: ContextualFiltersInput, make: CatalogFilterMaker): CatalogFilterGroup | null {
  if (input.categoria !== "mujer") return null;
  return make("Calzado mujer", [
    { label: "Todos", params: { categoria: "mujer" } },
    { label: "Zapatillas", params: { categoria: "mujer", tipo: "zapatillas" } },
    { label: "Sandalias", params: { categoria: "mujer", tipo: "sandalias" } },
    { label: "Casual", params: { categoria: "mujer", tipo: "casual" } },
    { label: "Vestir", params: { categoria: "mujer", tipo: "formal" } },
    { label: "Mocasines", params: { categoria: "mujer", tipo: "mocasines" } },
    { label: "Botas", params: { categoria: "mujer", tipo: "botas" } },
  ]);
}

function tryContextualCalzadoHombre(input: ContextualFiltersInput, make: CatalogFilterMaker): CatalogFilterGroup | null {
  if (input.categoria !== "hombre") return null;
  return make("Calzado hombre", [
    { label: "Todos", params: { categoria: "hombre" } },
    { label: "Zapatillas", params: { categoria: "hombre", tipo: "zapatillas" } },
    { label: "Vestir", params: { categoria: "hombre", tipo: "formal" } },
    { label: "Casual", params: { categoria: "hombre", tipo: "casual" } },
    { label: "Sandalias", params: { categoria: "hombre", tipo: "sandalias" } },
    { label: "Botines", params: { categoria: "hombre", tipo: "botines" } },
    { label: "Seguridad", params: { categoria: "hombre", tipo: "seguridad" } },
  ]);
}

function tryContextualInfantil(input: ContextualFiltersInput, make: CatalogFilterMaker): CatalogFilterGroup | null {
  if (input.categoria !== "nino") return null;
  return make("Infantil", [
    { label: "Todos", params: { categoria: "nino" } },
    { label: "Escolar", params: { categoria: "nino", tipo: "escolar" } },
    { label: "Sandalias", params: { categoria: "nino", tipo: "sandalias" } },
    { label: "Zapatillas", params: { categoria: "nino", tipo: "zapatillas" } },
    { label: "Ni\u00f1os", params: { categoria: "nino", segmento: "ninos" } },
    { label: "Ni\u00f1as", params: { categoria: "nino", segmento: "ninas" } },
  ]);
}

function contextualDefaultCategoria(make: CatalogFilterMaker): CatalogFilterGroup {
  return make("Categoría", [
    { label: "Todos", params: {} },
    { label: "Mujer", params: { categoria: "mujer" } },
    { label: "Hombre", params: { categoria: "hombre" } },
    { label: "Infantil", params: { categoria: "nino" } },
  ]);
}

export function buildContextualCatalogFilters(input: ContextualFiltersInput): CatalogFilterGroup {
  const make: CatalogFilterMaker = (title, items) => ({ title, items });
  const cyberDesc = input.descuento || CYBER_WOW_DEFAULT_DESCUENTO;
  return (
    tryContextualMarcas(input, make) ??
    tryContextualCyberLineaZapatillas(input, make, cyberDesc) ??
    tryContextualCyberHombre(input, make, cyberDesc) ??
    tryContextualCyberMujer(input, make, cyberDesc) ??
    tryContextualCyberNino(input, make, cyberDesc) ??
    tryContextualNuevasMujer(input, make) ??
    tryContextualNuevasHombre(input, make) ??
    tryContextualNuevasNino(input, make) ??
    tryContextualZapatillasCategoria(input, make) ??
    tryContextualZapatillasBlancas(input, make) ??
    tryContextualNinas(input, make) ??
    tryContextualNinos(input, make) ??
    tryContextualCalzadoMujer(input, make) ??
    tryContextualCalzadoHombre(input, make) ??
    tryContextualInfantil(input, make) ??
    contextualDefaultCategoria(make)
  );
}

export type CatalogBreadcrumbsInput = {
  vista: string | null;
  categoria: string;
  campana: string;
  coleccion: string;
  linea: string;
  tipo: string;
  estilo: string;
  segmento: string;
  rangoEdad: string;
  color: string;
  marca: string;
  marcaSlug: string;
  descuento: string;
  precio: string;
  talla: string;
  material: string;
};

export function buildCatalogBreadcrumbs(input: CatalogBreadcrumbsInput): CatalogBreadcrumb[] {
  const items: CatalogBreadcrumb[] = [];
  const {
    vista,
    categoria,
    campana,
    coleccion,
    linea,
    tipo,
    estilo,
    segmento,
    rangoEdad,
    color,
    marca,
    marcaSlug,
    descuento,
    precio,
    talla,
    material,
  } = input;

  const withRefinements = (params: Record<string, string | undefined>) => ({
    ...params,
    ...(descuento ? { descuento } : {}),
    ...(precio ? { precio } : {}),
    ...(talla ? { talla } : {}),
    ...(material ? { material } : {}),
  });

  const pushCrumb = (label: string, params: Record<string, string | undefined>) => {
    items.push({ label, params: withRefinements(params) });
  };

  const sectionParams: Record<string, string | undefined> = {};

  if (vista === "marcas") {
    sectionParams.vista = "marcas";
    pushCrumb("Marcas", { ...sectionParams });
  } else if (categoria !== "todos") {
    sectionParams.categoria = categoria;
    pushCrumb(categoryLabel(categoria), { ...sectionParams });
  }

  const ctx: Record<string, string | undefined> = { ...sectionParams };

  const opt = (v: string) => v || undefined;

  if (campana) {
    ctx.campana = campana;
    pushCrumb(humanizeSlug(campana), { ...ctx, ...(linea ? { linea } : {}) });
  }
  if (coleccion) {
    ctx.campana = opt(campana);
    ctx.coleccion = coleccion;
    pushCrumb(humanizeSlug(coleccion), { ...ctx });
  }
  if (linea) {
    ctx.campana = opt(campana);
    ctx.coleccion = opt(coleccion);
    ctx.linea = linea;
    pushCrumb(humanizeSlug(linea), { ...ctx });
  }
  if (tipo) {
    ctx.campana = opt(campana);
    ctx.coleccion = opt(coleccion);
    ctx.linea = opt(linea);
    ctx.tipo = tipo;
    pushCrumb(humanizeSlug(tipo), { ...ctx });
  }
  if (estilo) {
    ctx.campana = opt(campana);
    ctx.coleccion = opt(coleccion);
    ctx.linea = opt(linea);
    ctx.tipo = opt(tipo);
    ctx.estilo = estilo;
    pushCrumb(humanizeSlug(estilo), { ...ctx });
  }
  if (segmento) {
    ctx.campana = opt(campana);
    ctx.coleccion = opt(coleccion);
    ctx.linea = opt(linea);
    ctx.tipo = opt(tipo);
    ctx.segmento = segmento;
    pushCrumb(categoryLabel(segmento), { ...ctx });
  }
  if (rangoEdad) {
    ctx.campana = opt(campana);
    ctx.coleccion = opt(coleccion);
    ctx.linea = opt(linea);
    ctx.tipo = opt(tipo);
    ctx.segmento = opt(segmento);
    ctx.rangoEdad = rangoEdad;
    pushCrumb(`${rangoEdad} años`, { ...ctx });
  }
  if (color) {
    ctx.campana = opt(campana);
    ctx.coleccion = opt(coleccion);
    ctx.linea = opt(linea);
    ctx.tipo = opt(tipo);
    ctx.segmento = opt(segmento);
    ctx.color = color;
    pushCrumb(humanizeSlug(color), { ...ctx });
  }

  if (marca !== "todas") {
    pushCrumb(marca, { vista: "marcas", marca });
  }

  if (marcaSlug) {
    pushCrumb(humanizeSlug(marcaSlug), { vista: "marcas", marcaSlug });
  }

  return items;
}

export function filterParsedSizesForCatalogDraft(parsed: string[], catalogSizes: string[]): string[] {
  const allowed = new Set(catalogSizes);
  return parsed.filter((size) => allowed.has(size));
}

export function filterParsedColorsForCatalogDraft(parsed: string[], catalogColors: { value: string }[]): string[] {
  const allowed = new Set(catalogColors.map((c) => c.value));
  return parsed.filter((value) => allowed.has(value));
}

export function filterParsedMaterialsForCatalogDraft(
  parsed: string[],
  catalogMaterials: { value: string }[]
): string[] {
  const allowed = new Set(catalogMaterials.map((m) => m.value));
  return parsed.filter((value) => allowed.has(value));
}

export type ActiveCatalogFacetChip = {
  label: string;
  onClear: () => void;
};

export type ActiveCatalogFacetInput = {
  precio: string;
  talla: string;
  marcaSlug: string;
  color: string;
  material: string;
  descuento: string;
  categoria: string;
  vista: string | null;
  priceBoundsMin: number;
  priceBoundsMax: number;
};

function discountLabelForValue(value: string) {
  return DISCOUNT_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function joinOrUndefined(values: string[]) {
  return values.length ? values.join(",") : undefined;
}

export function buildActiveCatalogFacetChips(
  input: ActiveCatalogFacetInput,
  applyFacet: (patch: Record<string, string | undefined>) => void
): ActiveCatalogFacetChip[] {
  const out: ActiveCatalogFacetChip[] = [];
  const { precio, talla, marcaSlug, color, material, descuento, categoria, vista, priceBoundsMin, priceBoundsMax } =
    input;

  if (precio) {
    out.push({
      label: `Precio: ${getPriceLabel(precio, priceBoundsMin, priceBoundsMax)}`,
      onClear: () => applyFacet({ precio: undefined }),
    });
  }

  if (talla) {
    out.push({
      label: `Talla: ${parseSizeSelection(talla).join(", ")}`,
      onClear: () => applyFacet({ talla: undefined }),
    });
  }

  if (marcaSlug) {
    out.push({
      label: `Marca: ${humanizeSlug(marcaSlug)}`,
      onClear: () =>
        applyFacet({
          marcaSlug: undefined,
          vista: categoria === "todos" ? undefined : vista || undefined,
        }),
    });
  }

  const selectedColors = parseColorSelection(color);
  for (const selectedColor of selectedColors) {
    out.push({
      label: `Color: ${humanizeSlug(selectedColor)}`,
      onClear: () => {
        const next = selectedColors.filter((value) => value !== selectedColor);
        applyFacet({ color: joinOrUndefined(next) });
      },
    });
  }

  const selectedMaterials = parseMaterialSelection(material);
  for (const selectedMaterial of selectedMaterials) {
    out.push({
      label: `Material: ${humanizeSlug(selectedMaterial)}`,
      onClear: () => {
        const next = selectedMaterials.filter((value) => value !== selectedMaterial);
        applyFacet({ material: joinOrUndefined(next) });
      },
    });
  }

  const selectedDiscounts = parseDiscountSelection(descuento);
  for (const selectedDiscount of selectedDiscounts) {
    out.push({
      label: `Descuento: ${discountLabelForValue(selectedDiscount)}`,
      onClear: () => {
        const next = selectedDiscounts.filter((value) => value !== selectedDiscount);
        applyFacet({ descuento: joinOrUndefined(next) });
      },
    });
  }

  return out;
}

export function toggleCatalogStringListMember(current: string[], value: string, wasSelected: boolean): string[] {
  if (wasSelected) return current.filter((item) => item !== value);
  return [...current, value];
}
