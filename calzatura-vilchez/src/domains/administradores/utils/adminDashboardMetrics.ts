import type { DailySale, Order, Product, ProductFinancial, UserProfile } from "@/types";

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function toDate(value: Order["creadoEn"]) {
  return value ? new Date(value) : new Date();
}

export function toLocalISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Fecha de venta en `ventasDiarias` (YYYY-MM-DD), sin hora. */
export function normalizeSaleDate(fecha: string | undefined): string {
  if (typeof fecha === "string" && fecha.length >= 10) return fecha.slice(0, 10);
  return "";
}

/** Día calendario local del pedido (pago real si existe, si no creación). */
export function orderActivityDate(order: Order): string {
  const raw = order.pagadoEn || order.creadoEn;
  return toLocalISODate(toDate(raw));
}

export function formatChartDayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const weekday = d.toLocaleDateString("es-PE", { weekday: "short" });
  const label = weekday.charAt(0).toUpperCase() + weekday.slice(1).replace(".", "");
  return `${label} ${d.getDate()}`;
}

export function formatShortDateES(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
}

export function isCompletedOrder(order: Order) {
  return order.estado === "pagado" || order.estado === "enviado" || order.estado === "entregado";
}

/** Ventas manuales en tienda física (`ventasDiarias`, canal distinto de web). */
export function isTiendaFisicaSale(sale: DailySale) {
  return sale.canal !== "web";
}

export function estimateOrderProfit(order: Order, financials: Record<string, ProductFinancial>) {
  return order.items.reduce((acc, item) => {
    const unitPrice = Number(item.product.precio) || 0;
    const unitCost = financials[item.product.id]?.costoCompra ?? unitPrice;
    return acc + (unitPrice - unitCost) * item.quantity;
  }, 0);
}

export type DashboardChartDay = { iso: string; label: string };

export function getLast7Days(): DashboardChartDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = toLocalISODate(d);
    return { iso, label: formatChartDayLabel(iso) };
  });
}

export function tiendaFisicaSalesTotalForDate(sales: DailySale[], iso: string): number {
  return sales
    .filter((s) => isTiendaFisicaSale(s) && !s.devuelto && normalizeSaleDate(s.fecha) === iso)
    .reduce((acc, s) => acc + s.total, 0);
}

export function tiendaFisicaProfitForDate(sales: DailySale[], iso: string): number {
  return sales
    .filter((s) => isTiendaFisicaSale(s) && !s.devuelto && normalizeSaleDate(s.fecha) === iso)
    .reduce((acc, s) => acc + (s.ganancia ?? 0), 0);
}

export function webOrdersTotalForDate(orders: Order[], iso: string): number {
  return orders
    .filter((o) => isCompletedOrder(o) && orderActivityDate(o) === iso)
    .reduce((acc, o) => acc + (o.total ?? 0), 0);
}

export function webOrdersProfitForDate(
  orders: Order[],
  iso: string,
  financials: Record<string, ProductFinancial>,
): number {
  return orders
    .filter((o) => isCompletedOrder(o) && orderActivityDate(o) === iso)
    .reduce((acc, o) => acc + estimateOrderProfit(o, financials), 0);
}

export function buildDashboardChartSeries(
  last7Days: { iso: string }[],
  sales: DailySale[],
  completedOrders: Order[],
): { web: number[]; tienda: number[] } {
  return {
    web: last7Days.map(({ iso }) => webOrdersTotalForDate(completedOrders, iso)),
    tienda: last7Days.map(({ iso }) => tiendaFisicaSalesTotalForDate(sales, iso)),
  };
}

export type DashboardStats = {
  productos: number;
  pedidos: number;
  pendientes: number;
  usuarios: number;
  ingresosWeb: number;
  ingresosTienda: number;
  ingresosTotales: number;
  gananciasTotales: number;
  ventasHoyWeb: number;
  ventasHoyTienda: number;
  gananciaHoyWeb: number;
  gananciaHoyTienda: number;
  ventasUltimos7DiasWeb: number;
  ventasUltimos7DiasTienda: number;
  gananciaUltimos7DiasWeb: number;
  gananciaUltimos7DiasTienda: number;
};

export function computeDashboardFromFetchedData(
  today: string,
  last7Days: { iso: string; label: string }[],
  products: Product[],
  orders: Order[],
  sales: DailySale[],
  financials: Record<string, ProductFinancial>,
  users: UserProfile[],
): { stats: DashboardStats; chart: { web: number[]; tienda: number[] } } {
  const completedOrders = orders.filter(isCompletedOrder);
  const tiendaSales = sales.filter(isTiendaFisicaSale);

  const ingresosWeb = completedOrders.reduce((acc, o) => acc + (o.total ?? 0), 0);
  const ingresosTienda = tiendaSales
    .filter((s) => !s.devuelto)
    .reduce((acc, s) => acc + s.total, 0);
  const ingresosTotales = ingresosWeb + ingresosTienda;
  const gananciasTotales =
    tiendaSales.filter((s) => !s.devuelto).reduce((acc, s) => acc + (s.ganancia ?? 0), 0) +
    completedOrders.reduce((acc, o) => acc + estimateOrderProfit(o, financials), 0);
  const pendientes = orders.filter((o) => o.estado === "pendiente").length;

  const ventasHoyTienda = tiendaFisicaSalesTotalForDate(sales, today);
  const gananciaHoyTienda = tiendaFisicaProfitForDate(sales, today);
  const ventasHoyWeb = webOrdersTotalForDate(completedOrders, today);
  const gananciaHoyWeb = webOrdersProfitForDate(completedOrders, today, financials);

  const chart = buildDashboardChartSeries(last7Days, sales, completedOrders);
  const ventasUltimos7DiasWeb = chart.web.reduce((acc, v) => acc + v, 0);
  const ventasUltimos7DiasTienda = chart.tienda.reduce((acc, v) => acc + v, 0);
  const gananciaUltimos7DiasWeb = last7Days.reduce(
    (acc, { iso }) => acc + webOrdersProfitForDate(completedOrders, iso, financials),
    0,
  );
  const gananciaUltimos7DiasTienda = last7Days.reduce(
    (acc, { iso }) => acc + tiendaFisicaProfitForDate(sales, iso),
    0,
  );

  return {
    stats: {
      productos: products.length,
      pedidos: orders.length,
      pendientes,
      usuarios: users.length,
      ingresosWeb,
      ingresosTienda,
      ingresosTotales,
      gananciasTotales,
      ventasHoyWeb,
      ventasHoyTienda,
      gananciaHoyWeb,
      gananciaHoyTienda,
      ventasUltimos7DiasWeb,
      ventasUltimos7DiasTienda,
      gananciaUltimos7DiasWeb,
      gananciaUltimos7DiasTienda,
    },
    chart,
  };
}
