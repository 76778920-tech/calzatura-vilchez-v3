import { startTransition, useEffect, useState } from "react";
import {
  fetchPublicCatalogBrowse,
  fetchProductFamilyGroupCounts,
  fetchPublicProducts,
} from "@/domains/productos/services/products";
import { useProductsRealtime } from "@/hooks/useProductsRealtime";
import { hasPublicBff, type PublicCatalogBrowseResult } from "@/utils/publicBffClient";
import type { Product } from "@/types";
import { CATALOG_PAGE_SIZE } from "@/domains/productos/pages/productsPageConstants";

const USE_BFF_CATALOG_BROWSE = hasPublicBff();

export function useProductsPageCatalogData(
  effectiveParams: URLSearchParams,
  catalogPage: number,
) {
  const [products, setProducts] = useState<Product[]>([]);
  const [browse, setBrowse] = useState<PublicCatalogBrowseResult | null>(null);
  const [familyGroupCounts, setFamilyGroupCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useProductsRealtime(() => setReloadToken((t) => t + 1));

  useEffect(() => {
    let isMounted = true;
    startTransition(() => {
      setLoading(true);
      setError(null);
    });

    if (USE_BFF_CATALOG_BROWSE) {
      fetchPublicCatalogBrowse(effectiveParams, catalogPage, CATALOG_PAGE_SIZE)
        .then((data) => {
          if (!isMounted) return;
          setBrowse(data);
          setFamilyGroupCounts(data.familyGroupCounts);
        })
        .catch(() => {
          if (!isMounted) return;
          setBrowse(null);
          setError("No pudimos cargar el catálogo en este momento.");
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
      return () => {
        isMounted = false;
      };
    }

    Promise.all([
      fetchPublicProducts(),
      fetchProductFamilyGroupCounts().catch((): Record<string, number> => ({})),
    ])
      .then(([nextProducts, counts]) => {
        if (!isMounted) return;
        setProducts(nextProducts);
        setFamilyGroupCounts(counts);
        setBrowse(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setError("No pudimos cargar el catálogo en este momento.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [reloadToken, effectiveParams, catalogPage]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setReloadToken((current) => current + 1);
  };

  return {
    products,
    browse,
    familyGroupCounts,
    loading,
    error,
    handleRetry,
    useBffBrowse: USE_BFF_CATALOG_BROWSE,
  };
}
