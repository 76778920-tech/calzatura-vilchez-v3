import { describe, it, expect, beforeEach } from "vitest";
import { clearSensitiveClientStorage } from "@/utils/clientStorageCleanup";

describe("clearSensitiveClientStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("borra carrito y conserva tema", () => {
    localStorage.setItem("calzatura_cart", "[]");
    localStorage.setItem("calzatura_cart:legacy-user", "[]");
    localStorage.setItem("calzatura_theme", "dark");
    sessionStorage.setItem("calzatura_cart:guest", "[]");
    sessionStorage.setItem("calzatura_cart:auth", "[]");
    sessionStorage.setItem("calzatura.pendingVerificationEmail", "a@b.com");
    clearSensitiveClientStorage();
    expect(localStorage.getItem("calzatura_cart")).toBeNull();
    expect(localStorage.getItem("calzatura_cart:legacy-user")).toBeNull();
    expect(localStorage.getItem("calzatura_theme")).toBe("dark");
    expect(sessionStorage.getItem("calzatura_cart:guest")).toBeNull();
    expect(sessionStorage.getItem("calzatura_cart:auth")).toBeNull();
    expect(sessionStorage.getItem("calzatura.pendingVerificationEmail")).toBeNull();
  });
});
