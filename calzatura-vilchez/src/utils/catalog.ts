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
    .replace(/[\u0300-\u036f]/g, "");
}

export function slugifyCatalogValue(value = "") {
  return normalizeSlug(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
    "nueva-temporada": ["nueva temporada", "nuevo", "nuevos"],
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
  const fallback = normalized.replace(/-/g, " ").trim();
  return fallback ? [fallback] : [];
}

export function productMatchesBrandSlug(product: Product, brandSlug: string) {
  if (!brandSlug) return true;
  return slugifyCatalogValue(product.marca ?? "") === slugifyCatalogValue(brandSlug);
}

export function productMatchesTaxonomy(product: Product, key: TaxonomyKey, value: string) {
  if (!value.trim()) return true;

  if (key === "color") {
    const normalized = slugifyCatalogValue(value);
    const colors = [product.color, ...getProductColors(product)]
      .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      .map(slugifyCatalogValue);
    return colors.some((color) => color.includes(normalized));
  }

  if (key === "tipo" || key === "linea") {
    const normalized = slugifyCatalogValue(value);
    const tipoValue = slugifyCatalogValue(product.tipoCalzado ?? "");
    if (tipoValue.includes(normalized)) return true;
  }

  return productMatchesAnySearch(product, getTaxonomyTerms(key, value));
}
