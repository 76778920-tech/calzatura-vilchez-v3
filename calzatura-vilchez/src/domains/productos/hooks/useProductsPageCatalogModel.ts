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

export function useProductsPageCatalogModel({
  products,
  browse,
  useBffBrowse,
  catalogPage,
  route,
  applyFacetFilter,
}: Input) {
  return useMemo(
    () => buildCatalogModel({ products, browse, useBffBrowse, catalogPage, route, applyFacetFilter }),
    [
      products,
      browse,
      useBffBrowse,
      catalogPage,
      route,
      applyFacetFilter,
    ],
  );
}
