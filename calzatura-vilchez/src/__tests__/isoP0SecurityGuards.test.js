/**
 * Guards de regresión ISO para los cambios P0/P1 implementados.
 *
 * Estos tests verifican que las correcciones de seguridad no sean revertidas
 * accidentalmente por futuros cambios al código.
 *
 * ISO/IEC 27001:2022 — A.5.15, A.8.9, A.8.15, A.8.24, A.8.26
 * ISO/IEC 27002:2022 — 8.2.3
 * PCI DSS v4.0 — 3.5, 6.5
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const serverSource = fs.readFileSync(
  path.resolve(process.cwd(), "bff/server.cjs"),
  "utf8",
);
const securitySource = fs.readFileSync(
  path.resolve(process.cwd(), "src/config/security.ts"),
  "utf8",
);
const authCredSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/config/authCredentials.ts"),
  "utf8",
);

// ─── ISO 27001 A.5.15 — Gestión de identidades ───────────────────────────────
describe("ISO A.5.15 — email superadmin no hardcodeado", () => {
  it("server.cjs no contiene email hardcodeado", () => {
    // El email solo debe venir de process.env.SUPERADMIN_EMAILS
    expect(serverSource).not.toMatch(/["'`][^"'`]*@continental\.edu\.pe["'`]/);
    expect(serverSource).not.toMatch(/["'`][^"'`]*@gmail\.com["'`]/);
  });

  it("security.ts solo usa variable de entorno, sin defaults hardcodeados", () => {
    expect(securitySource).not.toMatch(/["'`][^"'`]*@[^"'`]+["'`]/);
    expect(securitySource).toContain("VITE_SUPERADMIN_EMAILS");
  });

  it("security.ts deshabilita isSuperAdminEmail en producción (guard PROD)", () => {
    expect(securitySource).toContain("import.meta.env.PROD");
    expect(securitySource).toContain("return false");
  });

  it("loadSuperadminEmails en BFF solo lee process.env", () => {
    const fn = serverSource.match(/function loadSuperadminEmails\(\)\s*\{[^}]+\}/s)?.[0] ?? "";
    expect(fn).toContain("process.env.SUPERADMIN_EMAILS");
    expect(fn).not.toMatch(/@/);
  });
});

// ─── ISO 27001 A.8.15 — Logging de acciones privilegiadas ────────────────────
describe("ISO A.8.15 — audit trail en endpoints privilegiados", () => {
  it("PATCH /admin/users/:uid/role registra cambio de rol", () => {
    const block = serverSource.match(
      /app\.patch\(["']\/admin\/users\/:uid\/role["'][\s\S]*?(?=app\.\w+\()/
    )?.[0] ?? "";
    expect(block).toContain("logAuditFn");
    expect(block).toContain('"cambiar_rol"');
  });

  it("DELETE /admin/users/:uid registra eliminación de usuario", () => {
    const block = serverSource.match(
      /app\.delete\(["']\/admin\/users\/:uid["'][\s\S]*?(?=app\.\w+\()/
    )?.[0] ?? "";
    expect(block).toContain("logAuditFn");
    expect(block).toContain('"eliminar"');
  });

  it("PUT /admin/productFinanzas registra edición de datos financieros", () => {
    const block = serverSource.match(
      /app\.put\(["']\/admin\/productFinanzas\/:productId["'][\s\S]*?(?=app\.\w+\()/
    )?.[0] ?? "";
    expect(block).toContain("logAuditFn");
    expect(block).toContain('"editar"');
    expect(block).toContain('"productoFinanzas"');
  });

  it("DELETE /admin/productFinanzas registra eliminación de datos financieros", () => {
    const block = serverSource.match(
      /app\.delete\(["']\/admin\/productFinanzas\/:productId["'][\s\S]*?(?=app\.\w+\()/
    )?.[0] ?? "";
    expect(block).toContain("logAuditFn");
    expect(block).toContain('"eliminar"');
    expect(block).toContain('"productoFinanzas"');
  });

  it("PATCH /admin/manufacturers registra edición de fabricante", () => {
    const block = serverSource.match(
      /app\.patch\(["']\/admin\/manufacturers\/:manufacturerId["'][\s\S]*?(?=app\.\w+\()/
    )?.[0] ?? "";
    expect(block).toContain("logAuditFn");
  });

  it("DELETE /admin/manufacturers registra eliminación de fabricante", () => {
    const block = serverSource.match(
      /app\.delete\(["']\/admin\/manufacturers\/:manufacturerId["'][\s\S]*?(?=app\.\w+\()/
    )?.[0] ?? "";
    expect(block).toContain("logAuditFn");
  });
});

// ─── ISO 27001 A.8.9 — Headers de seguridad HTTP ─────────────────────────────
describe("ISO A.8.9 — headers de seguridad en applyCorsHeaders", () => {
  it("incluye X-Content-Type-Options: nosniff", () => {
    expect(serverSource).toContain('"X-Content-Type-Options"');
    expect(serverSource).toContain('"nosniff"');
  });

  it("incluye X-Frame-Options: DENY", () => {
    expect(serverSource).toContain('"X-Frame-Options"');
    expect(serverSource).toContain('"DENY"');
  });

  it("incluye Referrer-Policy", () => {
    expect(serverSource).toContain('"Referrer-Policy"');
    expect(serverSource).toContain('"strict-origin-when-cross-origin"');
  });

  it("incluye HSTS solo en producción", () => {
    expect(serverSource).toContain('"Strict-Transport-Security"');
    expect(serverSource).toContain("isProductionRuntime()");
    expect(serverSource).toContain("max-age=31536000");
  });

  it("incluye Permissions-Policy", () => {
    expect(serverSource).toContain('"Permissions-Policy"');
    expect(serverSource).toContain("geolocation=()");
  });
});

// ─── ISO 27001 A.8.26 — CORS incluye método PUT ──────────────────────────────
describe("ISO A.8.26 — CORS permite método PUT", () => {
  it("applyCorsHeaders declara PUT en Access-Control-Allow-Methods", () => {
    expect(serverSource).toContain("GET,POST,PUT,DELETE,PATCH,OPTIONS");
  });

  it("configuración cors() también incluye PUT", () => {
    expect(serverSource).toContain('"PUT"');
  });
});

// ─── ISO 27002 8.2.3 — Complejidad de contraseña ─────────────────────────────
describe("ISO 27002 8.2.3 — validación de complejidad de contraseña", () => {
  it("authCredentials exporta validateRegisterPasswordComplexity", () => {
    expect(authCredSource).toContain("validateRegisterPasswordComplexity");
    expect(authCredSource).toContain("export function validateRegisterPasswordComplexity");
  });

  it("exige al menos una mayúscula", () => {
    expect(authCredSource).toContain("HAS_UPPERCASE");
    expect(authCredSource).toMatch(/\/\[A-Z\]\//);
  });

  it("exige al menos un dígito", () => {
    expect(authCredSource).toContain("HAS_DIGIT");
    expect(authCredSource).toMatch(/\\d/);
  });

  it("auth.ts llama validateRegisterPasswordComplexity en registerUser", () => {
    const authSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/domains/usuarios/services/auth.ts"),
      "utf8",
    );
    expect(authSource).toContain("validateRegisterPasswordComplexity");
    expect(authSource).toContain("PASSWORD_TOO_WEAK");
  });
});

// ─── PCI DSS 3.5 — Revalidación de precios en checkout ───────────────────────
describe("PCI DSS 3.5 — revalidación de precios antes de Stripe", () => {
  it("existe función assertLivePrices en BFF", () => {
    expect(serverSource).toContain("async function assertLivePrices(");
    expect(serverSource).toContain("El precio de un producto cambio");
  });

  it("createCheckoutSession llama assertLivePrices después de assertOrderStockAvailability", () => {
    const block = serverSource.match(
      /app\.post\(["']\/createCheckoutSession["'][\s\S]*?(?=app\.\w+\()/
    )?.[0] ?? "";
    const stockIdx = block.indexOf("assertOrderStockAvailability");
    const priceIdx = block.indexOf("assertLivePrices");
    expect(stockIdx).toBeGreaterThan(-1);
    expect(priceIdx).toBeGreaterThan(-1);
    expect(priceIdx).toBeGreaterThan(stockIdx);
  });

  it("assertLivePrices rechaza precios con diferencia mayor a 0.01", () => {
    expect(serverSource).toContain("Math.abs(live - stored) > 0.01");
    expect(serverSource).toContain("{ status: 409 }");
  });
});

// ─── Guard: proxy disify evita CORS del browser ───────────────────────────────
describe("Guard: proxy /check-email para validación de email desechable", () => {
  it("endpoint /check-email existe en BFF y llama a disify server-side", () => {
    expect(serverSource).toContain('"/check-email"');
    expect(serverSource).toContain("disify.com/api/email/");
  });

  it("frontend llama BFF en lugar de disify directamente", () => {
    const authSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/domains/usuarios/services/auth.ts"),
      "utf8",
    );
    expect(authSource).toContain("/check-email");
    expect(authSource).toContain("getBackendApiBaseUrl");
  });
});
