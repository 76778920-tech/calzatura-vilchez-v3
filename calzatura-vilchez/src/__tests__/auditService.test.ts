/**
 * TC-AUDIT - Auditoria por BFF con service_role.
 *
 * Semaforo:
 *   VERDE logAudit no interrumpe la operacion principal si el BFF falla.
 *   VERDE logAudit redacta secretos y PII antes de salir del navegador.
 *   VERDE fetchRecentAudit lee solo por BFF/admin, no por Supabase directo.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { bffFetch } from "@/utils/bffClient";
import { fetchRecentAudit, logAudit } from "@/services/audit";

vi.mock("@/utils/bffClient", () => ({
  bffFetch: vi.fn(),
}));

const mockedBffFetch = vi.mocked(bffFetch);

afterEach(() => {
  vi.restoreAllMocks();
  mockedBffFetch.mockReset();
});

describe("logAudit", () => {
  it("no lanza cuando el BFF falla", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockedBffFetch.mockRejectedValue(new Error("service_role denied"));

    await expect(logAudit("crear", "producto", "id-1", "Producto Test")).resolves.toBeUndefined();
  });

  it("emite console.error cuando el BFF falla", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedBffFetch.mockRejectedValue(new Error("timeout"));

    await logAudit("editar", "producto", "id-2", "Nombre");

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("[audit]"),
      expect.any(Error),
    );
  });

  it("envia el evento al endpoint BFF de auditoria", async () => {
    mockedBffFetch.mockResolvedValue({ ok: true });

    await logAudit("crear", "pedido", "pedido-1", "Pedido #001", { filas: 2 });

    expect(mockedBffFetch).toHaveBeenCalledWith("/audit", {
      method: "POST",
      body: expect.any(String),
    });
    const body = JSON.parse(mockedBffFetch.mock.calls[0][1]?.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      accion: "crear",
      entidad: "pedido",
      entidadId: "pedido-1",
      entidadNombre: "pedido:pedido-1",
      detalle: { filas: 2 },
    });
  });

  it("redacta PII y secretos antes de enviar detalle y normaliza labels de usuario", async () => {
    mockedBffFetch.mockResolvedValue({ ok: true });

    await logAudit("editar", "usuario", "uid-1", "cliente@example.com", {
      dni: "12345678",
      email: "cliente@example.com",
      telefono: "999999999",
      direccion: "Av. Siempre Viva 123",
      accessToken: "sekret",
      meta: { api_key: "k", ok: 1 },
    });

    const body = JSON.parse(mockedBffFetch.mock.calls[0][1]?.body as string) as {
      entidadNombre: string;
      detalle: Record<string, unknown>;
    };
    expect(body.entidadNombre).toBe("usuario:uid-1");
    expect(body.detalle).toEqual({
      dni: "[redacted]",
      email: "[redacted]",
      telefono: "[redacted]",
      direccion: "[redacted]",
      accessToken: "[redacted]",
      meta: { api_key: "[redacted]", ok: 1 },
    });
  });

  it("usa referencias seguras para fabricante aunque el label contenga nombres", async () => {
    mockedBffFetch.mockResolvedValue({ ok: true });

    await logAudit("crear", "fabricante", "fab-abc123", "Juan Perez — MarcaX");

    const body = JSON.parse(mockedBffFetch.mock.calls[0][1]?.body as string) as {
      entidadNombre: string;
    };
    expect(body.entidadNombre).toBe("fabricante:b-abc123");
  });

  it("usa referencia segura por lote en importaciones", async () => {
    mockedBffFetch.mockResolvedValue({ ok: true });

    await logAudit("importar", "importar", "lote-2026", "Productos");

    const body = JSON.parse(mockedBffFetch.mock.calls[0][1]?.body as string) as {
      entidadNombre: string;
    };
    expect(body.entidadNombre).toBe("importar:ote-2026");
  });
});

describe("fetchRecentAudit", () => {
  it("consulta auditoria reciente por BFF con limite normalizado", async () => {
    const entries = [
      { id: "a1", accion: "crear", entidad: "producto", realizadoEn: "2026-05-01T00:00:00Z" },
    ];
    mockedBffFetch.mockResolvedValue({ entries });

    const result = await fetchRecentAudit(250);

    expect(mockedBffFetch).toHaveBeenCalledWith("/admin/audit?limit=100");
    expect(result).toEqual(entries);
  });

  it("propaga errores de lectura admin", async () => {
    mockedBffFetch.mockRejectedValue(new Error("Solo administradores"));

    await expect(fetchRecentAudit()).rejects.toThrow("Solo administradores");
  });
});
