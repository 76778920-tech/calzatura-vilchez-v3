import { describe, expect, it } from "vitest";
import { BUSINESS_CONTACT } from "@/config/businessContact";
import {
  formatComplaintMessage,
  generateComplaintCode,
  validateComplaintForm,
  type ComplaintFormData,
} from "@/domains/publico/utils/complaintBook";

const validBase: ComplaintFormData = {
  tipo: "reclamo",
  nombres: "Juan",
  apellidos: "Pérez",
  dni: "12345678",
  domicilio: "Av. Ejemplo 123, Huancayo",
  telefono: "964052530",
  email: "juan@example.com",
  bienContratado: "Zapatilla talla 40",
  monto: "199.90",
  numeroPedido: "ORD-1",
  detalle: "Producto con defecto en suela. Solicito cambio o reembolso.",
};

describe("complaintBook", () => {
  it("genera código con prefijo CV-LR", () => {
    const code = generateComplaintCode(new Date("2026-05-26T12:00:00Z"));
    expect(code).toMatch(/^CV-LR-20260526-[A-Z0-9]{6}$/);
  });

  it("valida formulario completo sin errores", () => {
    expect(validateComplaintForm(validBase, true)).toEqual({});
  });

  it("exige monto en reclamo y privacidad", () => {
    const errors = validateComplaintForm({ ...validBase, monto: "" }, false);
    expect(errors.monto).toBeTruthy();
    expect(errors.aceptaPrivacidad).toBeTruthy();
  });

  it("incluye RUC en mensaje WhatsApp", () => {
    const msg = formatComplaintMessage(validBase, "CV-LR-20260526-ABC123");
    expect(msg).toContain(BUSINESS_CONTACT.rucDisplay);
    expect(msg).toContain("CV-LR-20260526-ABC123");
  });
});
