import type { Product } from "../src/types";

/** Variantes de catálogo pueden traer `colores[]` aunque no esté en el tipo base. */
type CatalogProduct = Product & { colores?: string[] };

const CATEGORY_ALIASES: Record<string, string> = { mujer: "dama" };

export function normalizeSlug(value: string = "") {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function trimHyphens(s: string) {
  let i = 0;
  let j = s.length;
  while (i < j && s[i] === "-") i += 1;
  while (j > i && s[j - 1] === "-") j -= 1;
  return s.slice(i, j);
}

export function slugifyCatalogValue(value: string = "") {
  return trimHyphens(normalizeSlug(value).replace(/[^a-z0-9]+/g, "-"));
}

export function normalizeCategorySlug(category: string = "") {
  const normalized = normalizeSlug(category);
  return CATEGORY_ALIASES[normalized] ?? normalized;
}

export function capitalizeWords(value: string = "") {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/(^|\s)([a-záéíóúñ])/g, (_, space, letter) => `${space}${letter.toUpperCase()}`);
}

export function parseColorList(value: string = "") {
  const unique = new Map();
  value
    .split(",")
    .map(capitalizeWords)
    .filter(Boolean)
    .forEach((color) => {
      unique.set(color.toLowerCase(), color);
    });
  return Array.from(unique.values()).slice(0, 5);
}

export function getProductColors(product: CatalogProduct) {
  if (Array.isArray(product.colores) && product.colores.length > 0) {
    return product.colores.map(capitalizeWords).filter(Boolean).slice(0, 5);
  }
  return parseColorList(product.color ?? "");
}

const TAXONOMY_TERM_MAP = {
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
  linea: { zapatillas: ["zapatillas"] },
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

const taxonomyMap: Record<string, Record<string, string[]>> = TAXONOMY_TERM_MAP;

export function getTaxonomyTerms(key: string, value: string): string[] {
  const normalized = slugifyCatalogValue(value);
  const mapped = taxonomyMap[key]?.[normalized];
  if (mapped) return mapped;
  const fallback = normalized.replace(/-/g, " ").trim();
  return fallback ? [fallback] : [];
}

export function productMatchesCategory(productCategory: string, selectedCategory: string) {
  const normalizedSelected = normalizeCategorySlug(selectedCategory || "todos");
  if (normalizedSelected === "todos") return true;
  return normalizeCategorySlug(productCategory) === normalizedSelected;
}

export function productMatchesSearch(product: Product, searchTerm: string) {
  const query = normalizeSlug(searchTerm);
  if (!query) return true;

  if (
    ["destacado", "destacados", "oferta", "ofertas", "cyber", "nuevo", "nuevos", "tendencia", "tendencias"].includes(
      query,
    )
  ) {
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
  return normalizedTerms.some((term: string) => productMatchesSearch(product, term));
}

export function productMatchesBrandSlug(product: Product, brandSlug: string) {
  if (!brandSlug) return true;
  return slugifyCatalogValue(product.marca ?? "") === slugifyCatalogValue(brandSlug);
}

export function productMatchesColorTaxonomy(product: Product, value: string) {
  const normalized = slugifyCatalogValue(value);
  const colors = [product.color, ...getProductColors(product)]
    .filter((entry) => typeof entry === "string" && entry.trim().length > 0)
    .map(slugifyCatalogValue);
  return colors.some((color) => color.includes(normalized));
}

export function productMatchesTipoOrLineaTaxonomy(product: Product, value: string) {
  const normalized = slugifyCatalogValue(value);
  const tipoValue = slugifyCatalogValue(product.tipoCalzado ?? "");
  return tipoValue.includes(normalized);
}

export function productMatchesPromocionTaxonomy(product: Product, value: string) {
  if (value === "destacados") return Boolean(product.destacado) && product.stock > 0;
  if (value === "oferta") return (product.descuento ?? 0) > 0;
  return undefined;
}

export function productMatchesTaxonomy(product: Product, key: string, value: string) {
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

export function countProductsForCategory(products: Product[], category: string) {
  return products.filter((product: Product) => productMatchesCategory(product.categoria, category)).length;
}
