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

export function getPriceLabel(value: string, min: number, max: number) {
  if (!value) return "";
  const [mode, rawFirst, rawSecond] = value.split(":");
  const first = Number(rawFirst);
  const second = Number(rawSecond);

  if (mode === "under" && Number.isFinite(first)) return `Hasta S/ ${first}`;
  if (mode === "between" && Number.isFinite(first) && Number.isFinite(second)) return `S/ ${first} - ${second}`;
  if (mode === "over" && Number.isFinite(first)) return `Desde S/ ${first}`;
  if (mode === "range" && Number.isFinite(first) && Number.isFinite(second)) return `S/ ${first} - ${second}`;
  return min === max ? `S/ ${min}` : "";
}

function matchesPriceBucket(price: number, bucket: string) {
  if (!bucket) return true;
  const [mode, rawFirst, rawSecond] = bucket.split(":");
  const first = Number(rawFirst);
  const second = Number(rawSecond);

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
  const [mode, rawFirst, rawSecond] = value.split(":");

  if (mode === "range") {
    const first = Number(rawFirst);
    const second = Number(rawSecond);
    if (Number.isFinite(first) && Number.isFinite(second)) {
      return {
        min: Math.min(first, second),
        max: Math.max(first, second),
      };
    }
  }

  return {
    min: fallbackMin,
    max: fallbackMax,
  };
}

export function parseSizeSelection(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseColorSelection(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseMaterialSelection(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseDiscountSelection(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

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

  if (campana) {
    result = result.filter((product) => productMatchesTaxonomy(product, "campana", campana));
  }

  if (promocion) {
    result = result.filter((product) => productMatchesTaxonomy(product, "promocion", promocion));
  }

  if (coleccion) {
    result = result.filter((product) => productMatchesTaxonomy(product, "coleccion", coleccion));
  }

  if (tipo) {
    result = result.filter((product) => productMatchesTaxonomy(product, "tipo", tipo));
  }

  if (linea) {
    result = result.filter((product) => productMatchesTaxonomy(product, "linea", linea));
  }

  if (estilo) {
    result = result.filter((product) => productMatchesTaxonomy(product, "estilo", estilo));
  }

  if (segmento) {
    result = result.filter((product) => productMatchesTaxonomy(product, "segmento", segmento));
  }

  if (rangoEdad) {
    result = result.filter((product) => productMatchesTaxonomy(product, "rangoEdad", rangoEdad));
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

  if (color && color.includes(",")) {
    const selectedColors = parseColorSelection(color);
    result = result.filter((product) => {
      const productColors = getProductColors(product).map((value) => slugifyCatalogValue(value));
      return selectedColors.some((selected) => productColors.includes(selected));
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
      .map((item) => Number(item))
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

export function resolveProductsPageTitle(input: ProductsPageTitleInput): string {
  const { vista, campana, promocion, coleccion, linea, tipo, estilo, segmento, marcaSlug, categoria, trimmedQuery } =
    input;

  if (vista === "marcas") return "Marcas seleccionadas";
  if (campana) return `Campaña ${humanizeSlug(campana)}`;
  if (promocion) return `Selección ${humanizeSlug(promocion)}`;
  if (coleccion) return humanizeSlug(coleccion);
  if (linea) return `${humanizeSlug(linea)}${categoria !== "todos" ? ` ${categoryLabel(categoria)}` : ""}`.trim();
  if (tipo) return `${humanizeSlug(tipo)}${categoria !== "todos" ? ` ${categoryLabel(categoria)}` : ""}`.trim();
  if (estilo) return `${humanizeSlug(estilo)}${categoria !== "todos" ? ` ${categoryLabel(categoria)}` : ""}`.trim();
  if (segmento) return humanizeSlug(segmento);
  if (marcaSlug) return `Marca ${humanizeSlug(marcaSlug)}`;
  if (categoria !== "todos") return `Calzado ${categoryLabel(categoria)}`;
  if (trimmedQuery) return `Resultados para "${trimmedQuery}"`;
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

export function buildContextualCatalogFilters(input: ContextualFiltersInput): CatalogFilterGroup {
  const make = (title: string, items: CatalogQuickFilter[]) => ({ title, items });
  const {
    vista,
    campana,
    categoria,
    coleccion,
    tipo,
    linea,
    segmento,
    color,
    descuento,
    rangoEdad,
    marcas,
  } = input;
  const cyberDesc = descuento || CYBER_WOW_DEFAULT_DESCUENTO;

  if (vista === "marcas") {
    return make("Marcas", [
      { label: "Todas", params: { vista: "marcas" } },
      ...marcas.map((brand) => ({
        label: brand.label,
        params: { vista: "marcas", marcaSlug: brand.value },
      })),
    ]);
  }

  if (campana === "cyber" && linea === "zapatillas") {
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

  if (campana === "cyber" && categoria === "hombre") {
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

  if (campana === "cyber" && categoria === "mujer") {
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

  if (campana === "cyber" && categoria === "nino") {
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

  if (
    categoria === "mujer" &&
    (campana === "nueva-temporada" || ["pasos-radiantes", "urban-glow", "sunset-chic"].includes(coleccion))
  ) {
    return make("Nuevas tendencias", [
      { label: "Nueva temporada", params: { categoria: "mujer", campana: "nueva-temporada" } },
      { label: "Pasos radiantes", params: { categoria: "mujer", coleccion: "pasos-radiantes" } },
      { label: "Urban glow", params: { categoria: "mujer", coleccion: "urban-glow" } },
      { label: "Sunset chic", params: { categoria: "mujer", coleccion: "sunset-chic" } },
    ]);
  }

  if (
    categoria === "hombre" &&
    (campana === "nueva-temporada" || ["ruta-urbana", "paso-ejecutivo", "weekend-flow"].includes(coleccion))
  ) {
    return make("Nuevas tendencias", [
      { label: "Nueva temporada", params: { categoria: "hombre", campana: "nueva-temporada" } },
      { label: "Ruta urbana", params: { categoria: "hombre", coleccion: "ruta-urbana" } },
      { label: "Paso ejecutivo", params: { categoria: "hombre", coleccion: "paso-ejecutivo" } },
      { label: "Weekend flow", params: { categoria: "hombre", coleccion: "weekend-flow" } },
    ]);
  }

  if (categoria === "nino" && (campana === "nueva-temporada" || ["vuelta-al-cole", "mini-aventuras"].includes(coleccion))) {
    return make("Nuevas tendencias", [
      { label: "Nueva temporada", params: { categoria: "nino", campana: "nueva-temporada" } },
      { label: "Vuelta al cole", params: { categoria: "nino", coleccion: "vuelta-al-cole" } },
      { label: "Paso activo", params: { categoria: "nino", tipo: "zapatillas" } },
      { label: "Mini aventuras", params: { categoria: "nino", coleccion: "mini-aventuras" } },
    ]);
  }

  if (categoria === "mujer" && tipo === "zapatillas") {
    return make("Zapatillas mujer", [
      { label: "Todos", params: { categoria: "mujer", tipo: "zapatillas" } },
      { label: "Urbanas", params: { categoria: "mujer", tipo: "zapatillas", estilo: "urbanas" } },
      { label: "Deportivas", params: { categoria: "mujer", tipo: "zapatillas", estilo: "deportivas" } },
      { label: "Casuales", params: { categoria: "mujer", tipo: "zapatillas", estilo: "casuales" } },
      { label: "Outdoor", params: { categoria: "mujer", tipo: "zapatillas", estilo: "outdoor" } },
    ]);
  }

  if (categoria === "hombre" && tipo === "zapatillas") {
    return make("Zapatillas hombre", [
      { label: "Todos", params: { categoria: "hombre", tipo: "zapatillas" } },
      { label: "Urbanas", params: { categoria: "hombre", tipo: "zapatillas", estilo: "urbanas" } },
      { label: "Deportivas", params: { categoria: "hombre", tipo: "zapatillas", estilo: "deportivas" } },
      { label: "Casuales", params: { categoria: "hombre", tipo: "zapatillas", estilo: "casuales" } },
      { label: "Outdoor", params: { categoria: "hombre", tipo: "zapatillas", estilo: "outdoor" } },
    ]);
  }

  if ((linea === "zapatillas" || tipo === "zapatillas") && color === "blanco") {
    return make("Zapatillas blancas", [
      { label: "Todos", params: { linea: "zapatillas", color: "blanco" } },
      { label: "Mujer", params: { categoria: "mujer", tipo: "zapatillas", color: "blanco" } },
      { label: "Hombre", params: { categoria: "hombre", tipo: "zapatillas", color: "blanco" } },
      { label: "Ni\u00f1os", params: { categoria: "nino", tipo: "zapatillas", color: "blanco" } },
      { label: "Juvenil", params: { categoria: "nino", segmento: "juvenil", tipo: "zapatillas", color: "blanco" } },
    ]);
  }

  if (categoria === "nino" && segmento === "ninas") {
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

  if (categoria === "nino" && (segmento === "ninos" || segmento === "junior" || rangoEdad)) {
    return make("Ni\u00f1os", [
      { label: "Todos", params: { categoria: "nino", segmento: "ninos" } },
      { label: "Infantil 1-3", params: { categoria: "nino", rangoEdad: "1-3" } },
      { label: "Niños 4-6", params: { categoria: "nino", segmento: "ninos" } },
      { label: "Junior 7-10", params: { categoria: "nino", segmento: "junior" } },
      { label: "Zapatos", params: { categoria: "nino", tipo: "zapatos" } },
      { label: "Zapatillas", params: { categoria: "nino", tipo: "zapatillas" } },
    ]);
  }

  if (categoria === "mujer") {
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

  if (categoria === "hombre") {
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

  if (categoria === "nino") {
    return make("Infantil", [
      { label: "Todos", params: { categoria: "nino" } },
      { label: "Escolar", params: { categoria: "nino", tipo: "escolar" } },
      { label: "Sandalias", params: { categoria: "nino", tipo: "sandalias" } },
      { label: "Zapatillas", params: { categoria: "nino", tipo: "zapatillas" } },
      { label: "Ni\u00f1os", params: { categoria: "nino", segmento: "ninos" } },
      { label: "Ni\u00f1as", params: { categoria: "nino", segmento: "ninas" } },
    ]);
  }

  return make("Categoría", [
    { label: "Todos", params: {} },
    { label: "Mujer", params: { categoria: "mujer" } },
    { label: "Hombre", params: { categoria: "hombre" } },
    { label: "Infantil", params: { categoria: "nino" } },
  ]);
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

  if (campana) {
    const params: Record<string, string | undefined> = { ...sectionParams, campana };
    if (linea) params.linea = linea;
    pushCrumb(humanizeSlug(campana), params);
  }

  if (coleccion) {
    pushCrumb(humanizeSlug(coleccion), {
      ...sectionParams,
      campana: campana || undefined,
      coleccion,
    });
  }

  if (linea) {
    pushCrumb(humanizeSlug(linea), {
      ...sectionParams,
      campana: campana || undefined,
      coleccion: coleccion || undefined,
      linea,
    });
  }

  if (tipo) {
    pushCrumb(humanizeSlug(tipo), {
      ...sectionParams,
      campana: campana || undefined,
      coleccion: coleccion || undefined,
      linea: linea || undefined,
      tipo,
    });
  }

  if (estilo) {
    pushCrumb(humanizeSlug(estilo), {
      ...sectionParams,
      campana: campana || undefined,
      coleccion: coleccion || undefined,
      linea: linea || undefined,
      tipo: tipo || undefined,
      estilo,
    });
  }

  if (segmento) {
    pushCrumb(categoryLabel(segmento), {
      ...sectionParams,
      campana: campana || undefined,
      coleccion: coleccion || undefined,
      linea: linea || undefined,
      tipo: tipo || undefined,
      segmento,
    });
  }

  if (rangoEdad) {
    pushCrumb(`${rangoEdad} años`, {
      ...sectionParams,
      campana: campana || undefined,
      coleccion: coleccion || undefined,
      linea: linea || undefined,
      tipo: tipo || undefined,
      segmento: segmento || undefined,
      rangoEdad,
    });
  }

  if (color) {
    pushCrumb(humanizeSlug(color), {
      ...sectionParams,
      campana: campana || undefined,
      coleccion: coleccion || undefined,
      linea: linea || undefined,
      tipo: tipo || undefined,
      segmento: segmento || undefined,
      color,
    });
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
