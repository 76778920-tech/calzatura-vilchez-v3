import { describe, it, expect } from "vitest";
import { maskEmailForDisplay } from "@/utils/maskEmail";

describe("maskEmailForDisplay", () => {
  it("enmascara la parte local", () => {
    expect(maskEmailForDisplay("usuario@example.com")).toBe("us*****@example.com");
  });

  it("devuelve texto genérico si no hay @", () => {
    expect(maskEmailForDisplay("invalid")).toBe("tu correo");
  });
});
