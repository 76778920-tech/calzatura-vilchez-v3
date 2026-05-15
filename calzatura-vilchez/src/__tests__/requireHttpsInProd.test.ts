import { describe, expect, it } from "vitest";
import { assertHttpsInProduction } from "@/utils/requireHttpsInProd";

describe("assertHttpsInProduction", () => {
  it("devuelve cadena vacía si la URL está vacía o solo espacios", () => {
    expect(assertHttpsInProduction("", "X", false)).toBe("");
    expect(assertHttpsInProduction("  \t  ", "X", false)).toBe("");
  });

  it("normaliza espacios y barra final", () => {
    expect(assertHttpsInProduction("  https://api.example.com/  ", "X", false)).toBe("https://api.example.com");
  });

  it("en modo no producción permite http://", () => {
    expect(assertHttpsInProduction("http://localhost:3000", "X", false)).toBe("http://localhost:3000");
  });

  it("en modo no producción acepta https://", () => {
    expect(assertHttpsInProduction("https://b.example.com/", "X", false)).toBe("https://b.example.com");
  });

  it("en producción rechaza http://", () => {
    expect(() => assertHttpsInProduction("http://evil.com", "VITE_FOO", true)).toThrow(
      /VITE_FOO debe usar https:\/\/ en producción/,
    );
  });

  it("en producción acepta https://", () => {
    expect(assertHttpsInProduction("https://ok.example", "X", true)).toBe("https://ok.example");
  });

  it("sin tercer argumento usa import.meta.env.PROD (rama por defecto)", () => {
    expect(assertHttpsInProduction("https://default-arg.example/", "X")).toBe("https://default-arg.example");
  });
});
