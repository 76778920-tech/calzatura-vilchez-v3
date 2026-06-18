#!/usr/bin/env node
/**
 * Verificación repetible de Idoneidad (ISO 25010) — RF Must ↔ pruebas.
 * Uso: node scripts/verify-idoneidad-iso25000.mjs [--run-e2e]
 *
 * Sale con código 0 solo si toda la evidencia declarada sigue presente.
 * Opcionalmente ejecuta los specs E2E de idoneidad (más lento).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "calzatura-vilchez");

/** RF Must del SRS (documentacion/05-especificacion-requisitos-software-SRS.md) */
const MUST_RF_EVIDENCE = {
  "RF-CAT-01": [
    "calzatura-vilchez/e2e/catalog-filter-marca.spec.ts",
    "calzatura-vilchez/e2e/smoke.spec.ts",
  ],
  "RF-CAT-02": [
    "calzatura-vilchez/e2e/catalog-cart.spec.ts",
    "calzatura-vilchez/e2e/idoneidad-journey.spec.ts",
  ],
  "RF-AUT-01": [
    "calzatura-vilchez/e2e/register-validation.spec.ts",
    "calzatura-vilchez/src/__tests__/authCredentialsComplexity.test.ts",
    "calzatura-vilchez/src/__tests__/isoP0SecurityGuards.test.js",
  ],
  "RF-AUT-02": [
    "calzatura-vilchez/e2e/smoke.spec.ts",
    "calzatura-vilchez/e2e/profile-save.spec.ts",
  ],
  "RF-AUT-03": ["calzatura-vilchez/e2e/profile-save.spec.ts"],
  "RF-AUT-04": [
    "calzatura-vilchez/e2e/helpers/mockClientAuth.ts",
    "calzatura-vilchez/e2e/idoneidad-journey.spec.ts",
  ],
  "RF-CAR-01": [
    "calzatura-vilchez/e2e/cart-stock-validation.spec.ts",
    "calzatura-vilchez/e2e/catalog-cart.spec.ts",
  ],
  "RF-CHK-01": [
    "calzatura-vilchez/e2e/checkout-cod-order.spec.ts",
    "calzatura-vilchez/e2e/idoneidad-journey.spec.ts",
  ],
  "RF-PED-01": [
    "calzatura-vilchez/e2e/checkout-cod-order.spec.ts",
    "calzatura-vilchez/e2e/checkout-stripe.spec.ts",
    "calzatura-vilchez/e2e/idoneidad-journey.spec.ts",
  ],
  "RF-PAG-01": ["calzatura-vilchez/e2e/checkout-stripe.spec.ts"],
  "RF-PED-03": ["calzatura-vilchez/e2e/idoneidad-journey.spec.ts"],
  "RF-ADM-01": ["calzatura-vilchez/e2e/admin-dashboard.spec.ts"],
  "RF-ADM-02": [
    "calzatura-vilchez/e2e/admin-products-filters.spec.ts",
    "calzatura-vilchez/e2e/admin-product-delete.spec.ts",
  ],
  "RF-ADM-03": ["calzatura-vilchez/e2e/admin-stock-tallas.spec.ts"],
  "RF-ADM-05": ["calzatura-vilchez/e2e/admin-code-guards.spec.ts"],
  "RF-ADM-06": ["calzatura-vilchez/e2e/admin-commercial-guards.spec.ts"],
  "RF-ADM-07": ["calzatura-vilchez/e2e/admin-orders.spec.ts"],
  "RF-ADM-08": ["calzatura-vilchez/e2e/admin-sales.spec.ts"],
  "RF-ADM-11": ["calzatura-vilchez/e2e/admin-users.spec.ts"],
  "RF-FAV-01": ["calzatura-vilchez/e2e/favorites-isolation.spec.ts"],
  "RF-IA-01": [
    "documentacion/07-modulo-ia-riesgo-empresarial.md",
    "calzatura-vilchez/e2e/admin-ire-dashboard.spec.ts",
  ],
  "RF-IA-02": [
    "ai-service/tests/test_demand.py",
    "ai-service/tests/test_risk.py",
    "calzatura-vilchez/e2e/admin-predictions.spec.ts",
  ],
  "RF-IA-04": ["documentacion/07-modulo-ia-riesgo-empresarial.md"],
  "RF-RN-01": [
    "calzatura-vilchez/e2e/admin-commercial-guards.spec.ts",
    "calzatura-vilchez/src/__tests__/variantCreation.test.ts",
  ],
  "RF-RN-02": ["calzatura-vilchez/e2e/admin-code-guards.spec.ts"],
};

const REQUIRED_DOCS = [
  "documentacion/idoneidad-trazabilidad-iso25000.md",
  "documentacion/cuadros-excel/CU-T07-matriz-pruebas-requisitos.csv",
  "dashboard-iso25000/data.json",
];

const E2E_IDONEIDAD_SPECS = [
  "e2e/idoneidad-journey.spec.ts",
  "e2e/register-validation.spec.ts",
];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  return false;
}

function ok(msg) {
  console.log(`OK: ${msg}`);
  return true;
}

function countE2eSpecs() {
  const dir = path.join(APP, "e2e");
  return fs.readdirSync(dir).filter((f) => f.endsWith(".spec.ts")).length;
}

function readDashboardIdoneidad() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/data.json"), "utf8"));
  const func = data.characteristics.find((c) => c.id === "funcionalidad");
  const idon = func?.subcharacteristics.find((s) => s.name === "Idoneidad");
  return idon?.percent ?? null;
}

function cuT07HasIdon() {
  const csv = fs.readFileSync(
    path.join(ROOT, "documentacion/cuadros-excel/CU-T07-matriz-pruebas-requisitos.csv"),
    "utf8",
  );
  return csv.includes("TC-IDON-001");
}

function main() {
  const runE2e = process.argv.includes("--run-e2e");
  let allOk = true;

  console.log("=== Verificación Idoneidad ISO 25010 ===\n");

  for (const doc of REQUIRED_DOCS) {
    allOk = exists(doc) ? ok(`Documento presente: ${doc}`) && allOk : fail(`Falta: ${doc}`) && allOk;
  }

  const pct = readDashboardIdoneidad();
  allOk = pct === 100 ? ok(`Dashboard Idoneidad = ${pct}%`) : fail(`Dashboard Idoneidad = ${pct}% (esperado 100)`) && allOk;

  allOk = cuT07HasIdon() ? ok("CU-T07 contiene TC-IDON-001") : fail("CU-T07 sin TC-IDON-001") && allOk;

  const e2eCount = countE2eSpecs();
  allOk = e2eCount >= 34 ? ok(`Specs E2E: ${e2eCount} (mín. 34)`) : fail(`Specs E2E: ${e2eCount} (mín. 34)`) && allOk;

  console.log("\n--- RF Must ↔ evidencia ---");
  for (const [rf, files] of Object.entries(MUST_RF_EVIDENCE)) {
    const missing = files.filter((f) => !exists(f));
    if (missing.length > 0) {
      allOk = fail(`${rf} — faltan: ${missing.join(", ")}`) && allOk;
    } else {
      allOk = ok(`${rf} — ${files.length} archivo(s)`) && allOk;
    }
  }

  if (runE2e) {
    console.log("\n--- E2E idoneidad (Playwright) ---");
    const result = spawnSync(
      "node",
      ["scripts/run-playwright.mjs", "test", ...E2E_IDONEIDAD_SPECS],
      { cwd: APP, stdio: "inherit", shell: process.platform === "win32" },
    );
    allOk = result.status === 0 ? ok("Playwright idoneidad passed") && allOk : fail("Playwright idoneidad failed") && allOk;
  } else {
    console.log("\n(Omite E2E; usa --run-e2e para ejecutar Playwright)");
  }

  console.log(allOk ? "\n=== VERDE: Idoneidad verificada ===" : "\n=== ROJO: revisar huecos arriba ===");
  process.exit(allOk ? 0 : 1);
}

main();
