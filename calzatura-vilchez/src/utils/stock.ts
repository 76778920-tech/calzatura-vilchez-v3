import type { Product } from "@/types";

export function sumSizeStock(tallaStock: Record<string, number>) {
  return Object.values(tallaStock).reduce((sum, qty) => sum + Math.max(0, Number(qty) || 0), 0);
}

export function getSizeStock(product: Product, talla?: string) {
  if (talla && product.tallaStock && typeof product.tallaStock[talla] === "number") {
    return Math.max(0, product.tallaStock[talla]);
  }
  return Math.max(0, product.stock);
}

export function getAvailableSizes(product: Product) {
  if (product.tallaStock) {
    return Object.entries(product.tallaStock)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([talla]) => talla)
      .sort((a, b) => Number(a) - Number(b));
  }
  return product.tallas ?? [];
}
