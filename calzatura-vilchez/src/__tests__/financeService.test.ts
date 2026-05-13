import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock, rpcMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock("@/supabase/client", () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock,
  },
}));

import {
  addDailySale,
  decrementProductStock,
  deleteProductFinancial,
  fetchDailySales,
  fetchProductFinancials,
  markSaleReturned,
  restoreProductStock,
  upsertProductFinancial,
} from "@/domains/ventas/services/finance";

describe("finance service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T10:00:00.000Z"));
    fromMock.mockReset();
    rpcMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetchProductFinancials indexa resultados por productId", async () => {
    const select = vi.fn().mockResolvedValue({
      data: [
        { productId: "p1", costoCompra: 80 },
        { productId: "p2", costoCompra: 120 },
      ],
      error: null,
    });
    fromMock.mockReturnValue({ select });

    await expect(fetchProductFinancials()).resolves.toEqual({
      p1: { productId: "p1", costoCompra: 80 },
      p2: { productId: "p2", costoCompra: 120 },
    });
    expect(fromMock).toHaveBeenCalledWith("productoFinanzas");
    expect(select).toHaveBeenCalledWith("*");
  });

  it("upsertProductFinancial guarda fecha de actualizacion", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ upsert });

    await upsertProductFinancial("p1", {
      costoCompra: 100,
      margenMinimo: 20,
      margenObjetivo: 40,
      margenMaximo: 60,
      precioMinimo: 120,
      precioSugerido: 140,
      precioMaximo: 160,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "p1",
        actualizadoEn: "2026-05-13T10:00:00.000Z",
      }),
      { onConflict: "productId" }
    );
  });

  it("deleteProductFinancial elimina por productId", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq });
    fromMock.mockReturnValue({ delete: deleteMock });

    await deleteProductFinancial("p1");

    expect(deleteMock).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith("productId", "p1");
  });

  it("fetchDailySales filtra por fecha y ordena por creadoEn descendente", async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [
        { id: "old", creadoEn: "2026-05-13T09:00:00.000Z" },
        { id: "new", creadoEn: "2026-05-13T11:00:00.000Z" },
      ],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ eq });
    fromMock.mockReturnValue({ select });

    const rows = await fetchDailySales("2026-05-13");

    expect(eq).toHaveBeenCalledWith("fecha", "2026-05-13");
    expect(rows.map((row) => row.id)).toEqual(["new", "old"]);
  });

  it("fetchDailySales sin fecha consulta los ultimos 90 dias", async () => {
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const gte = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ gte });
    fromMock.mockReturnValue({ select });

    await fetchDailySales();

    expect(gte).toHaveBeenCalledWith("fecha", "2026-02-12");
    expect(order).toHaveBeenCalledWith("fecha", { ascending: false });
    expect(limit).toHaveBeenCalledWith(500);
  });

  it("addDailySale inserta canal tienda y devuelve id", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "sale-1" }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    fromMock.mockReturnValue({ insert });

    await expect(addDailySale({ fecha: "2026-05-13", total: 50 } as never)).resolves.toBe("sale-1");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        canal: "tienda",
        creadoEn: "2026-05-13T10:00:00.000Z",
      })
    );
    expect(select).toHaveBeenCalledWith("id");
  });

  it("markSaleReturned marca devolucion con motivo", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    fromMock.mockReturnValue({ update });

    await markSaleReturned("sale-1", "Cambio");

    expect(update).toHaveBeenCalledWith({
      devuelto: true,
      motivoDevolucion: "Cambio",
      devueltoEn: "2026-05-13T10:00:00.000Z",
    });
    expect(eq).toHaveBeenCalledWith("id", "sale-1");
  });

  it("decrementProductStock llama al RPC correcto", async () => {
    const lines = [{ talla: "38", cantidad: 2 }];
    rpcMock.mockResolvedValue({ error: null });

    await decrementProductStock("p1", lines);

    expect(rpcMock).toHaveBeenCalledWith("decrement_product_stock", {
      p_product_id: "p1",
      p_lines: lines,
    });
  });

  it("restoreProductStock normaliza talla undefined a null", async () => {
    rpcMock.mockResolvedValue({ error: null });

    await restoreProductStock("p1", undefined as never, 2);

    expect(rpcMock).toHaveBeenCalledWith("restore_product_stock", {
      p_product_id: "p1",
      p_talla: null,
      p_cantidad: 2,
    });
  });
});
