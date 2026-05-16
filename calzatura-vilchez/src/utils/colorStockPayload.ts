/**
 * Construye `colorStock` en el mismo formato que espera el BFF/checkout:
 * `{ [nombreColor]: { [talla]: cantidad } }`, una fila por variante (fila en `productos`).
 */
export function buildColorStockForVariant(
  color: string,
  tallaStock: Record<string, number>,
): Record<string, Record<string, number>> | undefined {
  const key = color?.trim();
  if (!key) return undefined;
  const filtered = Object.fromEntries(
    Object.entries(tallaStock).filter(([, qty]) => Number(qty) > 0),
  ) as Record<string, number>;
  if (Object.keys(filtered).length === 0) return undefined;
  return { [key]: filtered };
}
