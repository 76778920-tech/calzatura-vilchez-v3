import type { Product } from "../src/types";

export const MATERIAL_RULES: Array<{ slug: string; label: string; terms: string[] }>;
export const MATERIAL_FILTER_ORDER: readonly string[];

export function inferProductMaterials(product: Product): Array<{ slug: string; label: string; terms: string[] }>;
export function getProductSizes(product: Product): string[];
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
}): Product[];

export function buildFacetFilteredCatalogProducts(
  routeFiltered: Product[],
  facets: {
    precio: string;
    talla: string;
    color: string;
    material: string;
    descuento: string;
  },
): Product[];

export function browseCatalogProducts(
  allProducts: Product[],
  query: Record<string, string>,
  page: number,
  limit: number,
): {
  products: Product[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  meta: {
    marcas: Array<{ label: string; value: string }>;
    availableSizes: string[];
    priceBounds: { min: number; max: number; low: number; high: number };
  };
};
