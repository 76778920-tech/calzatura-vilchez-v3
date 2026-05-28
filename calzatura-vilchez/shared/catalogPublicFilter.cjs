var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// shared/catalogPublicFilter.ts
var catalogPublicFilter_exports = {};
__export(catalogPublicFilter_exports, {
  MATERIAL_FILTER_ORDER: () => MATERIAL_FILTER_ORDER,
  MATERIAL_RULES: () => MATERIAL_RULES,
  browseCatalogProducts: () => browseCatalogProducts,
  buildBrowseMeta: () => buildBrowseMeta,
  buildFacetFilteredCatalogProducts: () => buildFacetFilteredCatalogProducts,
  buildRouteFilteredCatalogProducts: () => buildRouteFilteredCatalogProducts,
  getProductSizes: () => getProductSizes,
  inferProductDiscountPercent: () => inferProductDiscountPercent,
  inferProductMaterials: () => inferProductMaterials,
  matchesPriceBucket: () => matchesPriceBucket,
  normalizeText: () => normalizeText,
  parseBrowseQuery: () => parseBrowseQuery,
  parseCommaSeparatedTokens: () => parseCommaSeparatedTokens,
  parsePriceParts: () => parsePriceParts
});
module.exports = __toCommonJS(catalogPublicFilter_exports);

// shared/catalogMatch.ts
var CATEGORY_ALIASES = { mujer: "dama" };
function normalizeSlug(value = "") {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function trimHyphens(s) {
  let i = 0;
  let j = s.length;
  while (i < j && s[i] === "-") i += 1;
  while (j > i && s[j - 1] === "-") j -= 1;
  return s.slice(i, j);
}
function slugifyCatalogValue(value = "") {
  return trimHyphens(normalizeSlug(value).replace(/[^a-z0-9]+/g, "-"));
}
function normalizeCategorySlug(category = "") {
  const normalized = normalizeSlug(category);
  return CATEGORY_ALIASES[normalized] ?? normalized;
}
function capitalizeWords(value = "") {
  return value.trim().toLowerCase().replace(/\s+/g, " ").replace(/(^|\s)([a-záéíóúñ])/g, (_, space, letter) => `${space}${letter.toUpperCase()}`);
}
function parseColorList(value = "") {
  const unique = /* @__PURE__ */ new Map();
  value.split(",").map(capitalizeWords).filter(Boolean).forEach((color) => {
    unique.set(color.toLowerCase(), color);
  });
  return Array.from(unique.values()).slice(0, 5);
}
function getProductColors(product) {
  if (Array.isArray(product.colores) && product.colores.length > 0) {
    return product.colores.map(capitalizeWords).filter(Boolean).slice(0, 5);
  }
  return parseColorList(product.color ?? "");
}
var TAXONOMY_TERM_MAP = {
  campana: {
    cyber: ["cyber"],
    "cyber-wow": ["cyber"],
    "nueva-temporada": ["nueva temporada", "nuevo", "nuevos"],
    lanzamiento: ["lanzamiento"],
    "club-calzado": ["club calzado"],
    outlet: ["outlet"]
  },
  coleccion: {
    "pasos-radiantes": ["pasos radiantes"],
    "urban-glow": ["urban glow"],
    "sunset-chic": ["sunset chic"],
    "ruta-urbana": ["ruta urbana", "urbano"],
    "paso-ejecutivo": ["paso ejecutivo", "formal", "vestir"],
    "weekend-flow": ["weekend flow", "casual"],
    "vuelta-al-cole": ["vuelta al cole", "escolar"],
    "mini-aventuras": ["mini aventuras", "infantil"]
  },
  estilo: {
    urbanas: ["urbanas", "urbano"],
    urban: ["urbanas", "urbano"],
    deportivas: ["deportivas", "deportivo"],
    casuales: ["casuales", "casual"],
    outdoor: ["outdoor"],
    ejecutivo: ["ejecutivo", "formal", "vestir"],
    weekend: ["casual"]
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
    accesorios: ["accesorios"]
  },
  linea: { zapatillas: ["zapatillas"] },
  segmento: {
    ninos: ["ninos", "ni\xF1os"],
    ninas: ["ninas", "ni\xF1as"],
    infantil: ["infantil"],
    junior: ["junior"],
    juvenil: ["juvenil", "junior"]
  },
  color: {
    blanco: ["blanco", "blanca", "blancas", "white"],
    negro: ["negro", "negra", "black"],
    beige: ["beige"],
    marron: ["marron", "marr\xF3n", "brown"],
    azul: ["azul", "blue"]
  },
  promocion: {
    destacados: ["destacado", "destacados"],
    oferta: ["oferta", "ofertas"]
  },
  rangoEdad: {
    "1-3": ["infantil", "1-3"],
    "4-6": ["ninos", "ni\xF1os", "4-6"],
    "7-10": ["junior", "juvenil", "7-10"]
  }
};
var taxonomyMap = TAXONOMY_TERM_MAP;
function getTaxonomyTerms(key, value) {
  const normalized = slugifyCatalogValue(value);
  const mapped = taxonomyMap[key]?.[normalized];
  if (mapped) return mapped;
  const fallback = normalized.replace(/-/g, " ").trim();
  return fallback ? [fallback] : [];
}
function productMatchesCategory(productCategory, selectedCategory) {
  const normalizedSelected = normalizeCategorySlug(selectedCategory || "todos");
  if (normalizedSelected === "todos") return true;
  return normalizeCategorySlug(productCategory) === normalizedSelected;
}
function productMatchesSearch(product, searchTerm) {
  const query = normalizeSlug(searchTerm);
  if (!query) return true;
  if (["destacado", "destacados", "oferta", "ofertas", "cyber", "nuevo", "nuevos", "tendencia", "tendencias"].includes(
    query
  )) {
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
    ...getProductColors(product)
  ];
  return searchableFields.some((value) => typeof value === "string" && value.toLowerCase().includes(query));
}
function productMatchesAnySearch(product, terms) {
  const normalizedTerms = terms.map(normalizeSlug).filter(Boolean);
  if (normalizedTerms.length === 0) return false;
  return normalizedTerms.some((term) => productMatchesSearch(product, term));
}
function productMatchesBrandSlug(product, brandSlug) {
  if (!brandSlug) return true;
  return slugifyCatalogValue(product.marca ?? "") === slugifyCatalogValue(brandSlug);
}
function productMatchesColorTaxonomy(product, value) {
  const normalized = slugifyCatalogValue(value);
  const colors = [product.color, ...getProductColors(product)].filter((entry) => typeof entry === "string" && entry.trim().length > 0).map(slugifyCatalogValue);
  return colors.some((color) => color.includes(normalized));
}
function productMatchesTipoOrLineaTaxonomy(product, value) {
  const normalized = slugifyCatalogValue(value);
  const tipoValue = slugifyCatalogValue(product.tipoCalzado ?? "");
  return tipoValue.includes(normalized);
}
function productMatchesPromocionTaxonomy(product, value) {
  if (value === "destacados") return Boolean(product.destacado) && product.stock > 0;
  if (value === "oferta") return (product.descuento ?? 0) > 0;
  return void 0;
}
function productMatchesTaxonomy(product, key, value) {
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
    if (promo !== void 0) return promo;
  }
  return productMatchesAnySearch(product, getTaxonomyTerms(key, value));
}

// shared/catalogPublicFilter.ts
var MATERIAL_RULES = [
  { slug: "cuero", label: "Cuero", terms: ["cuero", "leather"] },
  { slug: "charol", label: "Charol", terms: ["charol", "patent"] },
  { slug: "nubuk", label: "Nubuk", terms: ["nubuk"] },
  { slug: "sintetico", label: "Sint\xE9tico", terms: ["sintetico", "sint\xE9tica", "synthetic"] },
  { slug: "textil", label: "Textil", terms: ["textil", "mesh", "tejido"] },
  { slug: "gamuza", label: "Gamuza", terms: ["gamuza", "suede"] },
  { slug: "lona", label: "Lona", terms: ["lona", "canvas"] }
];
var MATERIAL_FILTER_ORDER = ["cuero", "gamuza", "charol", "nubuk", "sintetico", "textil"];
function normalizeText(value = "") {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function inferProductMaterials(product) {
  const haystack = normalizeText(
    [product.nombre, product.descripcion, product.tipoCalzado, product.color, product.marca].filter(Boolean).join(" ")
  );
  return MATERIAL_RULES.filter((rule) => rule.terms.some((term) => haystack.includes(normalizeText(term))));
}
function getProductSizes(product) {
  const fromTallas = Array.isArray(product.tallas) ? product.tallas : [];
  const fromStock = product.tallaStock ? Object.keys(product.tallaStock) : [];
  return Array.from(new Set([...fromTallas, ...fromStock].map((value) => value.trim()).filter(Boolean)));
}
function parsePriceParts(value) {
  const [mode, rawFirst, rawSecond] = value.split(":");
  return { mode, first: Number(rawFirst), second: Number(rawSecond) };
}
function matchesPriceBucket(price, bucket) {
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
function parseCommaSeparatedTokens(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}
function inferProductDiscountPercent(product) {
  return product.descuento ?? null;
}
function buildRouteFilteredCatalogProducts(input) {
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
    trimmedQuery
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
    { key: "rangoEdad", value: rangoEdad }
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
function buildFacetFilteredCatalogProducts(routeFiltered, facets) {
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
      const productColorSet = new Set(getProductColors(product).map((value) => slugifyCatalogValue(value)));
      return selectedColors.some((selected) => productColorSet.has(selected));
    });
  }
  if (material) {
    const selectedMaterials = parseCommaSeparatedTokens(material);
    result = result.filter(
      (product) => inferProductMaterials(product).some((rule) => selectedMaterials.includes(rule.slug))
    );
  }
  if (descuento) {
    const selectedDiscounts = parseCommaSeparatedTokens(descuento);
    const hasAllDiscount = selectedDiscounts.includes("all");
    const selectedPercents = selectedDiscounts.filter((item) => item !== "all").map(Number).filter(Number.isFinite);
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
function buildBrowseMeta(routeFiltered) {
  const marcas = Array.from(
    new Set(
      routeFiltered.map((p) => p.marca?.trim()).filter((m) => typeof m === "string" && m.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b)).map((value) => ({ label: value, value: slugifyCatalogValue(value) }));
  const numericSizes = routeFiltered.flatMap((product) => getProductSizes(product)).map(Number).filter(Number.isFinite);
  const availableSizes = Array.from(new Set(numericSizes)).sort((a, b) => a - b).map(String);
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
function parseBrowseQuery(query) {
  const str = (key) => String(query[key] ?? "").trim();
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
    descuento: str("descuento")
  };
}
function browseCatalogProducts(allProducts, query, page, limit) {
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
    trimmedQuery: filters.buscar
  });
  const filtered = buildFacetFilteredCatalogProducts(routeFiltered, {
    precio: filters.precio,
    talla: filters.talla,
    color: filters.color,
    material: filters.material,
    descuento: filters.descuento
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
    meta: buildBrowseMeta(routeFiltered)
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MATERIAL_FILTER_ORDER,
  MATERIAL_RULES,
  browseCatalogProducts,
  buildBrowseMeta,
  buildFacetFilteredCatalogProducts,
  buildRouteFilteredCatalogProducts,
  getProductSizes,
  inferProductDiscountPercent,
  inferProductMaterials,
  matchesPriceBucket,
  normalizeText,
  parseBrowseQuery,
  parseCommaSeparatedTokens,
  parsePriceParts
});
