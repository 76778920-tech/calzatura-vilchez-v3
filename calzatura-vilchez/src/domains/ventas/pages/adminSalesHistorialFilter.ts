import type { DailySale } from "@/types";

export function filterDailySalesBySearch(sales: DailySale[], historialSearch: string): DailySale[] {
  const term = historialSearch.trim().toLowerCase();
  if (!term) return sales;
  return sales.filter((s) =>
    [
      s.codigo,
      s.nombre,
      s.color,
      s.talla,
      s.cliente?.dni,
      s.cliente?.nombres,
      s.cliente?.apellidos,
      s.documentoNumero,
    ].some((v) => v?.toLowerCase().includes(term)),
  );
}
