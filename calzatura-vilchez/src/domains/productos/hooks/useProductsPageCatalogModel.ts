import { useMemo } from "react";
import type { Product } from "@/types";
import type { PublicCatalogBrowseResult } from "@/utils/publicBffClient";
import {
  buildCatalogModel,
  type RouteFacetParams,
} from "@/domains/productos/utils/productsPageCatalogModel";

type Input = {
  products: Product[];
  browse: PublicCatalogBrowseResult | null;
  useBffBrowse: boolean;
  catalogPage: number;
  route: RouteFacetParams;
  applyFacetFilter: (next: Record<string, string | undefined>) => void;
};

export function useProductsPageCatalogModel(input: Input) {
  return useMemo(() => buildCatalogModel(input), [
    input.products,
    input.browse,
    input.useBffBrowse,
    input.catalogPage,
    input.route.categoria,
    input.route.vista,
    input.route.marca,
    input.route.marcaSlug,
    input.route.campana,
    input.route.promocion,
    input.route.coleccion,
    input.route.estilo,
    input.route.tipo,
    input.route.linea,
    input.route.segmento,
    input.route.color,
    input.route.rangoEdad,
    input.route.precio,
    input.route.talla,
    input.route.material,
    input.route.descuento,
    input.route.trimmedQuery,
    input.applyFacetFilter,
  ]);
}
