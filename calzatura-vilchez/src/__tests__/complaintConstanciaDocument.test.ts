import { describe, expect, it } from "vitest";
import { buildComplaintConstanciaHtml } from "@/domains/publico/utils/complaintConstanciaHtml";

const submission = {
  tipo: "reclamo" as const,
  nombres: "Juan",
  apellidos: "Pérez",
  dni: "12345678",
  domicilio: "Huancayo",
  telefono: "964052530",
  email: "juan@example.com",
  bienContratado: "Zapatilla",
  monto: "199.90",
  numeroPedido: "",
  detalle: "Producto con defecto.",
  codigo: "CV-LR-20260527-ABC123",
  submittedAt: "2026-05-27T15:00:00.000Z",
};

describe("complaintConstanciaDocument", () => {
  it("incluye datos legales y código de registro", () => {
    const html = buildComplaintConstanciaHtml(submission);
    expect(html).toContain("Constancia de registro");
    expect(html).toContain("CV-LR-20260527-ABC123");
    expect(html).toContain("10-20028187-5");
    expect(html).toContain("RECLAMO");
    expect(html).toContain("Ley N.° 29571");
    expect(html).not.toContain("<script");
  });

  it("escapa contenido del consumidor", () => {
    const html = buildComplaintConstanciaHtml({
      ...submission,
      detalle: '<img src=x onerror="alert(1)">',
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
