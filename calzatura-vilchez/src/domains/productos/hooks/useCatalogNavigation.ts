import { useCallback } from "react";
import type { NavigateFunction } from "react-router-dom";
import { buildCanonicalCatalogLocation, CATALOG_ROUTE_PARAM_KEYS } from "@/routes/catalogRouting";

export function useCatalogNavigation(
  effectiveParams: URLSearchParams,
  navigate: NavigateFunction,
  onNavigate: () => void,
) {
  const isQuickFilterActive = useCallback(
    (params: Record<string, string | undefined>) => {
      const routeOk = CATALOG_ROUTE_PARAM_KEYS.every(
        (key) => (effectiveParams.get(key) ?? "") === (params[key] ?? ""),
      );
      if (Object.hasOwn(params, "descuento")) {
        return routeOk && (effectiveParams.get("descuento") ?? "") === (params.descuento ?? "");
      }
      return routeOk;
    },
    [effectiveParams],
  );

  const applySectionFilter = useCallback(
    (next: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      Object.entries(next).forEach(([key, value]) => {
        if (!value) return;
        params.set(key, value);
      });
      onNavigate();
      const { pathname, search } = buildCanonicalCatalogLocation(params);
      navigate(`${pathname}${search}`);
    },
    [navigate, onNavigate],
  );

  const applyFacetFilter = useCallback(
    (next: Record<string, string | undefined>) => {
      const params = new URLSearchParams(effectiveParams);
      Object.entries(next).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      onNavigate();
      const { pathname, search } = buildCanonicalCatalogLocation(params);
      navigate(`${pathname}${search}`);
    },
    [effectiveParams, navigate, onNavigate],
  );

  return { isQuickFilterActive, applySectionFilter, applyFacetFilter };
}
