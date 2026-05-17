import { describe, it, expect, beforeEach } from "vitest";
import {
  assertAllowedBrowserStorageWrite,
  installClientStorageGuard,
} from "@/config/clientStoragePolicy";

describe("client storage guard", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("permite calzatura_theme", () => {
    expect(() => assertAllowedBrowserStorageWrite("calzatura_theme", "dark", "local")).not.toThrow();
  });

  it("bloquea claves con jwt en el nombre", () => {
    expect(() => assertAllowedBrowserStorageWrite("my_jwt_token", "x", "local")).toThrow();
  });

  it("bloquea valores con forma de JWT", () => {
    expect(() =>
      assertAllowedBrowserStorageWrite(
        "calzatura_theme",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.x",
        "local",
      ),
    ).toThrow();
  });

  it("installClientStorageGuard bloquea setItem prohibido", () => {
    installClientStorageGuard();
    expect(() => localStorage.setItem("access_token", "secret")).toThrow();
    localStorage.setItem("calzatura_theme", "light");
    expect(localStorage.getItem("calzatura_theme")).toBe("light");
  });
});
