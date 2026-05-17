import { describe, it, expect } from "vitest";
import { maskEmailForDisplay } from "@/utils/maskEmail";

describe("maskEmailForDisplay", () => {
  it("enmascara la parte local", () => {
    expect(maskEmailForDisplay("usuario@example.com")).toBe("us*****@example.com");
  });

  it("devuelve texto genérico si no hay @", () => {
    expect(maskEmailForDisplay("invalid")).toBe("tu correo");
  });

  it("devuelve texto genérico si falta dominio tras @", () => {
    expect(maskEmailForDisplay("usuario@")).toBe("tu correo");
    expect(maskEmailForDisplay("  @  ")).toBe("tu correo");
  });

  it("local corto deja un solo carácter visible", () => {
    expect(maskEmailForDisplay("a@test.com")).toBe("a*@test.com");
  });
});
