import type { Product } from "@/types";

/** Clave estable para agrupar variantes (mismo modelo, distinto color en DB). */
export function effectiveFamiliaKey(product: Pick<Product, "id" | "familiaId">): string {
  const t = product.familiaId?.trim();
  return t || product.id;
}

/** Cuántos productos comparten cada clave de familia (incluye el propio producto). */
export function tallyFamilyGroupSizes(
  rows: ReadonlyArray<Pick<Product, "id" | "familiaId">>
): Record<string, number> {
  const tally = new Map<string, number>();
  for (const row of rows) {
    const key = effectiveFamiliaKey(row);
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  return Object.fromEntries(tally);
}
