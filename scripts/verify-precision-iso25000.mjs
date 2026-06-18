#!/usr/bin/env node
/**
 * Verificación repetible de Precisión (ISO 25010).
 * Uso: node scripts/verify-precision-iso25000.mjs [--run-tests]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "calzatura-vilchez");

const PRECISION_EVIDENCE = {
  "Stock talla/color": [
    "calzatura-vilchez/src/__tests__/stock.test.ts",
    "calzatura-vilchez/src/__tests__/adminProductStockCoherence.test.ts",
    "calzatura-vilchez/e2e/cart-stock-validation.spec.ts",
  ],
  "Checkout catálogo vivo": [
    "calzatura-vilchez/src/__tests__/checkoutStock.test.ts",
    "calzatura-vilchez/e2e/checkout-cod-order.spec.ts",
    "calzatura-vilchez/e2e/idoneidad-journey.spec.ts",
  ],
  "BFF totales y precios": [
    "calzatura-vilchez/src/__tests__/precisionBffGuards.test.js",
    "calzatura-vilchez/src/__tests__/isoAuditFixesGuards.test.js",
    "calzatura-vilchez/bff/server.cjs",
  ],
  "Variantes producto": ["calzatura-vilchez/src/__tests__/variantCreation.test.ts"],
  "Reglas comerciales BD": [
    "calzatura-vilchez/src/__tests__/commercialGuards.test.ts",
    "calzatura-vilchez/e2e/admin-commercial-guards.spec.ts",
  ],
  "Finanzas y márgenes": [
    "calzatura-vilchez/src/__tests__/finance.test.ts",
    "calzatura-vilchez/src/__tests__/financeService.test.ts",
  ],
  "Ventas tienda": [
    "calzatura-vilchez/src/__tests__/adminSalesRegisterLogic.test.ts",
    "calzatura-vilchez/e2e/admin-sales.spec.ts",
  ],
  "Importación Excel": ["calzatura-vilchez/src/__tests__/importRules.test.ts"],
  "Predicción / IRE": [
    "calzatura-vilchez/src/__tests__/predictionDataQuality.test.ts",
    "ai-service/tests/test_safe_limits.py",
    "ai-service/tests/test_risk.py",
  ],
};

const VITEST_PRECISION = [
  "src/__tests__/stock.test.ts",
  "src/__tests__/adminProductStockCoherence.test.ts",
  "src/__tests__/checkoutStock.test.ts",
  "src/__tests__/precisionBffGuards.test.js",
  "src/__tests__/variantCreation.test.ts",
  "src/__tests__/commercialGuards.test.ts",
  "src/__tests__/finance.test.ts",
  "src/__tests__/financeService.test.ts",
  "src/__tests__/adminSalesRegisterLogic.test.ts",
  "src/__tests__/importRules.test.ts",
  "src/__tests__/predictionDataQuality.test.ts",
];

const E2E_PRECISION = [
  "e2e/cart-stock-validation.spec.ts",
  "e2e/admin-commercial-guards.spec.ts",
  "e2e/admin-sales.spec.ts",
];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readDashboardPrecision() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/data.json"), "utf8"));
  const func = data.characteristics.find((c) => c.id === "funcionalidad");
  return func?.subcharacteristics.find((s) => s.name === "Precisión")?.percent ?? null;
}

function main() {
  const runTests = process.argv.includes("--run-tests");
  let allOk = true;

  console.log("=== Verificación Precisión ISO 25010 ===\n");

  for (const doc of [
    "documentacion/precision-trazabilidad-iso25000.md",
    "dashboard-iso25000/data.json",
  ]) {
    allOk = exists(doc) ? (console.log(`OK: ${doc}`), true) && allOk : (console.error(`FAIL: falta ${doc}`), false) && allOk;
  }

  const pct = readDashboardPrecision();
  allOk = pct === 100 ? (console.log(`OK: Dashboard Precisión = ${pct}%`), true) && allOk : (console.error(`FAIL: Dashboard Precisión = ${pct}% (esperado 100)`), false) && allOk;

  console.log("\n--- Dominios de precisión ---");
  for (const [domain, files] of Object.entries(PRECISION_EVIDENCE)) {
    const missing = files.filter((f) => !exists(f));
    if (missing.length) {
      console.error(`FAIL: ${domain} — faltan: ${missing.join(", ")}`);
      allOk = false;
    } else {
      console.log(`OK: ${domain} (${files.length} archivos)`);
    }
  }

  if (runTests) {
    console.log("\n--- Vitest (precisión) ---");
    const vitest = spawnSync(
      "node",
      ["scripts/run-clean-env.mjs", "vitest", "run", ...VITEST_PRECISION],
      { cwd: APP, stdio: "inherit", shell: process.platform === "win32" },
    );
    allOk = vitest.status === 0 ? (console.log("OK: Vitest precisión"), true) && allOk : (console.error("FAIL: Vitest precisión"), false) && allOk;

    console.log("\n--- E2E (precisión stock/ventas) ---");
    const e2e = spawnSync(
      "node",
      ["scripts/run-playwright.mjs", "test", ...E2E_PRECISION],
      { cwd: APP, stdio: "inherit", shell: process.platform === "win32" },
    );
    allOk = e2e.status === 0 ? (console.log("OK: E2E precisión"), true) && allOk : (console.error("FAIL: E2E precisión"), false) && allOk;
  } else {
    console.log("\n(Omite tests; usa --run-tests para Vitest + E2E)");
  }

  console.log(allOk ? "\n=== VERDE: Precisión verificada ===" : "\n=== ROJO: revisar huecos arriba ===");
  process.exit(allOk ? 0 : 1);
}

main();
