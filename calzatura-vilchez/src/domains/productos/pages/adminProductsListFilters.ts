import type { ProductFinancial } from "@/types";
import { categoryLabel } from "@/utils/labels";
import { isStockTallaIncoherent } from "./adminProductStockCoherence";

export type StockFilter = "todos" | "con-stock" | "bajo-stock" | "sin-stock" | "stock-talla-mismatch";
export type FeaturedFilter = "todos" | "destacados" | "normales";

export type AdminProductRow = {
  id: string;
  codigo?: string;
  nombre: string;
  precio: number;
  imagen: string;
  marca?: string;
  material?: string;
  color?: string;
  categoria: string;
  tipoCalzado?: string;
  descripcion?: string;
  stock: number;
  tallaStock?: Record<string, number> | null;
  destacado?: boolean;
  finanzas?: ProductFinancial;
};

export function computeAdminProductStats(products: AdminProductRow[], lowStockLimit: number) {
  const bajoStock = products.filter((p) => p.stock > 0 && p.stock <= lowStockLimit).length;
  const destacados = products.filter((p) => p.destacado).length;
  const stockTotal = products.reduce((sum, p) => sum + p.stock, 0);
  const stockTallaIncoherentes = products.filter((p) => isStockTallaIncoherent(p)).length;
  return { bajoStock, destacados, stockTotal, stockTallaIncoherentes };
}

export function filterAdminProducts<T extends AdminProductRow>(
  products: T[],
  params: {
    searchTerm: string;
    categoryFilter: string;
    stockFilter: StockFilter;
    featuredFilter: FeaturedFilter;
    lowStockLimit: number;
  },
): T[] {
  const term = params.searchTerm.trim().toLowerCase();
  return products.filter((product) => {
    const searchable = [
      product.codigo,
      product.nombre,
      product.marca,
      product.material,
      product.color,
      product.categoria,
      product.tipoCalzado,
      categoryLabel(product.categoria),
      product.descripcion,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = term === "" || searchable.includes(term);
    const matchesCategory = params.categoryFilter === "todos" || product.categoria === params.categoryFilter;
    const matchesStock =
      params.stockFilter === "todos" ||
      (params.stockFilter === "con-stock" && product.stock > params.lowStockLimit) ||
      (params.stockFilter === "bajo-stock" && product.stock > 0 && product.stock <= params.lowStockLimit) ||
      (params.stockFilter === "sin-stock" && product.stock === 0) ||
      (params.stockFilter === "stock-talla-mismatch" && isStockTallaIncoherent(product));
    const matchesFeatured =
      params.featuredFilter === "todos" ||
      (params.featuredFilter === "destacados" && Boolean(product.destacado)) ||
      (params.featuredFilter === "normales" && !product.destacado);

    return matchesSearch && matchesCategory && matchesStock && matchesFeatured;
  });
}

export function hasActiveAdminProductFilters(
  searchTerm: string,
  categoryFilter: string,
  stockFilter: StockFilter,
  featuredFilter: FeaturedFilter,
): boolean {
  return (
    searchTerm.trim() !== "" ||
    categoryFilter !== "todos" ||
    stockFilter !== "todos" ||
    featuredFilter !== "todos"
  );
}
