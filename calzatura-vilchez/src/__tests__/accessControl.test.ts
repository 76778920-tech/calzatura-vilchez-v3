import { describe, it, expect } from "vitest";
import { canAccessArea, isAdminRole } from "@/security/accessControl";

const SUPERADMIN = "76778920@continental.edu.pe";

describe("canAccessArea", () => {
  it("permite acceso sin rol a áreas públicas", () => {
    expect(canAccessArea("publico")).toBe(true);
    expect(canAccessArea("productos")).toBe(true);
    expect(canAccessArea("carrito")).toBe(true);
  });

  it("permite acceso con el rol correcto", () => {
    expect(canAccessArea("clientes", "cliente")).toBe(true);
    expect(canAccessArea("administradores", "admin")).toBe(true);
    expect(canAccessArea("trabajadores", "trabajador")).toBe(true);
    expect(canAccessArea("pedidos", "cliente")).toBe(true);
  });

  it("deniega acceso con rol incorrecto", () => {
    expect(canAccessArea("administradores", "cliente")).toBe(false);
    expect(canAccessArea("fabricantes", "trabajador")).toBe(false);
    expect(canAccessArea("ventas", "cliente")).toBe(false);
  });

  it("deniega acceso sin rol a áreas restringidas", () => {
    expect(canAccessArea("administradores")).toBe(false);
    expect(canAccessArea("clientes", null)).toBe(false);
    expect(canAccessArea("ventas", undefined)).toBe(false);
  });

  it("superadmin accede a cualquier área restringida", () => {
    expect(canAccessArea("administradores", null, SUPERADMIN)).toBe(true);
    expect(canAccessArea("ventas", null, SUPERADMIN)).toBe(true);
    expect(canAccessArea("fabricantes", "cliente", SUPERADMIN)).toBe(true);
  });
});

describe("isAdminRole", () => {
  it("rol admin devuelve true", () => {
    expect(isAdminRole("admin")).toBe(true);
  });

  it("otros roles devuelven false", () => {
    expect(isAdminRole("cliente")).toBe(false);
    expect(isAdminRole("trabajador")).toBe(false);
  });

  it("sin rol devuelve false", () => {
    expect(isAdminRole()).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });

  it("superadmin email devuelve true independiente del rol", () => {
    expect(isAdminRole(null, SUPERADMIN)).toBe(true);
    expect(isAdminRole("cliente", SUPERADMIN)).toBe(true);
  });
});
