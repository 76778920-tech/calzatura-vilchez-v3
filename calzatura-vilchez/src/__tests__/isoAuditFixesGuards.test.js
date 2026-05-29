import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readCheckoutGuardSources } from "./helpers/checkoutGuardSources.js";

const serverSource = fs.readFileSync(path.resolve(process.cwd(), "bff/server.cjs"), "utf8");
const checkoutSource = readCheckoutGuardSources();
const realtimeSource = fs.readFileSync(path.resolve(process.cwd(), "src/hooks/useProductsRealtime.ts"), "utf8");
const financeSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/domains/ventas/services/finance.ts"),
  "utf8",
);
const sonarProps = fs.readFileSync(path.resolve(process.cwd(), "../sonar-project.properties"), "utf8");
const sonarWorkflow = fs.readFileSync(path.resolve(process.cwd(), "../.github/workflows/sonarqube.yml"), "utf8");
const migrationRevoke = fs.readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260522140000_revoke_producto_codigos_public_read.sql"),
  "utf8",
);

describe("ISO audit remediation guards", () => {
  it("BFF valida productos activos y envio server-side en createOrder", () => {
    expect(serverSource).toContain("assertProductCanBeOrdered");
    expect(serverSource).toContain('.eq("activo", true)');
    expect(serverSource).toContain("deliveryPricing.computeDeliveryFeeFromCoords");
    expect(serverSource).toContain("El costo de envio no coincide con la direccion");
  });

  it("export admin usa columnas whitelist y auditoria exportar", () => {
    expect(serverSource).toContain("ADMIN_DATA_EXPORT_COLUMNS");
    expect(serverSource).toContain("colorStock");
    expect(serverSource).toContain("campana");
    expect(serverSource).toContain('"exportar"');
    expect(serverSource).toContain("redactAdminExportRows");
  });

  it("limpieza Excel elimina codigos de productos de prueba y refresca cache publico", () => {
    expect(serverSource).toContain("deleteProductCodesForProductIds");
    expect(serverSource).toContain('.from("productoCodigos")');
    expect(serverSource).toContain("schedulePublicCatalogCacheBump");
  });

  it("GET admin audit sanitiza respuestas incluyendo usuarioEmail", () => {
    expect(serverSource).toContain("sanitizeAuditEntryForResponse");
    expect(serverSource).toContain(".map(sanitizeAuditEntryForResponse)");
    expect(serverSource).toContain('require("./auditPii.cjs")');
  });

  it("checkout envia lat/lng al BFF", () => {
    expect(checkoutSource).toContain("lat: deliveryPoint.lat");
    expect(checkoutSource).toContain("lng: deliveryPoint.lng");
  });

  it("realtime publico solo escucha productos", () => {
    expect(realtimeSource).toContain('table: "productos"');
    expect(realtimeSource).not.toMatch(/table:\s*"productoCodigos"/);
    expect(realtimeSource).not.toMatch(/table:\s*"productoFinanzas"/);
  });

  it("ventas admin sin fallback Supabase directo", () => {
    expect(financeSource).not.toContain("fetchDailySalesFromSupabase");
    expect(financeSource).not.toContain("fetchDailySalesRpc");
  });

  it("migracion revoca lectura publica de productoCodigos", () => {
    expect(migrationRevoke).toContain('REVOKE SELECT ON TABLE "productoCodigos" FROM anon');
    expect(migrationRevoke).toContain("anon_select_productoCodigos");
  });

  it("Sonar espera quality gate bloqueante", () => {
    expect(sonarWorkflow).toContain("qualitygate.wait=true");
  });
});
