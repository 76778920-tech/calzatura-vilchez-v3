import type { DailySale } from "@/types";

export function computeAdminSalesTotals<
  L extends { productId: string; quantity: number; salePrice: number },
  P extends { id: string; finanzas?: { costoCompra: number } },
>(
  sales: DailySale[],
  pendingLines: L[],
  products: P[],
  date: string,
  saleLineTotal: (line: L) => number,
  saleLineProfit: (line: L, product?: P) => number,
) {
  const registered = sales
    .filter((s) => s.fecha === date && !s.devuelto)
    .reduce(
      (acc, sale) => ({
        cantidad: acc.cantidad + sale.cantidad,
        total: acc.total + sale.total,
        ganancia: acc.ganancia + sale.ganancia,
      }),
      { cantidad: 0, total: 0, ganancia: 0 },
    );
  const pending = pendingLines.reduce(
    (acc, line) => {
      const product = products.find((p) => p.id === line.productId);
      return {
        cantidad: acc.cantidad + line.quantity,
        total: acc.total + saleLineTotal(line),
        ganancia: acc.ganancia + saleLineProfit(line, product),
      };
    },
    { cantidad: 0, total: 0, ganancia: 0 },
  );
  return {
    cantidad: registered.cantidad + pending.cantidad,
    total: registered.total + pending.total,
    ganancia: registered.ganancia + pending.ganancia,
    pending,
  };
}
