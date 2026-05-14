import { sumSizeStock } from "@/utils/stock";

/** Suma de unidades en `tallaStock` (0 si no hay mapa). */
export function sumTallaStockUnits(tallaStock?: Record<string, number> | null): number {
  return sumSizeStock(tallaStock ?? {});
}

/**
 * True cuando `stock` (total pares en producto) no coincide con la suma de `tallaStock`.
 * Incluye legacy sin desglose: stock > 0 y tallaStock vacío o ausente.
 */
export function isStockTallaIncoherent(product: {
  stock: number;
  tallaStock?: Record<string, number> | null;
}): boolean {
  return product.stock !== sumTallaStockUnits(product.tallaStock);
}
