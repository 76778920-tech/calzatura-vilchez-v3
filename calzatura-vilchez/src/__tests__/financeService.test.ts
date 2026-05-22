import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock, rpcMock, bffFetchMock, getBackendApiBaseUrlMock, getIdTokenMock, authState } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
  bffFetchMock: vi.fn(),
  getBackendApiBaseUrlMock: vi.fn(() => ""),
  getIdTokenMock: vi.fn(),
  authState: { user: null as null | { getIdToken: () => Promise<string> } },
}));

vi.mock("@/firebase/config", () => ({
  auth: {
    get currentUser() {
      return authState.user;
    },
  },
}));

vi.mock("@/config/apiBackend", () => ({
  getBackendApiBaseUrl: getBackendApiBaseUrlMock,
}));

vi.mock("@/supabase/client", () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock,
  },
}));

vi.mock("@/utils/bffClient", () => ({
  bffFetch: bffFetchMock,
}));

import {
  addDailySale,
  calculatePriceRange,
  decrementProductStock,
  deleteProductFinancial,
  fetchDailySales,
  fetchProductFinancials,
  markSaleReturned,
  registerDailySalesAtomic,
  returnDailySaleAtomic,
  restoreProductStock,
  upsertProductFinancial,
} from "@/domains/ventas/services/finance";

describe("finance service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T10:00:00.000Z"));
    fromMock.mockReset();
    rpcMock.mockReset();
    bffFetchMock.mockReset();
    getBackendApiBaseUrlMock.mockReturnValue("");
    authState.user = { getIdToken: getIdTokenMock.mockResolvedValue("token") };
    authState.user = null;
    getIdTokenMock.mockReset();
    getIdTokenMock.mockResolvedValue("token-test");
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "Could not find the function list_ventas_diarias_by_fecha", code: "PGRST202" },
    });
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fetchDailySalesViaBff devuelve null si fetch lanza", async () => {
    getBackendApiBaseUrlMock.mockReturnValue("https://bff.example");
    authState.user = { getIdToken: getIdTokenMock };
    vi.mocked(fetch).mockRejectedValue(new Error("network"));

    rpcMock.mockResolvedValueOnce({
      data: [{ id: "rpc-1", creadoEn: "2026-05-13T10:00:00.000Z" }],
      error: null,
    });

    const rows = await fetchDailySales("2026-05-13");
    expect(rows).toHaveLength(1);
  });

  it("fetchDailySalesRpc propaga error no ignorables", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "permission denied for ventasDiarias" },
    });

    await expect(fetchDailySales("2026-05-13")).rejects.toMatchObject({
      message: "permission denied for ventasDiarias",
    });
  });

  it("fetchDailySales usa BFF admin cuando hay sesión y responde sales", async () => {
    getBackendApiBaseUrlMock.mockReturnValue("https://bff.example");
    authState.user = { getIdToken: getIdTokenMock };
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        sales: [
          { id: "b1", creadoEn: "2026-05-13T11:00:00.000Z" },
          { id: "b2", creadoEn: "2026-05-13T09:00:00.000Z" },
        ],
      }),
    } as Response);

    const rows = await fetchDailySales("2026-05-13", "admin");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://bff.example/admin/dailySales?fecha=2026-05-13",
      expect.objectContaining({ headers: { Authorization: "Bearer token-test" } }),
    );
    expect(rows.map((r) => r.id)).toEqual(["b1", "b2"]);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("fetchDailySales staff consulta /staff/dailySales y no hace fallback Supabase", async () => {
    getBackendApiBaseUrlMock.mockReturnValue("https://bff.example");
    authState.user = { getIdToken: getIdTokenMock };
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({ ok: false } as Response);

    await expect(fetchDailySales("2026-05-13", "staff")).rejects.toThrow(
      "No se pudieron cargar tus ventas diarias",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://bff.example/staff/dailySales?fecha=2026-05-13",
      expect.any(Object),
    );
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("fetchDailySales hace fallback a Supabase si BFF no responde", async () => {
    getBackendApiBaseUrlMock.mockReturnValue("https://bff.example");
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    rpcMock.mockResolvedValueOnce({
      data: [{ id: "rpc-1", creadoEn: "2026-05-13T10:00:00.000Z" }],
      error: null,
    });

    const rows = await fetchDailySales("2026-05-13");

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("rpc-1");
  });

  it("fetchDailySales lanza si BFF y Supabase no devuelven datos", async () => {
    getBackendApiBaseUrlMock.mockReturnValue("");
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Could not find the function list_ventas_diarias_by_fecha", code: "PGRST202" },
    });
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => Promise.resolve({ data: null, error: { message: "db down" } }),
      }),
    }));

    await expect(fetchDailySales("2026-05-13")).rejects.toThrow(
      "No se pudieron cargar las ventas diarias",
    );
  });

  it("fetchProductFinancials indexa resultados por productId (admin)", async () => {
    bffFetchMock.mockResolvedValue({
      rows: [
        { productId: "p1", costoCompra: 80 },
        { productId: "p2", costoCompra: 120 },
      ],
    });

    await expect(fetchProductFinancials("admin")).resolves.toEqual({
      p1: { productId: "p1", costoCompra: 80 },
      p2: { productId: "p2", costoCompra: 120 },
    });
    expect(bffFetchMock).toHaveBeenCalledWith("/admin/productFinanzas");
  });

  it("fetchProductFinancials usa rangos de precio para staff", async () => {
    bffFetchMock.mockResolvedValue({
      rows: [{ productId: "p1", precioMinimo: 100, precioSugerido: 120, precioMaximo: 140 }],
    });

    await expect(fetchProductFinancials("staff")).resolves.toEqual({
      p1: { productId: "p1", precioMinimo: 100, precioSugerido: 120, precioMaximo: 140 },
    });
    expect(bffFetchMock).toHaveBeenCalledWith("/staff/productPriceRanges");
  });

  it("upsertProductFinancial guarda via BFF", async () => {
    bffFetchMock.mockResolvedValue({ ok: true });

    await upsertProductFinancial("p1", {
      costoCompra: 100,
      margenMinimo: 20,
      margenObjetivo: 40,
      margenMaximo: 60,
      precioMinimo: 120,
      precioSugerido: 140,
      precioMaximo: 160,
    });

    expect(bffFetchMock).toHaveBeenCalledWith(
      "/admin/productFinanzas/p1",
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining("\"precioMaximo\":160"),
      }),
    );
  });

  it("deleteProductFinancial elimina via BFF", async () => {
    bffFetchMock.mockResolvedValue({ ok: true });

    await deleteProductFinancial("p1");

    expect(bffFetchMock).toHaveBeenCalledWith(
      "/admin/productFinanzas/p1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("fetchDailySales filtra por fecha y ordena por creadoEn descendente", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        { id: "old", creadoEn: "2026-05-13T09:00:00.000Z" },
        { id: "new", creadoEn: "2026-05-13T11:00:00.000Z" },
      ],
      error: null,
    });

    const rows = await fetchDailySales("2026-05-13");

    expect(rpcMock).toHaveBeenCalledWith("list_ventas_diarias_by_fecha", { p_fecha: "2026-05-13" });
    expect(rows.map((row) => row.id)).toEqual(["new", "old"]);
  });

  it("fetchDailySales sin fecha consulta los ultimos 90 dias", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ id: "s1", creadoEn: "2026-05-13T10:00:00.000Z", fecha: "2026-05-13" }],
      error: null,
    });

    const rows = await fetchDailySales();

    expect(rpcMock).toHaveBeenCalledWith("list_ventas_diarias_since", { p_fecha_desde: "2026-02-12" });
    expect(rows).toHaveLength(1);
  });

  it("addDailySale registra via BFF y devuelve primer id", async () => {
    bffFetchMock.mockResolvedValue({ ids: ["sale-1"] });

    await expect(addDailySale({ fecha: "2026-05-13", total: 50 } as never)).resolves.toBe("sale-1");
    expect(bffFetchMock).toHaveBeenCalledWith(
      "/admin/dailySales/register",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("markSaleReturned registra devolucion via BFF", async () => {
    bffFetchMock.mockResolvedValue({ sale: { id: "sale-1" } });

    await markSaleReturned("sale-1", "Cambio");

    expect(bffFetchMock).toHaveBeenCalledWith(
      "/admin/dailySales/return",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ saleId: "sale-1", motivo: "Cambio" }) }),
    );
  });

  it("decrementProductStock llama al BFF correcto", async () => {
    const lines = [{ talla: "38", cantidad: 2 }];
    bffFetchMock.mockResolvedValue({ ok: true });

    await decrementProductStock("p1", lines);

    expect(bffFetchMock).toHaveBeenCalledWith(
      "/admin/products/decrementStock",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ productId: "p1", lines }) }),
    );
  });

  it("restoreProductStock normaliza talla undefined a null y llama BFF", async () => {
    bffFetchMock.mockResolvedValue({ ok: true });

    await restoreProductStock("p1", undefined as never, 2);

    expect(bffFetchMock).toHaveBeenCalledWith(
      "/admin/products/restoreStock",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ productId: "p1", talla: null, cantidad: 2 }) }),
    );
  });

  it("registerDailySalesAtomic registra via BFF (admin)", async () => {
    bffFetchMock.mockResolvedValue({ ids: ["s1", "s2"] });

    await expect(
      registerDailySalesAtomic(
        [{ fecha: "2026-05-13", total: 50, productId: "p1", cantidad: 1 } as never],
        "admin",
      ),
    ).resolves.toEqual(["s1", "s2"]);

    expect(bffFetchMock).toHaveBeenCalledWith(
      "/admin/dailySales/register",
      expect.objectContaining({ method: "POST" }),
    );
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("registerDailySalesAtomic staff registra via BFF", async () => {
    bffFetchMock.mockResolvedValue({ ids: ["s9"] });

    await expect(
      registerDailySalesAtomic(
        [{ fecha: "2026-05-13", total: 50, productId: "p1", cantidad: 1, costoUnitario: 1, costoTotal: 1, ganancia: 0 } as never],
        "staff",
      ),
    ).resolves.toEqual(["s9"]);

    expect(bffFetchMock).toHaveBeenCalledWith(
      "/staff/dailySales/register",
      expect.objectContaining({ method: "POST" }),
    );
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returnDailySaleAtomic devuelve fila via BFF (admin)", async () => {
    const row = {
      id: "s1",
      productId: "p1",
      devuelto: true,
      motivoDevolucion: "Cambio",
      devueltoEn: "2026-05-13T10:00:00.000Z",
    };
    bffFetchMock.mockResolvedValue({ sale: row });

    await expect(returnDailySaleAtomic("s1", "Cambio", "admin")).resolves.toEqual(row);
    expect(bffFetchMock).toHaveBeenCalledWith(
      "/admin/dailySales/return",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returnDailySaleAtomic staff usa endpoint de trabajador", async () => {
    const row = {
      id: "s2",
      productId: "p1",
      devuelto: true,
      motivoDevolucion: "Talla",
      devueltoEn: "2026-05-13T10:00:00.000Z",
    };
    bffFetchMock.mockResolvedValue({ sale: row });

    await expect(returnDailySaleAtomic("s2", "Talla", "staff")).resolves.toEqual(row);
    expect(bffFetchMock).toHaveBeenCalledWith(
      "/staff/dailySales/return",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("calculatePriceRange redondea montos", () => {
    const range = calculatePriceRange(100, 20, 40, 60);
    expect(range.precioMinimo).toBe(120);
    expect(range.precioSugerido).toBe(140);
    expect(range.precioMaximo).toBe(160);
  });
});
