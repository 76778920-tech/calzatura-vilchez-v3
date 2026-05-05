import { describe, it, expect, vi, afterAll } from "vitest";
import { supabase } from "@/supabase/client";
import {
  fetchPublicProducts,
  fetchPublicProductById,
  fetchPublicProductsByIds,
  fetchProductFamilyGroupCounts,
  fetchProducts,
} from "@/domains/productos/services/products";
import type { Product } from "@/types";

type Payload = { data: unknown; error: unknown };

function createProductosQueryMock(record: {
  eqCalls: [string, unknown][];
  selectArg?: string;
  inCalls: [string, unknown[]][];
  maybeSinglePayload: Payload;
  selectChainPayload: Payload;
}) {
  const root = {
    select: vi.fn((cols: string) => {
      record.selectArg = cols;
      return root;
    }),
    eq: vi.fn((col: string, val: unknown) => {
      record.eqCalls.push([col, val]);
      return root;
    }),
    in: vi.fn((col: string, vals: unknown[]) => {
      record.inCalls.push([col, vals]);
      return root;
    }),
    or: vi.fn(() => root),
    order: vi.fn(() => root),
    maybeSingle: vi.fn(() => Promise.resolve(record.maybeSinglePayload)),
    single: vi.fn(() => Promise.resolve(record.maybeSinglePayload)),
    then(onFulfilled: (v: Payload) => unknown, onRejected?: (e: unknown) => unknown) {
      return Promise.resolve(record.selectChainPayload).then(onFulfilled, onRejected);
    },
  };
  return root as unknown as ReturnType<typeof supabase.from>;
}

describe("visibilidad tienda pública (activo)", () => {
  afterAll(() => {
    vi.mocked(supabase.from).mockReset();
    vi.mocked(supabase.from).mockImplementation(
      () =>
        ({
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          upsert: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }) as unknown as ReturnType<typeof supabase.from>
    );
  });

  it("fetchPublicProducts aplica eq(activo, true) y resuelve lista", async () => {
    const record = {
      eqCalls: [] as [string, unknown][],
      selectArg: undefined as string | undefined,
      inCalls: [] as [string, unknown[]][],
      maybeSinglePayload: { data: null, error: null },
      selectChainPayload: {
        data: [{ id: "x", nombre: "Test", activo: true }],
        error: null,
      },
    };
    vi.mocked(supabase.from).mockImplementation(() => createProductosQueryMock(record));

    const rows = await fetchPublicProducts();
    expect(record.selectArg).toBe("*");
    expect(record.eqCalls).toEqual([["activo", true]]);
    expect(rows).toHaveLength(1);
    expect((rows[0] as Product).id).toBe("x");
  });

  it("fetchPublicProductById exige id y activo true (maybeSingle)", async () => {
    const record = {
      eqCalls: [] as [string, unknown][],
      selectArg: undefined as string | undefined,
      inCalls: [] as [string, unknown[]][],
      maybeSinglePayload: {
        data: { id: "abc", nombre: "Visible", activo: true },
        error: null,
      },
      selectChainPayload: { data: null, error: null },
    };
    vi.mocked(supabase.from).mockImplementation(() => createProductosQueryMock(record));

    const p = await fetchPublicProductById("abc");
    expect(record.eqCalls).toEqual([
      ["id", "abc"],
      ["activo", true],
    ]);
    expect(p?.id).toBe("abc");
  });

  it("fetchPublicProductById devuelve null si no hay fila activa", async () => {
    const record = {
      eqCalls: [] as [string, unknown][],
      selectArg: undefined as string | undefined,
      inCalls: [] as [string, unknown[]][],
      maybeSinglePayload: { data: null, error: null },
      selectChainPayload: { data: null, error: null },
    };
    vi.mocked(supabase.from).mockImplementation(() => createProductosQueryMock(record));

    const p = await fetchPublicProductById("oculto");
    expect(p).toBeNull();
  });

  it("fetchPublicProductsByIds filtra activo y conserva orden de ids", async () => {
    const record = {
      eqCalls: [] as [string, unknown][],
      selectArg: undefined as string | undefined,
      inCalls: [] as [string, unknown[]][],
      maybeSinglePayload: { data: null, error: null },
      selectChainPayload: {
        data: [
          { id: "b", nombre: "B", activo: true },
          { id: "a", nombre: "A", activo: true },
        ],
        error: null,
      },
    };
    vi.mocked(supabase.from).mockImplementation(() => createProductosQueryMock(record));

    const ordered = await fetchPublicProductsByIds(["a", "b", "missing"]);
    expect(record.inCalls).toEqual([["id", ["a", "b", "missing"]]]);
    expect(record.eqCalls).toEqual([["activo", true]]);
    expect(ordered.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("fetchProductFamilyGroupCounts solo pide filas activas", async () => {
    const record = {
      eqCalls: [] as [string, unknown][],
      selectArg: undefined as string | undefined,
      inCalls: [] as [string, unknown[]][],
      maybeSinglePayload: { data: null, error: null },
      selectChainPayload: {
        data: [
          { id: "1", familiaId: "fam" },
          { id: "2", familiaId: "fam" },
        ],
        error: null,
      },
    };
    vi.mocked(supabase.from).mockImplementation(() => createProductosQueryMock(record));

    const counts = await fetchProductFamilyGroupCounts();
    expect(record.selectArg).toBe("id, familiaId");
    expect(record.eqCalls).toEqual([["activo", true]]);
    expect(counts.fam).toBe(2);
  });

  it("fetchProducts (admin) no filtra por activo", async () => {
    const record = {
      eqCalls: [] as [string, unknown][],
      selectArg: undefined as string | undefined,
      inCalls: [] as [string, unknown[]][],
      maybeSinglePayload: { data: null, error: null },
      selectChainPayload: {
        data: [
          { id: "1", activo: false },
          { id: "2", activo: true },
        ],
        error: null,
      },
    };
    vi.mocked(supabase.from).mockImplementation(() => createProductosQueryMock(record));

    const all = await fetchProducts();
    expect(record.eqCalls).toEqual([]);
    expect(all).toHaveLength(2);
  });
});
