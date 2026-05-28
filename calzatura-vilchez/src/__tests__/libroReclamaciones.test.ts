import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComplaintFormData } from "@/domains/publico/utils/complaintBook";

const { getBackendApiBaseUrlMock } = vi.hoisted(() => ({
  getBackendApiBaseUrlMock: vi.fn(() => "https://bff.test"),
}));

vi.mock("@/config/apiBackend", () => ({
  getBackendApiBaseUrl: getBackendApiBaseUrlMock,
}));

import {
  lookupComplaintByCode,
  submitComplaintToServer,
} from "@/domains/publico/services/libroReclamaciones";

const validPayload: ComplaintFormData = {
  tipo: "reclamo",
  nombres: "Juan",
  apellidos: "Pérez",
  dni: "12345678",
  domicilio: "Huancayo",
  telefono: "964052530",
  email: "juan@example.com",
  bienContratado: "Zapatilla",
  monto: "199.90",
  numeroPedido: "",
  detalle: "Detalle suficiente para el libro de reclamaciones.",
};

describe("libroReclamaciones", () => {
  beforeEach(() => {
    getBackendApiBaseUrlMock.mockReturnValue("https://bff.test");
  });

  it("rechaza envío si no hay URL del BFF", async () => {
    getBackendApiBaseUrlMock.mockReturnValue("");
    await expect(submitComplaintToServer(validPayload, true)).rejects.toThrow(
      /no está disponible/i,
    );
  });

  it("registra reclamo cuando el BFF responde OK", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        codigo: "CV-LR-20260527-ABC123",
        submittedAt: "2026-05-27T12:00:00.000Z",
        complaint: { codigo: "CV-LR-20260527-ABC123", estado: "recibido" },
      }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await submitComplaintToServer(validPayload, true);
    expect(result.codigo).toBe("CV-LR-20260527-ABC123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://bff.test/libro-reclamaciones",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("propaga mensaje de campo del BFF", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ fields: { email: "Correo no válido" } }),
    }) as typeof fetch;

    await expect(submitComplaintToServer(validPayload, true)).rejects.toThrow(
      /Correo no válido/i,
    );
  });

  it("informa fallo de red", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network")) as typeof fetch;
    await expect(submitComplaintToServer(validPayload, true)).rejects.toThrow(
      /No se pudo conectar/i,
    );
  });

  it("consulta estado por codigo + dni", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        complaint: {
          codigo: "CV-LR-20260527-ABC123",
          tipo: "reclamo",
          estado: "en_tramite",
          creadoEn: "2026-05-27T12:00:00.000Z",
        },
      }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(lookupComplaintByCode("cv-lr-20260527-abc123", "12345678")).resolves.toEqual({
      codigo: "CV-LR-20260527-ABC123",
      tipo: "reclamo",
      estado: "en_tramite",
      creadoEn: "2026-05-27T12:00:00.000Z",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://bff.test/libro-reclamaciones/consulta-codigo?codigo=CV-LR-20260527-ABC123&dni=12345678",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
