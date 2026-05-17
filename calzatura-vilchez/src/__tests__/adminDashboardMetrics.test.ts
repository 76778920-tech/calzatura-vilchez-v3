import { describe, expect, it } from "vitest";
import {
  buildDashboardChartSeries,
  computeDashboardFromFetchedData,
  isTiendaFisicaSale,
} from "@/domains/administradores/utils/adminDashboardMetrics";
import type { DailySale, Order } from "@/types";

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
