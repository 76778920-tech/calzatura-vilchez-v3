import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { validateComplaintPayload } = require("../../bff/libroReclamaciones.cjs") as {
  validateComplaintPayload: (body: Record<string, unknown>) => Record<string, string>;
};

const validBody = {
  tipo: "reclamo",
  nombres: "Juan",
  apellidos: "Pérez",
  dni: "12345678",
  domicilio: "Huancayo",
  telefono: "964052530",
  email: "juan@example.com",
  bienContratado: "Zapatilla",
  monto: "199.90",
  detalle: "Detalle suficiente para el libro de reclamaciones.",
  aceptaPrivacidad: true,
};

describe("validateComplaintPayload (BFF)", () => {
  it("acepta teléfono móvil peruano de 9 dígitos", () => {
    expect(() => validateComplaintPayload(validBody)).not.toThrow();
  });

  it("rechaza teléfono corto", () => {
    expect(() => validateComplaintPayload({ ...validBody, telefono: "12" })).toThrow();
    try {
      validateComplaintPayload({ ...validBody, telefono: "12" });
    } catch (err) {
      const fields = (err as Error & { fields?: Record<string, string> }).fields;
      expect(fields?.telefono).toBe("El teléfono debe tener 9 dígitos.");
    }
  });

  it("rechaza teléfono que no empieza en 9", () => {
    try {
      validateComplaintPayload({ ...validBody, telefono: "887654321" });
    } catch (err) {
      const fields = (err as Error & { fields?: Record<string, string> }).fields;
      expect(fields?.telefono).toBe("El teléfono debe empezar con 9.");
    }
  });
});
