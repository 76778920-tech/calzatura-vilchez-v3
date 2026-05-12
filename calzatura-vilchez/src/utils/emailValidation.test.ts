import { describe, expect, it } from "vitest";
import { isValidEmailFormat, normalizeEmailInput, validateEmailFormat } from "./emailValidation";

describe("emailValidation", () => {
  it("normalizeEmailInput trims and lowercases", () => {
    expect(normalizeEmailInput("  User@GMAIL.COM  ")).toBe("user@gmail.com");
  });

  it("rejects empty", () => {
    expect(validateEmailFormat("")).toBe("Ingrese un correo electrónico");
    expect(validateEmailFormat("   ")).toBe("Ingrese un correo electrónico");
  });

  it("accepts common Peru-style addresses", () => {
    expect(validateEmailFormat("cliente@gmail.com")).toBeNull();
    expect(validateEmailFormat("a@empresa.com.pe")).toBeNull();
    expect(validateEmailFormat("info@midominio.gob.pe")).toBeNull();
    expect(validateEmailFormat("x@hotmail.com")).toBeNull();
  });

  it("rejects invalid formats", () => {
    expect(validateEmailFormat("sinarroba")).toBe("Formato de correo no válido");
    expect(validateEmailFormat("@nodomain.com")).toBe("Formato de correo no válido");
    expect(validateEmailFormat("a@b")).toBe("Formato de correo no válido");
  });

  it("accepts trimming, uppercase domains, and plus tags", () => {
    expect(validateEmailFormat("  User.Name+ventas@Empresa.COM.PE  ")).toBeNull();
  });

  it("rejects invalid domain labels and dot placement", () => {
    expect(validateEmailFormat("user@foo_bar.com")).not.toBeNull();
    expect(validateEmailFormat("user@-empresa.com")).not.toBeNull();
    expect(validateEmailFormat("user@empresa-.com")).not.toBeNull();
    expect(validateEmailFormat(".user@gmail.com")).not.toBeNull();
    expect(validateEmailFormat("user.@gmail.com")).not.toBeNull();
    expect(validateEmailFormat("user..name@gmail.com")).not.toBeNull();
  });

  it("rejects excessively long address (input limit)", () => {
    const longLocal = "a".repeat(92);
    expect(validateEmailFormat(`${longLocal}@gmail.com`)).toMatch(/100/);
  });

  it("isValidEmailFormat mirrors validateEmailFormat", () => {
    expect(isValidEmailFormat("ok@test.com")).toBe(true);
    expect(isValidEmailFormat("bad")).toBe(false);
  });
});
