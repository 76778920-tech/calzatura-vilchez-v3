import type { Product } from "@/types";

export function sumSizeStock(tallaStock: Record<string, number>) {
  return Object.values(tallaStock).reduce((sum, qty) => sum + Math.max(0, Number(qty) || 0), 0);
}

export function sumColorSizeStock(colorStock?: Record<string, Record<string, number>>) {
  if (!colorStock) return 0;
  return Object.values(colorStock).reduce((sum, stockBySize) => sum + sumSizeStock(stockBySize), 0);
}

export function aggregateColorStock(colorStock?: Record<string, Record<string, number>>) {
  const aggregate: Record<string, number> = {};
  if (!colorStock) return aggregate;

  Object.values(colorStock).forEach((stockBySize) => {
    Object.entries(stockBySize).forEach(([talla, qty]) => {
      aggregate[talla] = (aggregate[talla] ?? 0) + Math.max(0, Number(qty) || 0);
    });
  });

  return aggregate;
}

export function getSizeStock(product: Product, talla?: string, color?: string) {
  if (product.colorStock && talla) {
    if (color && typeof product.colorStock[color]?.[talla] === "number") {
      return Math.max(0, product.colorStock[color][talla]);
    }
    return Object.values(product.colorStock).reduce(
      (sum, stockBySize) => sum + Math.max(0, Number(stockBySize[talla]) || 0),
      0
    );
  }
  if (talla && product.tallaStock && typeof product.tallaStock[talla] === "number") {
    return Math.max(0, product.tallaStock[talla]);
  }
  return Math.max(0, product.stock);
}

export function getAvailableSizes(product: Product, color?: string) {
  if (product.colorStock) {
    const stockBySize = color ? product.colorStock[color] : aggregateColorStock(product.colorStock);
    if (stockBySize) {
      return Object.entries(stockBySize)
        .filter(([, qty]) => Number(qty) > 0)
        .map(([talla]) => talla)
        .sort((a, b) => Number(a) - Number(b));
    }
  }
  if (product.tallaStock) {
    return Object.entries(product.tallaStock)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([talla]) => talla)
      .sort((a, b) => Number(a) - Number(b));
  }
  return product.tallas ?? [];
}
