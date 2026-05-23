/**
 * TC-AUTH-CRED — Cobertura comportamental de validación de contraseña.
 *
 * ISO/IEC 27002:2022 8.2.3 — composición mínima requerida.
 * NIST SP 800-63B — longitud mínima y topes para DoS.
 *
 * Estos tests invocan las funciones reales, no análisis estático de fuente.
 */
import { describe, expect, it } from "vitest";
import {
  MAX_AUTH_PASSWORD_LENGTH,
  MIN_AUTH_PASSWORD_LENGTH,
  validateLoginPasswordLength,
  validateRegisterPasswordComplexity,
  validateRegisterPasswordLength,
} from "@/config/authCredentials";

// ─── ISO 27002 8.2.3 — complejidad ───────────────────────────────────────────
describe("validateRegisterPasswordComplexity", () => {
  it("rechaza contraseña sin mayúscula", () => {
    expect(validateRegisterPasswordComplexity("abcdefg1")).not.toBeNull();
  });

  it("rechaza contraseña sin dígito", () => {
    expect(validateRegisterPasswordComplexity("Abcdefgh")).not.toBeNull();
  });

  it("rechaza contraseña solo minúsculas sin dígito", () => {
    expect(validateRegisterPasswordComplexity("abcdefgh")).not.toBeNull();
  });

  it("rechaza contraseña solo dígitos", () => {
    expect(validateRegisterPasswordComplexity("12345678")).not.toBeNull();
  });

  it("rechaza contraseña solo mayúsculas sin dígito", () => {
    expect(validateRegisterPasswordComplexity("ABCDEFGH")).not.toBeNull();
  });

  it("rechaza contraseña vacía", () => {
    expect(validateRegisterPasswordComplexity("")).not.toBeNull();
  });

  it("acepta contraseña con mayúscula y dígito", () => {
    expect(validateRegisterPasswordComplexity("Abcdefg1")).toBeNull();
  });

  it("acepta contraseña compleja con símbolo", () => {
    expect(validateRegisterPasswordComplexity("SecurePass123!")).toBeNull();
  });

  it("acepta contraseña con mayúscula al final", () => {
    expect(validateRegisterPasswordComplexity("abcdefg1A")).toBeNull();
  });

  it("acepta contraseña con dígito al inicio", () => {
    expect(validateRegisterPasswordComplexity("1Abcdefg")).toBeNull();
  });

  it("mensaje de error menciona mayúscula cuando falta", () => {
    const msg = validateRegisterPasswordComplexity("abcdefg1");
    expect(msg).toContain("mayúscula");
  });

  it("mensaje de error menciona número cuando falta", () => {
    const msg = validateRegisterPasswordComplexity("Abcdefgh");
    expect(msg).toContain("número");
  });
});

// ─── Longitud para registro ───────────────────────────────────────────────────
describe("validateRegisterPasswordLength", () => {
  it(`rechaza contraseñas más cortas que ${MIN_AUTH_PASSWORD_LENGTH} caracteres`, () => {
    expect(validateRegisterPasswordLength("Ab1")).not.toBeNull();
  });

  it(`rechaza exactamente ${MIN_AUTH_PASSWORD_LENGTH - 1} caracteres`, () => {
    expect(
      validateRegisterPasswordLength("A1" + "a".repeat(MIN_AUTH_PASSWORD_LENGTH - 3)),
    ).not.toBeNull();
  });

  it(`acepta exactamente ${MIN_AUTH_PASSWORD_LENGTH} caracteres`, () => {
    expect(
      validateRegisterPasswordLength("A1" + "a".repeat(MIN_AUTH_PASSWORD_LENGTH - 2)),
    ).toBeNull();
  });

  it(`rechaza contraseñas más largas que ${MAX_AUTH_PASSWORD_LENGTH} caracteres`, () => {
    expect(
      validateRegisterPasswordLength("A1" + "a".repeat(MAX_AUTH_PASSWORD_LENGTH)),
    ).not.toBeNull();
  });

  it(`acepta exactamente ${MAX_AUTH_PASSWORD_LENGTH} caracteres`, () => {
    expect(
      validateRegisterPasswordLength("A1" + "a".repeat(MAX_AUTH_PASSWORD_LENGTH - 2)),
    ).toBeNull();
  });

  it("acepta contraseña con longitud válida", () => {
    expect(validateRegisterPasswordLength("Abcdef1!")).toBeNull();
  });
});

// ─── Longitud para login (solo tope superior) ─────────────────────────────────
describe("validateLoginPasswordLength", () => {
  it(`rechaza contraseñas más largas que ${MAX_AUTH_PASSWORD_LENGTH} en login`, () => {
    expect(
      validateLoginPasswordLength("a".repeat(MAX_AUTH_PASSWORD_LENGTH + 1)),
    ).not.toBeNull();
  });

  it(`acepta exactamente ${MAX_AUTH_PASSWORD_LENGTH} caracteres en login`, () => {
    expect(validateLoginPasswordLength("a".repeat(MAX_AUTH_PASSWORD_LENGTH))).toBeNull();
  });

  it("acepta contraseña corta en login (Firebase impone su propio mínimo)", () => {
    expect(validateLoginPasswordLength("abc")).toBeNull();
  });
});
