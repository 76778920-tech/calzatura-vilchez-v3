import type { Product } from "../src/types";
import {
  slugifyCatalogValue,
  productMatchesCategory,
  productMatchesSearch,
  productMatchesBrandSlug,
  productMatchesTaxonomy,
  getProductColors,
} from "./catalogMatch";

export const MATERIAL_RULES = [
  { slug: "cuero", label: "Cuero", terms: ["cuero", "leather"] },
  { slug: "charol", label: "Charol", terms: ["charol", "patent"] },
  { slug: "nubuk", label: "Nubuk", terms: ["nubuk"] },
  { slug: "sintetico", label: "Sintético", terms: ["sintetico", "sintética", "synthetic"] },
  { slug: "textil", label: "Textil", terms: ["textil", "mesh", "tejido"] },
  { slug: "gamuza", label: "Gamuza", terms: ["gamuza", "suede"] },
  { slug: "lona", label: "Lona", terms: ["lona", "canvas"] },
];

export const MATERIAL_FILTER_ORDER = ["cuero", "gamuza", "charol", "nubuk", "sintetico", "textil"];

export function normalizeText(value: string = "") {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function inferProductMaterials(product: Product) {
  const haystack = normalizeText(
    [product.nombre, product.descripcion, product.tipoCalzado, product.color, product.marca]
      .filter(Boolean)
      .join(" "),
  );
  return MATERIAL_RULES.filter((rule) => rule.terms.some((term) => haystack.includes(normalizeText(term))));
}

export function getProductSizes(product: Product) {
  const fromTallas = Array.isArray(product.tallas) ? product.tallas : [];
  const fromStock = product.tallaStock ? Object.keys(product.tallaStock) : [];
  return Array.from(new Set([...fromTallas, ...fromStock].map((value) => value.trim()).filter(Boolean)));
}

export function parsePriceParts(value: string) {
  const [mode, rawFirst, rawSecond] = value.split(":");
  return { mode, first: Number(rawFirst), second: Number(rawSecond) };
}

export function matchesPriceBucket(price: number, bucket: string) {
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

export function parseCommaSeparatedTokens(value: string) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function inferProductDiscountPercent(product: Product) {
  return product.descuento ?? null;
}

export function buildRouteFilteredCatalogProducts(input: {
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
}) {
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
    { key: "campana", value: campana },
    { key: "promocion", value: promocion },
    { key: "coleccion", value: coleccion },
    { key: "tipo", value: tipo },
    { key: "linea", value: linea },
    { key: "estilo", value: estilo },
    { key: "segmento", value: segmento },
    { key: "rangoEdad", value: rangoEdad },
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

export function buildFacetFilteredCatalogProducts(
  routeFiltered: Product[],
  facets: {
    precio: string;
    talla: string;
    color: string;
    material: string;
    descuento: string;
  },
) {
  let result = [...routeFiltered];
  const { precio, talla, color, material, descuento } = facets;

  if (precio) {
    result = result.filter((product) => matchesPriceBucket(product.precio, precio));
  }

  if (talla) {
    const selectedSizes = parseCommaSeparatedTokens(talla);
    result = result.filter((product) => {
      const productSizes = getProductSizes(product);
      return selectedSizes.some((size) => productSizes.includes(size));
    });
  }

  if (color?.includes(",")) {
    const selectedColors = parseCommaSeparatedTokens(color);
    result = result.filter((product) => {
      const productColorSet = new Set(getProductColors(product).map((value: string) => slugifyCatalogValue(value)));
      return selectedColors.some((selected) => productColorSet.has(selected));
    });
  }

  if (material) {
    const selectedMaterials = parseCommaSeparatedTokens(material);
    result = result.filter((product) =>
      inferProductMaterials(product).some((rule) => selectedMaterials.includes(rule.slug)),
    );
  }

  if (descuento) {
    const selectedDiscounts = parseCommaSeparatedTokens(descuento);
    const hasAllDiscount = selectedDiscounts.includes("all");
    const selectedPercents = selectedDiscounts
      .filter((item) => item !== "all")
      .map(Number)
      .filter(Number.isFinite);

    result = result.filter((product) => {
      const fieldPercent = inferProductDiscountPercent(product);
      if (hasAllDiscount) return fieldPercent !== null;
      if (selectedPercents.length === 0) return true;
      if (fieldPercent === null) return false;
      return selectedPercents.some((percent) => fieldPercent >= percent);
    });
  }

  return result;
}

export function buildBrowseMeta(routeFiltered: Product[]) {
  const marcas = Array.from(
    new Set(
      routeFiltered
        .map((p) => p.marca?.trim())
        .filter((m): m is string => typeof m === "string" && m.length > 0),
    ),
  )
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ label: value, value: slugifyCatalogValue(value) }));

  const numericSizes = routeFiltered
    .flatMap((product) => getProductSizes(product))
    .map(Number)
    .filter(Number.isFinite);
  const availableSizes = Array.from(new Set(numericSizes))
    .sort((a, b) => a - b)
    .map(String);

  let priceBounds = { min: 0, max: 0, low: 0, high: 0 };
  if (routeFiltered.length > 0) {
    const prices = routeFiltered.map((p) => p.precio).filter(Number.isFinite);
    if (prices.length > 0) {
      const min = Math.floor(Math.min(...prices));
      const max = Math.ceil(Math.max(...prices));
      const low = Math.max(min, Math.round((min + (max - min) * 0.35) / 10) * 10);
      const high = Math.max(low + 10, Math.round((min + (max - min) * 0.68) / 10) * 10);
      priceBounds = { min, max, low, high: Math.min(high, max) };
    }
  }

  return { marcas, availableSizes, priceBounds };
}

export function parseBrowseQuery(query: Record<string, string>) {
  const str = (key: string) => String(query[key] ?? "").trim();
  return {
    categoria: str("categoria") || "todos",
    vista: str("vista") || null,
    marca: str("marca") || "todas",
    marcaSlug: str("marcaSlug"),
    campana: str("campana"),
    promocion: str("promocion"),
    coleccion: str("coleccion"),
    tipo: str("tipo"),
    linea: str("linea"),
    estilo: str("estilo"),
    segmento: str("segmento"),
    rangoEdad: str("rangoEdad"),
    color: str("color"),
    buscar: str("buscar"),
    precio: str("precio"),
    talla: str("talla"),
    material: str("material"),
    descuento: str("descuento"),
  };
}

export function browseCatalogProducts(
  allProducts: Product[],
  query: Record<string, string>,
  page: number,
  limit: number,
) {
  const filters = parseBrowseQuery(query);
  const routeFiltered = buildRouteFilteredCatalogProducts({
    products: allProducts,
    categoria: filters.categoria,
    vista: filters.vista,
    marca: filters.marca,
    marcaSlug: filters.marcaSlug,
    campana: filters.campana,
    promocion: filters.promocion,
    coleccion: filters.coleccion,
    tipo: filters.tipo,
    linea: filters.linea,
    estilo: filters.estilo,
    segmento: filters.segmento,
    rangoEdad: filters.rangoEdad,
    color: filters.color,
    trimmedQuery: filters.buscar,
  });

  const filtered = buildFacetFilteredCatalogProducts(routeFiltered, {
    precio: filters.precio,
    talla: filters.talla,
    color: filters.color,
    material: filters.material,
    descuento: filters.descuento,
  });

  const total = filtered.length;
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
  const from = (page - 1) * limit;
  const products = filtered.slice(from, from + limit);

  return {
    products,
    page,
    limit,
    total,
    totalPages,
    meta: buildBrowseMeta(routeFiltered),
  };
}
