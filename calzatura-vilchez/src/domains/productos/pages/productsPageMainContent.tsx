import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { LoadingStatusRegion } from "@/components/common/LoadingStatusRegion";
import ProductCard from "@/domains/productos/components/ProductCard";
import type { Product } from "@/types";
import { effectiveFamiliaKey } from "@/utils/productFamily";

const PRODUCTS_GRID_SKELETON_KEYS = [
  "product-skeleton-1",
  "product-skeleton-2",
  "product-skeleton-3",
  "product-skeleton-4",
  "product-skeleton-5",
  "product-skeleton-6",
  "product-skeleton-7",
  "product-skeleton-8",
];

export type ProductsPageMainContentInput = {
  loading: boolean;
  error: string | null;
  hasAnyProducts: boolean;
  trimmedQuery: string;
  pagedProducts: Product[];
  familyGroupCounts: Record<string, number>;
  catalogTotal: number;
  catalogPage: number;
  totalCatalogPages: number;
  pageSize: number;
  onRetry: () => void;
  onGoToFullCatalog: () => void;
  onPageChange: (page: number) => void;
};

export function buildProductsPageMainContent(input: ProductsPageMainContentInput): ReactNode {
  const {
    loading,
    error,
    hasAnyProducts,
    trimmedQuery,
    pagedProducts,
    familyGroupCounts,
    catalogTotal,
    catalogPage,
    totalCatalogPages,
    pageSize,
    onRetry,
    onGoToFullCatalog,
    onPageChange,
  } = input;

  if (loading) {
    return (
      <LoadingStatusRegion className="products-grid" label="Cargando productos">
        {PRODUCTS_GRID_SKELETON_KEYS.map((key) => (
          <div key={key} className="skeleton-card" />
        ))}
      </LoadingStatusRegion>
    );
  }

  if (error) {
    return (
      <output className="empty-state" aria-live="polite">
        <AlertTriangle size={28} />
        <p>{error} Revisa tu conexión y vuelve a intentarlo.</p>
        <button type="button" onClick={onRetry} className="btn-primary">
          Reintentar
        </button>
      </output>
    );
  }

  if (hasAnyProducts) {
    return (
      <>
        <div className="products-grid">
          {pagedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              familyGroupSize={familyGroupCounts[effectiveFamiliaKey(product)] ?? 1}
            />
          ))}
        </div>
        {totalCatalogPages > 1 && (
          <nav className="catalog-pagination" aria-label="Paginación del catálogo">
            <button
              type="button"
              className="catalog-pag-btn"
              onClick={() => {
                onPageChange(Math.max(1, catalogPage - 1));
                globalThis.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={catalogPage === 1}
              aria-label="Página anterior"
            >
              ‹
            </button>
            {Array.from({ length: totalCatalogPages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === totalCatalogPages || Math.abs(n - catalogPage) <= 2)
              .reduce<Array<number | { gap: string }>>((acc, n, idx, arr) => {
                if (idx > 0 && n - arr[idx - 1] > 1) acc.push({ gap: `${arr[idx - 1]}-${n}` });
                acc.push(n);
                return acc;
              }, [])
              .map((item) =>
                typeof item === "object" ? (
                  <span key={`gap-${item.gap}`} className="catalog-pag-ellipsis">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    className={`catalog-pag-btn${catalogPage === item ? " is-active" : ""}`}
                    onClick={() => {
                      onPageChange(item);
                      globalThis.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    aria-label={`Página ${item}`}
                    aria-current={catalogPage === item ? "page" : undefined}
                  >
                    {item}
                  </button>
                ),
              )}
            <button
              type="button"
              className="catalog-pag-btn"
              onClick={() => {
                onPageChange(Math.min(totalCatalogPages, catalogPage + 1));
                globalThis.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={catalogPage === totalCatalogPages}
              aria-label="Página siguiente"
            >
              ›
            </button>
            <span className="catalog-pag-info">
              {(catalogPage - 1) * pageSize + 1}–{Math.min(catalogPage * pageSize, catalogTotal)} de {catalogTotal}
            </span>
          </nav>
        )}
      </>
    );
  }

  const emptyMessage = trimmedQuery
    ? `No encontramos resultados para "${trimmedQuery}" con los filtros actuales.`
    : "No encontramos productos con la combinación actual de filtros.";

  return (
    <div className="empty-state">
      <p>{emptyMessage}</p>
      <button type="button" onClick={onGoToFullCatalog} className="btn-primary">
        Ver todo el catálogo
      </button>
    </div>
  );
}
