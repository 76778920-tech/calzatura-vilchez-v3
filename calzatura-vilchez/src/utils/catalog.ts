import type { Product } from "@/types";
import { getProductColors } from "@/utils/colors";

const CATEGORY_ALIASES: Record<string, string> = {
  mujer: "dama",
};

const PUBLIC_CATEGORY_ALIASES: Record<string, string> = {
  dama: "mujer",
};

function normalizeSlug(value = "") {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "");
}

function trimHyphens(s: string): string {
  let i = 0;
  let j = s.length;
  while (i < j && s[i] === "-") i++;
  while (j > i && s[j - 1] === "-") j--;
  return s.slice(i, j);
}

export function slugifyCatalogValue(value = "") {
  return trimHyphens(normalizeSlug(value).replaceAll(/[^a-z0-9]+/g, "-"));
}

export function normalizeCategorySlug(category = "") {
  const normalized = normalizeSlug(category);
  return CATEGORY_ALIASES[normalized] ?? normalized;
}

export function toPublicCategorySlug(category = "") {
  const normalized = normalizeCategorySlug(category);
  return PUBLIC_CATEGORY_ALIASES[normalized] ?? normalized;
}

export function productMatchesCategory(productCategory: string, selectedCategory: string) {
  const normalizedSelected = normalizeCategorySlug(selectedCategory || "todos");
  if (normalizedSelected === "todos") return true;
  return normalizeCategorySlug(productCategory) === normalizedSelected;
}

export function countProductsForCategory(products: Product[], category: string) {
  return products.filter((product) => productMatchesCategory(product.categoria, category)).length;
}

export function productMatchesSearch(product: Product, searchTerm: string) {
  const query = normalizeSlug(searchTerm);
  if (!query) return true;

  if (["destacado", "destacados", "oferta", "ofertas", "cyber", "nuevo", "nuevos", "tendencia", "tendencias"].includes(query)) {
    return Boolean(product.destacado) && product.stock > 0;
  }

  const searchableFields = [
    product.nombre,
    product.descripcion,
    product.marca,
    product.material,
    product.tipoCalzado,
    product.color,
    product.categoria,
    ...getProductColors(product),
  ];

  return searchableFields.some((value) => typeof value === "string" && value.toLowerCase().includes(query));
}

export function productMatchesAnySearch(product: Product, terms: string[]) {
  const normalizedTerms = terms.map(normalizeSlug).filter(Boolean);
  if (normalizedTerms.length === 0) return false;
  return normalizedTerms.some((term) => productMatchesSearch(product, term));
}

type TaxonomyKey =
  | "campana"
  | "coleccion"
  | "estilo"
  | "tipo"
  | "linea"
  | "segmento"
  | "color"
  | "promocion"
  | "rangoEdad";

const TAXONOMY_TERM_MAP: Record<TaxonomyKey, Record<string, string[]>> = {
  campana: {
    cyber: ["cyber"],
    "cyber-wow": ["cyber"],
    "nueva-temporada": ["nueva temporada", "nuevo", "nuevos"],
    lanzamiento: ["lanzamiento"],
    "club-calzado": ["club calzado"],
    outlet: ["outlet"],
  },
  coleccion: {
    "pasos-radiantes": ["pasos radiantes"],
    "urban-glow": ["urban glow"],
    "sunset-chic": ["sunset chic"],
    "ruta-urbana": ["ruta urbana", "urbano"],
    "paso-ejecutivo": ["paso ejecutivo", "formal", "vestir"],
    "weekend-flow": ["weekend flow", "casual"],
    "vuelta-al-cole": ["vuelta al cole", "escolar"],
    "mini-aventuras": ["mini aventuras", "infantil"],
  },
  estilo: {
    urbanas: ["urbanas", "urbano"],
    urban: ["urbanas", "urbano"],
    deportivas: ["deportivas", "deportivo"],
    casuales: ["casuales", "casual"],
    outdoor: ["outdoor"],
    ejecutivo: ["ejecutivo", "formal", "vestir"],
    weekend: ["casual"],
  },
  tipo: {
    zapatillas: ["zapatillas"],
    sandalias: ["sandalias"],
    botines: ["botines", "botas"],
    botas: ["botas", "botines"],
    mocasines: ["mocasines"],
    ballerinas: ["ballerinas"],
    pantuflas: ["pantuflas"],
    "flip-flops": ["flip flops"],
    zapatos: ["zapatos"],
    formal: ["formal", "vestir"],
    casual: ["casual", "casuales"],
    seguridad: ["seguridad"],
    escolar: ["escolar"],
    accesorios: ["accesorios"],
  },
  linea: {
    zapatillas: ["zapatillas"],
  },
  segmento: {
    ninos: ["ninos", "niños"],
    ninas: ["ninas", "niñas"],
    infantil: ["infantil"],
    junior: ["junior"],
    juvenil: ["juvenil", "junior"],
  },
  color: {
    blanco: ["blanco", "blanca", "blancas", "white"],
    negro: ["negro", "negra", "black"],
    beige: ["beige"],
    marron: ["marron", "marrón", "brown"],
    azul: ["azul", "blue"],
  },
  promocion: {
    destacados: ["destacado", "destacados"],
    oferta: ["oferta", "ofertas"],
  },
  rangoEdad: {
    "1-3": ["infantil", "1-3"],
    "4-6": ["ninos", "niños", "4-6"],
    "7-10": ["junior", "juvenil", "7-10"],
  },
};

function getTaxonomyTerms(key: TaxonomyKey, value: string) {
  const normalized = slugifyCatalogValue(value);
  const mapped = TAXONOMY_TERM_MAP[key][normalized];
  if (mapped) return mapped;
  const fallback = normalized.replaceAll("-", " ").trim();
  return fallback ? [fallback] : [];
}

export function productMatchesBrandSlug(product: Product, brandSlug: string) {
  if (!brandSlug) return true;
  return slugifyCatalogValue(product.marca ?? "") === slugifyCatalogValue(brandSlug);
}

function productMatchesColorTaxonomy(product: Product, value: string) {
  const normalized = slugifyCatalogValue(value);
  const colors = [product.color, ...getProductColors(product)]
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map(slugifyCatalogValue);
  return colors.some((color) => color.includes(normalized));
}

function productMatchesTipoOrLineaTaxonomy(product: Product, value: string) {
  const normalized = slugifyCatalogValue(value);
  const tipoValue = slugifyCatalogValue(product.tipoCalzado ?? "");
  return tipoValue.includes(normalized);
}

function productMatchesPromocionTaxonomy(product: Product, value: string): boolean | undefined {
  if (value === "destacados") return Boolean(product.destacado) && product.stock > 0;
  if (value === "oferta") return (product.descuento ?? 0) > 0;
  return undefined;
}

export function productMatchesTaxonomy(product: Product, key: TaxonomyKey, value: string) {
  if (!value.trim()) return true;

  if (key === "color") return productMatchesColorTaxonomy(product, value);
  if (key === "tipo" || key === "linea") {
    if (productMatchesTipoOrLineaTaxonomy(product, value)) return true;
  }
  if (key === "estilo" && product.estilo) {
    return slugifyCatalogValue(product.estilo).includes(slugifyCatalogValue(value));
  }
  if (key === "campana" && product.campana) {
    if (slugifyCatalogValue(product.campana) === slugifyCatalogValue(value)) return true;
  }
  if (key === "promocion") {
    const promo = productMatchesPromocionTaxonomy(product, value);
    if (promo !== undefined) return promo;
  }

  return productMatchesAnySearch(product, getTaxonomyTerms(key, value));
}

/** Facetas que pueden codificarse como segundo segmento de URL bajo una categoría. */
export type CatalogPathFacetKey = "tipo" | "linea" | "segmento" | "coleccion" | "estilo";

const PATH_FACET_ORDER: CatalogPathFacetKey[] = ["tipo", "linea", "segmento", "coleccion", "estilo"];

/**
 * Interpreta un slug de URL (p. ej. "zapatillas", "urban-glow") como faceta de catálogo.
 * Orden: tipo → línea → segmento → colección → estilo (primera coincidencia en taxonomía).
 */
export function resolvePathFacetSlug(slug: string): { key: CatalogPathFacetKey; value: string } | null {
  const normalized = slugifyCatalogValue(slug);
  if (!normalized) return null;
  for (const key of PATH_FACET_ORDER) {
    if (normalized in TAXONOMY_TERM_MAP[key]) {
      return { key, value: normalized };
    }
  }
  return null;
}
