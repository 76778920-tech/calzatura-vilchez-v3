import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const cartContextSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/domains/carrito/context/CartContext.tsx"),
  "utf8",
);
const storagePolicySource = fs.readFileSync(
  path.resolve(process.cwd(), "src/config/clientStoragePolicy.ts"),
  "utf8",
);
const authSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/domains/usuarios/services/auth.ts"),
  "utf8",
);

describe("Carrito sessionStorage guards", () => {
  it("persiste en sessionStorage sin clave por UID", () => {
    expect(cartContextSource).toContain('const CART_GUEST_SESSION_KEY = "calzatura_cart:guest"');
    expect(cartContextSource).toContain('const CART_AUTH_SESSION_KEY = "calzatura_cart:auth"');
    expect(cartContextSource).toContain("writeSessionCart(activeCartStorageKey(uid), newItems)");
    expect(cartContextSource).toContain("sessionStorage.setItem(key, JSON.stringify(items))");
    expect(cartContextSource).not.toMatch(/localStorage\.setItem\([^)]*cartStorageKey/);
    expect(cartContextSource).not.toMatch(/localStorage\.setItem\([^)]*CART_STORAGE_KEY/);
  });

  it("migra y elimina claves legacy en localStorage", () => {
    expect(cartContextSource).toContain("removeLegacyCartKeys");
    expect(cartContextSource).toContain("legacyCartStorageKey(userUid)");
    expect(cartContextSource).toContain("readCartFromStorage(localStorage");
    expect(cartContextSource).toContain("writeSessionCart(sessionKey, legacyGuestItems)");
  });

  it("limpia carrito de sesion auth solo al cambiar entre dos cuentas", () => {
    expect(cartContextSource).toContain("prevCartUidRef");
    expect(cartContextSource).toMatch(/if \(prevUid && userUid && prevUid !== userUid\)/);
    expect(cartContextSource).toContain("sessionStorage.removeItem(CART_AUTH_SESSION_KEY)");
  });

  it("politica y logout alineados con sessionStorage transitorio", () => {
    expect(storagePolicySource).toContain('key: "calzatura_cart:guest", backend: "sessionStorage"');
    expect(storagePolicySource).toContain('key: "calzatura_cart:auth", backend: "sessionStorage"');
    expect(authSource).toContain("clearSensitiveClientStorage");
  });
});
