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
    const label = d.toLocaleDateString("es-PE", { weekday: "short" });
    return { iso, label: label.charAt(0).toUpperCase() + label.slice(1).replace(".", "") };
  });
}

export function tiendaFisicaSalesTotalForDate(sales: DailySale[], iso: string): number {
  return sales
    .filter((s) => isTiendaFisicaSale(s) && s.fecha === iso)
    .reduce((acc, s) => acc + s.total, 0);
}

export function webOrdersTotalForDate(orders: Order[], iso: string): number {
  return orders
    .filter((o) => isCompletedOrder(o) && toLocalISODate(toDate(o.creadoEn)) === iso)
    .reduce((acc, o) => acc + (o.total ?? 0), 0);
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
  const completedOrdersToday = completedOrders.filter(
    (o) => toLocalISODate(toDate(o.creadoEn)) === today,
  );
  const tiendaSales = sales.filter(isTiendaFisicaSale);

  const ingresosWeb = completedOrders.reduce((acc, o) => acc + (o.total ?? 0), 0);
  const ingresosTienda = tiendaSales
    .filter((s) => !s.devuelto)
    .reduce((acc, s) => acc + s.total, 0);
  const ingresosTotales = ingresosWeb + ingresosTienda;
  const gananciasTotales =
    tiendaSales.filter((s) => !s.devuelto).reduce((acc, s) => acc + s.ganancia, 0) +
    completedOrders.reduce((acc, o) => acc + estimateOrderProfit(o, financials), 0);
  const pendientes = orders.filter((o) => o.estado === "pendiente").length;

  const ventasHoyTienda = tiendaFisicaSalesTotalForDate(sales, today);
  const gananciaHoyTienda = tiendaSales
    .filter((s) => s.fecha === today)
    .reduce((acc, s) => acc + s.ganancia, 0);

  const ventasHoyWeb = completedOrdersToday.reduce((acc, o) => acc + (o.total ?? 0), 0);
  const gananciaHoyWeb = completedOrdersToday.reduce(
    (acc, o) => acc + estimateOrderProfit(o, financials),
    0,
  );

  const chart = buildDashboardChartSeries(last7Days, sales, completedOrders);

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
    },
    chart,
  };
}
