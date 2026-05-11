import { describe, it, expect } from "vitest";
import { isSafeInternalRedirect, getPostLoginRedirect } from "@/routes/redirects";

describe("isSafeInternalRedirect (post-login redirect)", () => {
  it("rechaza URLs absolutas y protocol-relative", () => {
    expect(isSafeInternalRedirect(null)).toBe(false);
    expect(isSafeInternalRedirect("https://evil.example/phish")).toBe(false);
    expect(isSafeInternalRedirect("//evil.example/phish")).toBe(false);
    expect(isSafeInternalRedirect("javascript:alert(1)")).toBe(false);
  });

  it("rechaza rutas relativas que contienen esquema http(s) (confusión / phishing)", () => {
    expect(isSafeInternalRedirect("/https://evil.example/phish")).toBe(false);
    expect(isSafeInternalRedirect("/x/http://evil.example/y")).toBe(false);
  });

  it("rechaza caracteres de control y tabulación", () => {
    expect(isSafeInternalRedirect("/a\t/b")).toBe(false);
    expect(isSafeInternalRedirect("/a\x00b")).toBe(false);
  });

  it("acepta rutas internas normales", () => {
    expect(isSafeInternalRedirect("/")).toBe(true);
    expect(isSafeInternalRedirect("/perfil")).toBe(true);
    expect(isSafeInternalRedirect("/admin/pedidos")).toBe(true);
    expect(isSafeInternalRedirect("/producto/abc-123")).toBe(true);
  });
});

describe("getPostLoginRedirect", () => {
  it("no usa redirect inseguro aunque el rol sea cliente", () => {
    const dest = getPostLoginRedirect({
      redirect: "/https://evil.example/",
      role: "cliente",
      email: "a@b.com",
    });
    expect(dest).not.toContain("evil");
    expect(dest).toMatch(/^\//);
  });
});
