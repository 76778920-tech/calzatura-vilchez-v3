/**
 * Enrutado del catálogo: estanterías en path, refinamiento en query, canonicalización.
 * Una sola fuente de verdad para claves de filtros “de ruta” vs refinamiento.
 */
import { toPublicCategorySlug, resolvePathFacetSlug, slugifyCatalogValue, type CatalogPathFacetKey } from "@/utils/catalog";

export const CATALOG_SHELF = {
  products: "/productos",
  outlet: "/outlet",
  nuevaTemporada: "/nueva-temporada",
  cyberLanding: "/cyber-2026",
  clubCalzadoLanding: "/club-vilchez-calzado",
} as const;

/** Descuento por defecto en enlaces Cyber Wow para incluir productos con descuento. */
export const CYBER_WOW_DEFAULT_DESCUENTO = "all" as const;

/** Parámetros que definen la “estantería” y taxonomía (comparten lógica con el listado). */
export const CATALOG_ROUTE_PARAM_KEYS = [
  "categoria",
  "vista",
  "marca",
  "marcaSlug",
  "campana",
  "coleccion",
  "estilo",
  "tipo",
  "linea",
  "segmento",
  "color",
  "promocion",
  "rangoEdad",
] as const;

export type CatalogRouteParamKey = (typeof CATALOG_ROUTE_PARAM_KEYS)[number];

/** Refinamiento que no codificamos en el path (solo query). */
export const CATALOG_REFINEMENT_PARAM_KEYS = ["precio", "talla", "material", "descuento", "buscar"] as const;

export type CatalogRefinementKey = (typeof CATALOG_REFINEMENT_PARAM_KEYS)[number];

const PATH_FACET_KEYS: CatalogPathFacetKey[] = ["tipo", "linea", "segmento", "coleccion", "estilo"];

function isCatalogShelfPath(pathname: string) {
  return (
    pathname === CATALOG_SHELF.products ||
    pathname.startsWith(`${CATALOG_SHELF.products}/`) ||
    pathname === CATALOG_SHELF.outlet ||
    pathname.startsWith(`${CATALOG_SHELF.outlet}/`) ||
    pathname === CATALOG_SHELF.nuevaTemporada ||
    pathname.startsWith(`${CATALOG_SHELF.nuevaTemporada}/`)
  );
}

function shelfRoot(pathname: string): "productos" | "outlet" | "nueva-temporada" | null {
  if (pathname === CATALOG_SHELF.products || pathname.startsWith(`${CATALOG_SHELF.products}/`)) return "productos";
  if (pathname === CATALOG_SHELF.outlet || pathname.startsWith(`${CATALOG_SHELF.outlet}/`)) return "outlet";
  if (pathname === CATALOG_SHELF.nuevaTemporada || pathname.startsWith(`${CATALOG_SHELF.nuevaTemporada}/`)) {
    return "nueva-temporada";
  }
  return null;
}

type RouteParams = Readonly<Partial<Record<string, string | undefined>>>;

/**
 * Segmentos de estantería leídos del pathname (Header vive fuera de `<Routes>` y no tiene `useParams` del catálogo).
 */
export function catalogRouteParamsFromPathname(pathname: string): RouteParams {
  const parts = pathname.split("/").filter(Boolean);
  const root = parts[0];
  if (root === "productos" || root === "outlet" || root === "nueva-temporada") {
    return { categoria: parts[1] };
  }
  return {};
}

export function mergeRouteParams(pathname: string, routeParams: RouteParams): RouteParams {
  return { ...catalogRouteParamsFromPathname(pathname), ...routeParams };
}

/**
 * Filtros inferidos solo del path (prefijos outlet / nueva-temporada / productos + params de React Router).
 */
export function pathToRouteFilterRecord(pathname: string, routeParams: RouteParams): Record<string, string> {
  const root = shelfRoot(pathname);
  const out: Record<string, string> = {};

  if (root === "outlet") {
    out.promocion = "oferta";
  } else if (root === "nueva-temporada") {
    out.campana = "nueva-temporada";
  }

  const categoriaRaw = routeParams.categoria?.trim();
  if (categoriaRaw) {
    const cat = toPublicCategorySlug(categoriaRaw);
    if (cat && cat !== "todos") out.categoria = cat;
  }

  const parts = pathname.split("/").filter(Boolean);
  const facetRaw = parts[2]?.trim();
  if (facetRaw) {
    const resolved = resolvePathFacetSlug(facetRaw);
    if (resolved) {
      out[resolved.key] = resolved.value;
    }
  }

  return out;
}

/**
 * Combina path + query: el path gana en claves de ruta; el query aporta el resto y refinamiento.
 */
export function mergeCatalogSearchParams(
  pathname: string,
  routeParams: RouteParams,
  searchParams: URLSearchParams
): URLSearchParams {
  const mergedParams = mergeRouteParams(pathname, routeParams);
  const fromPath = pathToRouteFilterRecord(pathname, mergedParams);
  const merged = new URLSearchParams();

  for (const key of CATALOG_REFINEMENT_PARAM_KEYS) {
    const v = searchParams.get(key);
    if (v) merged.set(key, v);
  }

  for (const key of CATALOG_ROUTE_PARAM_KEYS) {
    const fromP = fromPath[key];
    const fromQ = searchParams.get(key);
    const val = fromP ?? fromQ ?? "";
    if (val) merged.set(key, val);
  }

  return merged;
}

function pickFacetForPath(filters: Record<string, string>): { key: CatalogPathFacetKey; slug: string } | null {
  for (const key of PATH_FACET_KEYS) {
    const v = filters[key]?.trim();
    if (v) return { key, slug: slugifyCatalogValue(v) };
  }
  return null;
}

type MergeCatalogSearchFn = (pathname: string, encodedInPath: Set<string>) => { pathname: string; search: string };

function buildPrefixedShelfCanonical(
  shelfBase: string,
  filters: Record<string, string>,
  pathEncodedKey: "campana" | "promocion",
  mergeSearch: MergeCatalogSearchFn,
): { pathname: string; search: string } {
  const cat = filters.categoria && filters.categoria !== "todos" ? toPublicCategorySlug(filters.categoria) : "";
  const facet = pickFacetForPath(filters);
  const encoded = new Set<string>([pathEncodedKey]);
  if (cat) {
    encoded.add("categoria");
    if (facet) encoded.add(facet.key);
  }
  if (!cat) return mergeSearch(shelfBase, encoded);
  if (!facet) return mergeSearch(`${shelfBase}/${cat}`, encoded);
  return mergeSearch(`${shelfBase}/${cat}/${facet.slug}`, encoded);
}

function buildDefaultProductsCanonical(
  filters: Record<string, string>,
  mergeSearch: MergeCatalogSearchFn,
): { pathname: string; search: string } {
  const cat = filters.categoria && filters.categoria !== "todos" ? toPublicCategorySlug(filters.categoria) : "";
  const facet = pickFacetForPath(filters);
  const encoded = new Set<string>();
  if (cat) {
    encoded.add("categoria");
    if (facet) encoded.add(facet.key);
  }
  if (!cat) return mergeSearch(CATALOG_SHELF.products, encoded);
  if (!facet) return mergeSearch(`${CATALOG_SHELF.products}/${cat}`, encoded);
  return mergeSearch(`${CATALOG_SHELF.products}/${cat}/${facet.slug}`, encoded);
}

function recordFromSearchParams(sp: URLSearchParams): Record<string, string> {
  const o: Record<string, string> = {};
  sp.forEach((value, key) => {
    if (value) o[key] = value;
  });
  return o;
}

/**
 * Construye pathname + search canónicos a partir del estado de filtros ya fusionado.
 * — Marca / vista marcas: siempre `/productos` + query.
 * — Nueva temporada: prefijo `/nueva-temporada` cuando campana es exactamente esa.
 * — Outlet (ofertas): prefijo `/outlet` cuando promoción es oferta.
 * — Resto: `/productos[/categoria][/faceta]` si aplica; campañas y colecciones extra van en query.
 */
export function buildCanonicalCatalogLocation(searchParams: URLSearchParams): { pathname: string; search: string } {
  const filters = recordFromSearchParams(searchParams);

  const refinements = new URLSearchParams();
  for (const key of CATALOG_REFINEMENT_PARAM_KEYS) {
    if (filters[key]) refinements.set(key, filters[key]);
  }

  const routeQuery = new URLSearchParams();

  const appendRouteToQuery = (encodedInPath: Set<string>) => {
    for (const key of CATALOG_ROUTE_PARAM_KEYS) {
      if (encodedInPath.has(key)) continue;
      if (filters[key]) routeQuery.set(key, filters[key]);
    }
  };

  const mergeSearch = (pathname: string, encodedInPath: Set<string>) => {
    appendRouteToQuery(encodedInPath);
    refinements.forEach((v, k) => routeQuery.set(k, v));
    const s = routeQuery.toString();
    return { pathname, search: s ? `?${s}` : "" };
  };

  if (filters.vista === "marcas" || filters.marcaSlug || (filters.marca && filters.marca !== "todas")) {
    return mergeSearch(CATALOG_SHELF.products, new Set());
  }

  if (filters.campana === "nueva-temporada") {
    return buildPrefixedShelfCanonical(CATALOG_SHELF.nuevaTemporada, filters, "campana", mergeSearch);
  }

  if (filters.promocion === "oferta") {
    return buildPrefixedShelfCanonical(CATALOG_SHELF.outlet, filters, "promocion", mergeSearch);
  }

  return buildDefaultProductsCanonical(filters, mergeSearch);
}

/**
 * Comparación estable de query: mismo significado con + vs %20, distinto orden de claves o valores repetidos.
 */
function normalizeQueryStringComparable(raw: string): string {
  const trimmed = raw.startsWith("?") ? raw.slice(1) : raw;
  if (!trimmed) return "";
  const sp = new URLSearchParams(trimmed);
  const entries: [string, string][] = [];
  sp.forEach((value, key) => {
    entries.push([key, value]);
  });
  entries.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));
  return new URLSearchParams(entries).toString();
}

/**
 * `to` para React Router si la URL actual no es canónica; null si ya lo es o no es ruta de catálogo.
 *
 * Igualdad: `normalizeQueryStringComparable` solo para comparar (encoding `+` vs `%20`, orden de entrada, duplicados).
 * Destino: `wantSearch` tal cual de `buildCanonicalCatalogLocation` (refinements → route keys, mismo orden que
 * `buildCatalogHref`). No reordenar alfabéticamente el target: si no, la barra no coincidiría y el redirect se repetiría.
 */
export function getCatalogCanonicalRedirect(
  pathname: string,
  search: string,
  routeParams: RouteParams
): { pathname: string; search: string } | null {
  if (!isCatalogShelfPath(pathname)) return null;

  const query = search.startsWith("?") ? search.slice(1) : search;
  const merged = mergeCatalogSearchParams(pathname, routeParams, new URLSearchParams(query));
  const { pathname: wantPath, search: wantSearch } = buildCanonicalCatalogLocation(merged);

  if (pathname === wantPath && normalizeQueryStringComparable(search) === normalizeQueryStringComparable(wantSearch)) {
    return null;
  }

  return { pathname: wantPath, search: wantSearch };
}

/**
 * Construye `to` para enlaces del mega menú y breadcrumbs a partir de un mapa de filtros de ruta.
 * Mantiene el criterio de canonicalización (misma lógica que la barra de direcciones).
 */
export function buildCatalogHref(routeFilters: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  Object.entries(routeFilters).forEach(([key, value]) => {
    if (value) sp.set(key, value);
  });
  const { pathname, search } = buildCanonicalCatalogLocation(sp);
  return search ? `${pathname}${search}` : pathname;
}

export function buildCyberCatalogHref(routeFilters: Record<string, string | undefined>): string {
  return buildCatalogHref({ ...routeFilters, descuento: CYBER_WOW_DEFAULT_DESCUENTO });
}

/** True si el pathname pertenece al catálogo (para resaltar ítems del menú, etc.). */
export function isProductCatalogPath(pathname: string) {
  return isCatalogShelfPath(pathname);
}

/**
 * Firma canónica de la vista de catálogo (path + query fusionados y normalizados).
 * Útil para comparar “misma estantería” aunque la URL legacy use solo query.
 */
export function getCatalogUrlKey(pathname: string, search: string): string {
  if (!isCatalogShelfPath(pathname)) {
    let q = "";
    if (search.startsWith("?")) q = search;
    else if (search) q = `?${search}`;
    return `${pathname}${q}`;
  }
  const rp = catalogRouteParamsFromPathname(pathname);
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const merged = mergeCatalogSearchParams(pathname, rp, new URLSearchParams(raw));
  const { pathname: p, search: s } = buildCanonicalCatalogLocation(merged);
  return `${p}${s}`;
}
