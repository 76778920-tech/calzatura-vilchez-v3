import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(process.cwd(), "..");
const zapPath = path.join(ROOT, "zap-reports/zap-production-report-v4.json");

const ACCEPTED_MEDIUM_ALERTS = new Set([]);
const ACCEPTED_LOW_ALERTS = new Set([]);
/**
 * Informativas aceptadas — residuales normales de una SPA React en producción:
 *   - Non-Storable Content: HTML con no-store (correcto para sesiones) y assets inmutables.
 *   - Re-examine Cache-control: robots.txt/sitemap.xml con public cache (correcto).
 *   - Storable and Cacheable: archivos estáticos públicos (favicon, robots, sitemap, assets).
 *   - Modern Web Application: ZAP detecta siempre cualquier framework JS como Vite/React; no es remediable.
 */
const ACCEPTED_INFO_ALERTS = new Set([
  "Non-Storable Content",
  "Re-examine Cache-control Directives",
  "Storable and Cacheable Content",
  "Modern Web Application",
]);

function loadZapAlerts() {
  if (!fs.existsSync(zapPath)) return [];
  const report = JSON.parse(fs.readFileSync(zapPath, "utf8"));
  const alerts = [];
  for (const site of report.site ?? []) {
    for (const alert of site.alerts ?? []) {
      alerts.push(alert);
    }
  }
  return alerts;
}

describe("Seguridad DAST — ZAP producción v4", () => {
  const acceptedDoc = path.join(ROOT, "documentacion/seguridad-riesgos-residuales-dast.md");

  it("existe reporte y documento de riesgos", () => {
    expect(fs.existsSync(zapPath)).toBe(true);
    expect(fs.existsSync(acceptedDoc)).toBe(true);
  });

  it("sin alertas High ni Critical (riskcode >= 3)", () => {
    const high = loadZapAlerts().filter((a) => Number(a.riskcode) >= 3);
    expect(high.map((a) => a.alert)).toEqual([]);
  });

  it("sin alertas Medium no documentadas (riskcode 2)", () => {
    const medium = loadZapAlerts().filter((a) => Number(a.riskcode) === 2);
    const unexpected = medium.filter((a) => !ACCEPTED_MEDIUM_ALERTS.has(a.alert));
    expect(unexpected.map((a) => a.alert)).toEqual([]);
  });

  it("sin alertas Low no documentadas (riskcode 1)", () => {
    const low = loadZapAlerts().filter((a) => Number(a.riskcode) === 1);
    const unexpected = low.filter((a) => !ACCEPTED_LOW_ALERTS.has(a.alert));
    expect(unexpected.map((a) => a.alert)).toEqual([]);
  });

  it("sin alertas Informational no documentadas (riskcode 0)", () => {
    const info = loadZapAlerts().filter((a) => Number(a.riskcode) === 0);
    const unexpected = info.filter((a) => !ACCEPTED_INFO_ALERTS.has(a.alert));
    expect(unexpected.map((a) => a.alert)).toEqual([]);
  });
});
