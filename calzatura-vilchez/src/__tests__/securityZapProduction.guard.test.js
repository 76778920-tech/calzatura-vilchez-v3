import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(process.cwd(), "..");
const zapPath = path.join(ROOT, "zap-reports/zap-production-report-v2.json");
const acceptedDoc = path.join(ROOT, "documentacion/seguridad-riesgos-residuales-dast.md");

/** ZAP riskcode: 0=Info 1=Low 2=Medium 3=High 4=Critical */
const ACCEPTED_MEDIUM_ALERTS = new Set([
  "CSP: style-src unsafe-inline",
]);

const ACCEPTED_LOW_ALERTS = new Set([
  "Cross-Origin-Opener-Policy Header Missing or Invalid",
]);

function loadZapAlerts() {
  const report = JSON.parse(fs.readFileSync(zapPath, "utf8"));
  const alerts = [];
  for (const site of report.site ?? []) {
    for (const alert of site.alerts ?? []) {
      alerts.push(alert);
    }
  }
  return alerts;
}

describe("Seguridad DAST — ZAP producción v2", () => {
  it("existe reporte y documento de riesgos aceptados", () => {
    expect(fs.existsSync(zapPath)).toBe(true);
    expect(fs.existsSync(acceptedDoc)).toBe(true);
  });

  it("sin alertas High ni Critical (riskcode >= 3)", () => {
    const high = loadZapAlerts().filter((a) => Number(a.riskcode) >= 3);
    expect(high.map((a) => a.alert)).toEqual([]);
  });

  it("alertas Medium solo las aceptadas y documentadas", () => {
    const medium = loadZapAlerts().filter((a) => Number(a.riskcode) === 2);
    const unexpected = medium.filter((a) => !ACCEPTED_MEDIUM_ALERTS.has(a.alert));
    expect(unexpected.map((a) => a.alert)).toEqual([]);
    expect(medium.length).toBeGreaterThan(0);
  });

  it("alertas Low conocidas están en lista blanca", () => {
    const low = loadZapAlerts().filter((a) => Number(a.riskcode) === 1);
    const unexpected = low.filter((a) => !ACCEPTED_LOW_ALERTS.has(a.alert));
    expect(unexpected.map((a) => a.alert)).toEqual([]);
  });
});
