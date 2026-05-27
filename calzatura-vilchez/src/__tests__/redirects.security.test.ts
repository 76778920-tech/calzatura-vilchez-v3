import { describe, it, expect } from "vitest";
import { getLoginUrl, isSafeInternalRedirect, getPostLoginRedirect } from "@/routes/redirects";

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

describe("getLoginUrl", () => {
  it("usa login de tienda para clientes", () => {
    expect(getLoginUrl({ redirect: "/perfil" })).toBe("/login?redirect=%2Fperfil");
  });

  it("usa login admin cuando el destino es el panel", () => {
    expect(getLoginUrl({ redirect: "/admin/pedidos" })).toBe(
      "/admin/login?redirect=%2Fadmin%2Fpedidos",
    );
  });

  it("fuerza login admin con area admin aunque no haya redirect", () => {
    expect(getLoginUrl({ area: "admin" })).toBe("/admin/login");
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
