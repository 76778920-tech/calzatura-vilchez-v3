#!/usr/bin/env node
/**
 * Verificación repetible de Seguridad funcional (ISO/IEC 25010 producto).
 * Uso: node scripts/verify-seguridad-iso25000.mjs [--run-tests]
 *
 * No evalúa SGSI ISO/IEC 27001 — solo calidad de seguridad del software.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "calzatura-vilchez");

const SECURITY_EVIDENCE = {
  "Confidencialidad (RLS + PII)": [
    "scripts/validate-supabase-rls-matrix.mjs",
    "calzatura-vilchez/supabase/rls-matrix.contract.json",
    "calzatura-vilchez/src/__tests__/supabaseDirectAccessGuard.test.js",
    "calzatura-vilchez/src/__tests__/bffPrivacy.test.ts",
    "calzatura-vilchez/bff/privacy.cjs",
  ],
  "Integridad (sin mutaciones cliente)": [
    "calzatura-vilchez/src/__tests__/supabaseDirectAccessGuard.test.js",
    "calzatura-vilchez/src/__tests__/precisionBffGuards.test.js",
  ],
  "Autenticidad (Auth + App Check DNI)": [
    "calzatura-vilchez/src/__tests__/isoP0SecurityGuards.test.js",
    "calzatura-vilchez/src/__tests__/authCredentialsComplexity.test.ts",
    "calzatura-vilchez/e2e/register-validation.spec.ts",
  ],
  "Trazabilidad (auditoría)": [
    "calzatura-vilchez/src/__tests__/isoP0SecurityGuards.test.js",
    "calzatura-vilchez/e2e/admin-audit-trail.spec.ts",
  ],
  "Control acceso UI (RNF-SEG-01)": [
    "calzatura-vilchez/src/__tests__/accessControl.test.ts",
    "calzatura-vilchez/src/__tests__/securityAdminRoutesCoverage.test.js",
    "calzatura-vilchez/e2e/seguridad-access-guards.spec.ts",
  ],
  "Control acceso BFF + fail-closed": [
    "calzatura-vilchez/src/__tests__/bffAuditEndpointPolicy.test.js",
    "calzatura-vilchez/bff/server.cjs",
    "docs/ops/checklist-verde-seguridad-produccion.md",
  ],
  "Superficie HTTP (Hosting + BFF)": [
    "calzatura-vilchez/src/__tests__/securityHostingHeaders.guard.test.js",
    "calzatura-vilchez/firebase.json",
    "calzatura-vilchez/src/__tests__/isoP0SecurityGuards.test.js",
  ],
  "Rate limit / anti-abuso": [
    "calzatura-vilchez/src/__tests__/securitySurfaces.guard.test.js",
    "calzatura-vilchez/bff/securityMonitor.cjs",
  ],
  "DAST ZAP producción": [
    "zap-reports/zap-production-report-v2.json",
    "documentacion/seguridad-riesgos-residuales-dast.md",
    "calzatura-vilchez/src/__tests__/securityZapProduction.guard.test.js",
  ],
  "No repudio PKCS#7 (pedidos)": [
    "calzatura-vilchez/functions/orderNonRepudiation.cjs",
    "calzatura-vilchez/supabase/migrations/20260616120000_pedidos_pkcs7_non_repudiation.sql",
    "calzatura-vilchez/src/__tests__/orderNonRepudiation.test.js",
    "calzatura-vilchez/src/__tests__/orderNonRepudiation.guard.test.js",
  ],
};

const VITEST_SECURITY = [
  "src/__tests__/accessControl.test.ts",
  "src/__tests__/supabaseDirectAccessGuard.test.js",
  "src/__tests__/isoP0SecurityGuards.test.js",
  "src/__tests__/securitySurfaces.guard.test.js",
  "src/__tests__/bffAuditEndpointPolicy.test.js",
  "src/__tests__/bffPrivacy.test.ts",
  "src/__tests__/authCredentialsComplexity.test.ts",
  "src/__tests__/securityZapProduction.guard.test.js",
  "src/__tests__/securityHostingHeaders.guard.test.js",
  "src/__tests__/securityAdminRoutesCoverage.test.js",
];

const E2E_SECURITY = [
  "e2e/seguridad-access-guards.spec.ts",
  "e2e/register-validation.spec.ts",
];

const TC_SEG_IDS = ["TC-SEG-001", "TC-SEG-002", "TC-SEG-003", "TC-SEG-004", "TC-SEG-005"];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readDashboardSecurity() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/data.json"), "utf8"));
  const sec = data.characteristics.find((c) => c.id === "seguridad");
  if (!sec) return { subs: [], ok: false };
  return { subs: sec.subcharacteristics, ok: true };
}

function cuT07HasSecurityCases() {
  const csv = fs.readFileSync(
    path.join(ROOT, "documentacion/cuadros-excel/CU-T07-matriz-pruebas-requisitos.csv"),
    "utf8",
  );
  return TC_SEG_IDS.every((id) => csv.includes(id));
}

function main() {
  const runTests = process.argv.includes("--run-tests");
  let allOk = true;

  console.log("=== Verificación Seguridad ISO 25010 (producto) ===\n");

  for (const doc of [
    "documentacion/seguridad-trazabilidad-iso25000.md",
    "documentacion/seguridad-riesgos-residuales-dast.md",
    "dashboard-iso25000/data.json",
  ]) {
    allOk = exists(doc) ? (console.log(`OK: ${doc}`), true) && allOk : (console.error(`FAIL: falta ${doc}`), false) && allOk;
  }

  const { subs, ok: hasSecChar } = readDashboardSecurity();
  if (!hasSecChar) {
    console.error("FAIL: Característica Seguridad no encontrada en data.json (ISO 25010)");
    allOk = false;
  } else {
    console.log(`OK: Característica Seguridad con ${subs.length} subcaracterísticas`);
    for (const s of subs) {
      const closed = s.percent === 100;
      if (closed) {
        console.log(`OK: ${s.name} = ${s.percent}%`);
      } else {
        console.error(`FAIL: ${s.name} = ${s.percent}% (esperado 100)`);
        allOk = false;
      }
    }
  }

  allOk = cuT07HasSecurityCases()
    ? (console.log(`OK: CU-T07 contiene ${TC_SEG_IDS.join(", ")}`), true) && allOk
    : (console.error("FAIL: CU-T07 sin casos TC-SEG"), false) && allOk;

  console.log("\n--- Dimensiones de seguridad (25010) ---");
  for (const [domain, files] of Object.entries(SECURITY_EVIDENCE)) {
    const missing = files.filter((f) => !exists(f));
    if (missing.length) {
      console.error(`FAIL: ${domain} — faltan: ${missing.join(", ")}`);
      allOk = false;
    } else {
      console.log(`OK: ${domain} (${files.length} archivos)`);
    }
  }

  if (runTests) {
    console.log("\n--- Contrato RLS Supabase ---");
    const rls = spawnSync("node", ["scripts/validate-supabase-rls-matrix.mjs"], {
      cwd: ROOT,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    allOk = rls.status === 0 ? (console.log("OK: RLS matrix"), true) && allOk : (console.error("FAIL: RLS matrix"), false) && allOk;

    console.log("\n--- Vitest (seguridad) ---");
    const vitest = spawnSync(
      "node",
      ["scripts/run-clean-env.mjs", "vitest", "run", ...VITEST_SECURITY],
      { cwd: APP, stdio: "inherit", shell: process.platform === "win32" },
    );
    allOk =
      vitest.status === 0 ? (console.log("OK: Vitest seguridad"), true) && allOk : (console.error("FAIL: Vitest seguridad"), false) && allOk;

    console.log("\n--- E2E (seguridad acceso + DNI) ---");
    const e2e = spawnSync(
      "node",
      ["scripts/run-playwright.mjs", "test", ...E2E_SECURITY],
      { cwd: APP, stdio: "inherit", shell: process.platform === "win32" },
    );
    allOk = e2e.status === 0 ? (console.log("OK: E2E seguridad"), true) && allOk : (console.error("FAIL: E2E seguridad"), false) && allOk;
  } else {
    console.log("\n(Omite tests; usa --run-tests para RLS + Vitest + E2E)");
  }

  console.log(allOk ? "\n=== VERDE: Seguridad verificada ===" : "\n=== ROJO: revisar huecos arriba ===");
  process.exit(allOk ? 0 : 1);
}

main();
