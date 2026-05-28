import { describe, expect, it, vi } from "vitest";
import { LOGIN_PASSWORD_INPUT_TYPE } from "@/config/authCredentials";
import { requestPasswordReset, validateLoginFields } from "@/domains/publico/utils/loginPageFlow";
import { buildLoginPageViewModel } from "@/domains/publico/utils/loginPageViewModel";

vi.mock("@/domains/usuarios/services/auth", () => ({
  resetPassword: vi.fn().mockResolvedValue(undefined),
}));

describe("loginPageViewModel", () => {
  it("arma textos para login admin", () => {
    const vm = buildLoginPageViewModel(true, false, false);
    expect(vm.pageTitle).toBe("Acceso administrativo");
    expect(vm.formAutoComplete).toBe("off");
  });

  it("arma textos para login cliente", () => {
    const vm = buildLoginPageViewModel(false, true, true);
    expect(vm.pageTitle).toBe("Iniciar sesión");
    expect(vm.passwordInputType).toBe("text");
    expect(LOGIN_PASSWORD_INPUT_TYPE).toBe("password");
    expect(vm.submitLabel).toBe("Ingresando...");
  });
});

describe("loginPageFlow", () => {
  it("valida email y contraseña", () => {
    expect(validateLoginFields("", "abc")).toMatchObject({
      email: expect.any(String),
    });
  });

  it("rechaza recuperación sin correo", async () => {
    const errors = await requestPasswordReset("   ");
    expect(errors.email).toContain("correo");
  });
});
