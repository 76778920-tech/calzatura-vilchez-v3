import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDashboardChartSeries,
  computeDashboardFromFetchedData,
  estimateOrderProfit,
  getLast7Days,
  isCompletedOrder,
  isTiendaFisicaSale,
  todayISO,
  tiendaFisicaSalesTotalForDate,
  toDate,
  toLocalISODate,
  webOrdersTotalForDate,
} from "@/domains/administradores/utils/adminDashboardMetrics";
import type { DailySale, Order, ProductFinancial } from "@/types";

describe("adminDashboardMetrics helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-16T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("todayISO devuelve fecha local YYYY-MM-DD", () => {
    expect(todayISO()).toBe("2026-05-16");
  });

  it("toDate usa ahora cuando creadoEn es falsy", () => {
    const d = toDate("");
    expect(toLocalISODate(d)).toBe("2026-05-16");
  });

  it("getLast7Days devuelve 7 días con iso y label capitalizado", () => {
    const days = getLast7Days();
    expect(days).toHaveLength(7);
    expect(days[0].iso).toBe("2026-05-10");
    expect(days[6].iso).toBe("2026-05-16");
    expect(days[0].label.length).toBeGreaterThan(0);
    expect(days[0].label).toMatch(/^[A-ZÁÉÍÓÚÑ]/);
  });

  it("isCompletedOrder acepta pagado, enviado y entregado", () => {
    expect(isCompletedOrder({ estado: "pagado" } as Order)).toBe(true);
    expect(isCompletedOrder({ estado: "enviado" } as Order)).toBe(true);
    expect(isCompletedOrder({ estado: "entregado" } as Order)).toBe(true);
    expect(isCompletedOrder({ estado: "pendiente" } as Order)).toBe(false);
  });

  it("estimateOrderProfit usa costo financiero o precio como fallback", () => {
    const order = {
      items: [
        { quantity: 2, product: { id: "p1", precio: 100 } },
        { quantity: 1, product: { id: "p2", precio: 50 } },
      ],
    } as Order;
    const financials: Record<string, ProductFinancial> = {
      p1: { productId: "p1", costoCompra: 60 } as ProductFinancial,
    };
    expect(estimateOrderProfit(order, financials)).toBe(2 * (100 - 60) + 1 * (50 - 50));
  });

  it("tiendaFisicaSalesTotalForDate ignora web y otras fechas", () => {
    const sales = [
      { fecha: "2026-05-16", total: 80, canal: "tienda" },
      { fecha: "2026-05-16", total: 50, canal: "web" },
      { fecha: "2026-05-16", total: 30, canal: "tienda" },
      { fecha: "2026-05-15", total: 99, canal: "tienda" },
    ] as DailySale[];
    expect(tiendaFisicaSalesTotalForDate(sales, "2026-05-16")).toBe(110);
  });

  it("webOrdersTotalForDate solo suma pedidos completados del día", () => {
    const orders = [
      { estado: "entregado", creadoEn: "2026-05-16T08:00:00.000Z", total: 200 },
      { estado: "pendiente", creadoEn: "2026-05-16T09:00:00.000Z", total: 999 },
      { estado: "pagado", creadoEn: "2026-05-15T10:00:00.000Z", total: 50 },
    ] as Order[];
    expect(webOrdersTotalForDate(orders, "2026-05-16")).toBe(200);
  });
});

describe("adminDashboardMetrics", () => {
  it("isTiendaFisicaSale excluye canal web", () => {
    expect(isTiendaFisicaSale({ canal: "tienda" } as DailySale)).toBe(true);
    expect(isTiendaFisicaSale({ canal: "web" } as DailySale)).toBe(false);
    expect(isTiendaFisicaSale({} as DailySale)).toBe(true);
  });

  it("separa ingresos web y tienda física", () => {
    const today = "2026-05-16";
    const last7 = [{ iso: today, label: "Sáb" }];
    const orders = [
      {
        id: "o1",
        estado: "entregado",
        creadoEn: `${today}T12:00:00.000Z`,
        total: 329,
        items: [{ quantity: 1, product: { id: "p1", precio: 329 } }],
      },
    ] as Order[];
    const sales = [
      { fecha: today, total: 80, ganancia: 20, canal: "tienda" },
      { fecha: today, total: 50, ganancia: 10, canal: "web" },
    ] as DailySale[];

    const { stats, chart } = computeDashboardFromFetchedData(
      today,
      last7,
      [],
      orders,
      sales,
      {},
      [],
    );

    expect(stats.ingresosWeb).toBe(329);
    expect(stats.ingresosTienda).toBe(80);
    expect(stats.ingresosTotales).toBe(409);
    expect(stats.gananciasTotales).toBeGreaterThan(0);
    expect(stats.ventasHoyWeb).toBe(329);
    expect(stats.ventasHoyTienda).toBe(80);
    expect(chart.web[0]).toBe(329);
    expect(chart.tienda[0]).toBe(80);
  });

  it("buildDashboardChartSeries devuelve series independientes", () => {
    const iso = "2026-05-16";
    const series = buildDashboardChartSeries(
      [{ iso }],
      [{ fecha: iso, total: 100, canal: "tienda" } as DailySale],
      [
        {
          estado: "pagado",
          creadoEn: `${iso}T10:00:00.000Z`,
          total: 200,
        } as Order,
      ],
    );
    expect(series.web[0]).toBe(200);
    expect(series.tienda[0]).toBe(100);
  });
});
