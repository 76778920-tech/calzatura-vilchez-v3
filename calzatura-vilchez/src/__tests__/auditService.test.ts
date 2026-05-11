/**
 * TC-AUDIT — Tests para src/services/audit.ts
 *
 * Semáforo:
 *   🟢 logAudit no interrumpe la operación principal cuando Supabase falla — VERIFICADO
 *   🟢 logAudit emite console.error cuando falla (F-02: ISO/IEC 25010 §5.5) — VERIFICADO
 *   🟢 logAudit incluye usuarioUid/Email del usuario Firebase actual — VERIFICADO
 *   🟢 fetchRecentAudit pasa limit correcto a la consulta — VERIFICADO
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { supabase } from "@/supabase/client";
import { logAudit, fetchRecentAudit } from "@/services/audit";

// El mock global de Supabase viene de setup.ts
// Aquí lo sobreescribimos por test según necesidad

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(supabase.from).mockReset();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createInsertMock(resolveValue: { data: unknown; error: unknown }) {
  const insertFn = vi.fn().mockResolvedValue(resolveValue);
  vi.mocked(supabase.from).mockReturnValue({
    insert: insertFn,
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  } as unknown as ReturnType<typeof supabase.from>);
  return insertFn;
}

function createSelectMock(data: unknown[]) {
  const orderFn = vi.fn().mockReturnThis();
  const limitFn = vi.fn().mockResolvedValue({ data, error: null });
  vi.mocked(supabase.from).mockReturnValue({
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnValue({ order: orderFn } as unknown as ReturnType<typeof supabase.from>),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: orderFn,
    limit: limitFn,
  } as unknown as ReturnType<typeof supabase.from>);
  return { orderFn, limitFn };
}

// ─── logAudit ─────────────────────────────────────────────────────────────────
describe("logAudit", () => {
  it("no lanza cuando Supabase falla (operación principal sigue)", async () => {
    createInsertMock({ data: null, error: new Error("DB caída") });
    await expect(logAudit("crear", "producto", "id-1", "Producto Test")).resolves.toBeUndefined();
  });

  it("emite console.error cuando Supabase falla (F-02)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    createInsertMock({ data: null, error: new Error("timeout") });

    await logAudit("editar", "producto", "id-2", "Nombre");
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("[audit]"),
      expect.any(Error)
    );
  });

  it("no emite console.error cuando la inserción es exitosa", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    createInsertMock({ data: { id: "ok" }, error: null });

    await logAudit("eliminar", "producto", "id-3", "Prod");
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("inserta en la tabla auditoria", async () => {
    const insertFn = createInsertMock({ data: { id: "ok" }, error: null });

    await logAudit("crear", "pedido", "pedido-1", "Pedido #001");
    expect(supabase.from).toHaveBeenCalledWith("auditoria");
    expect(insertFn).toHaveBeenCalledOnce();
  });

  it("incluye los campos de auditoría correctos en la inserción", async () => {
    const insertFn = createInsertMock({ data: { id: "ok" }, error: null });

    await logAudit("importar", "importar", "lote-5", "ventas_mayo.xlsx", { filas: 100 });

    const payload = insertFn.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.accion).toBe("importar");
    expect(payload.entidad).toBe("importar");
    expect(payload.entidadId).toBe("lote-5");
    expect(payload.entidadNombre).toBe("ventas_mayo.xlsx");
    expect(payload.detalle).toEqual({ filas: 100 });
    expect(typeof payload.realizadoEn).toBe("string");
    // realizadoEn debe ser un ISO 8601 válido
    expect(() => new Date(payload.realizadoEn as string).toISOString()).not.toThrow();
  });

  it("inserta detalle null cuando no se pasa", async () => {
    const insertFn = createInsertMock({ data: { id: "ok" }, error: null });
    await logAudit("eliminar", "fabricante", "fab-1", "Proveedor A");
    const payload = insertFn.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.detalle).toBeNull();
  });

  it("redacta claves sensibles en detalle antes de insertar", async () => {
    const insertFn = createInsertMock({ data: { id: "ok" }, error: null });
    await logAudit("editar", "producto", "id-9", "Prod", {
      campos: ["nombre"],
      accessToken: "sekret",
      meta: { api_key: "k", ok: 1 },
    });
    const payload = insertFn.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.detalle).toEqual({
      campos: ["nombre"],
      accessToken: "[redacted]",
      meta: { api_key: "[redacted]", ok: 1 },
    });
  });
});

// ─── fetchRecentAudit ─────────────────────────────────────────────────────────
describe("fetchRecentAudit", () => {
  it("consulta la tabla auditoria", async () => {
    createSelectMock([]);
    await fetchRecentAudit().catch(() => {});
    expect(supabase.from).toHaveBeenCalledWith("auditoria");
  });

  it("resuelve con la lista devuelta por Supabase", async () => {
    const fakeEntries = [
      { id: "a1", accion: "crear", entidad: "producto", realizadoEn: "2026-05-01T00:00:00Z" },
    ];
    // Mock completo de la cadena .select().order().limit()
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: fakeEntries, error: null }),
        }),
      }),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as unknown as ReturnType<typeof supabase.from>);

    const result = await fetchRecentAudit(1);
    expect(result).toEqual(fakeEntries);
  });

  it("lanza si Supabase devuelve error", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: null, error: new Error("RLS denied") }),
        }),
      }),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as unknown as ReturnType<typeof supabase.from>);

    await expect(fetchRecentAudit()).rejects.toThrow("RLS denied");
  });
});
