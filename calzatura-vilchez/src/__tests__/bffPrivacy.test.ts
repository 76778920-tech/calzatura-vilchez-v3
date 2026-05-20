import { describe, it, expect } from "vitest";
import { maskEmail, maskPhone, redactOrderForStaff } from "@/security/orderPrivacy";

describe("redactOrderForStaff (PII pedidos trabajador)", () => {
  it("enmascara email, telefono y direccion completa", () => {
    const order = {
      id: "o1",
      userId: "uid-cliente",
      userEmail: "cliente@example.com",
      stripeSessionId: "cs_test",
      direccion: {
        nombre: "Maria",
        apellido: "Lopez",
        telefono: "999888777",
        direccion: "Av. Real 123",
        distrito: "Huancayo",
        ciudad: "Huancayo",
        referencia: "Frente al parque",
      },
    };

    const redacted = redactOrderForStaff(order);
    expect(redacted.userId).toBe("");
    expect(redacted.userEmail).toBe("c***@example.com");
    expect(redacted.stripeSessionId).toBeUndefined();
    expect(redacted.direccion.telefono).toBe("***8777");
    expect(redacted.direccion.direccion).toContain("Huancayo");
    expect(redacted.direccion.referencia).toBeUndefined();
    expect(redacted.direccion.nombre).not.toBe("Maria");
  });

  it("maskEmail y maskPhone son estables", () => {
    expect(maskEmail("a@b.co")).toBe("a***@b.co");
    expect(maskPhone("51999888777")).toBe("***8777");
  });
});
