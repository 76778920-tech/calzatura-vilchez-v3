#!/usr/bin/env node
/**
 * Verificación repetible de Interoperabilidad (ISO 25010).
 * Uso: node scripts/verify-interoperabilidad-iso25000.mjs [--run-tests]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "calzatura-vilchez");
const FUNCTIONS = path.join(APP, "functions");
const AI = path.join(ROOT, "ai-service");

const INTEGRATION_EVIDENCE = {
  "Firebase Auth → BFF/IA": [
    "calzatura-vilchez/src/__tests__/bffClient.test.ts",
    "calzatura-vilchez/e2e/profile-save.spec.ts",
    "ai-service/tests/test_firebase_verifier.py",
  ],
  "Supabase PostgREST + RLS": [
    "calzatura-vilchez/src/__tests__/supabaseDirectAccessGuard.test.js",
    "scripts/validate-supabase-rls-matrix.mjs",
    "calzatura-vilchez/supabase/rls-matrix.contract.json",
    "calzatura-vilchez/e2e/checkout-cod-order.spec.ts",
  ],
  "BFF Node (pedidos, entrega, catálogo)": [
    "calzatura-vilchez/src/__tests__/interoperabilityBffGuards.test.js",
    "calzatura-vilchez/bff/server.cjs",
    "calzatura-vilchez/e2e/checkout-cod-order.spec.ts",
  ],
  "Stripe Checkout + webhook": [
    "calzatura-vilchez/e2e/checkout-stripe.spec.ts",
    "calzatura-vilchez/functions/__tests__/stripeLegacyGuards.test.js",
    "calzatura-vilchez/functions/__tests__/orderStockRpc.test.js",
  ],
  "Servicio IA FastAPI": [
    "calzatura-vilchez/src/__tests__/interoperabilityAiClientGuard.test.ts",
    "ai-service/tests/test_api_contract.py",
    "calzatura-vilchez/e2e/admin-predictions.spec.ts",
  ],
  "Geocodificación / rutas (ORS, Nominatim)": [
    "calzatura-vilchez/src/__tests__/deliveryOpenRouteErrors.test.ts",
    "calzatura-vilchez/src/__tests__/deliveryGeocodeHousenumber.test.ts",
    "calzatura-vilchez/bff/delivery.cjs",
  ],
  "API DNI APISPERU": [
    "calzatura-vilchez/bff/lookupDni.cjs",
    "calzatura-vilchez/src/__tests__/bffAuditEndpointPolicy.test.js",
    "calzatura-vilchez/e2e/register-validation.spec.ts",
  ],
  "Cloudinary CDN + firma upload": [
    "calzatura-vilchez/src/__tests__/imageAssetsIntegrity.test.js",
    "calzatura-vilchez/src/__tests__/interoperabilityCloudinarySign.test.js",
    "calzatura-vilchez/bff/cloudinarySign.cjs",
  ],
  "Upstash caché / rate limit": [
    "calzatura-vilchez/src/__tests__/securitySurfaces.guard.test.js",
    "calzatura-vilchez/bff/catalogCache.cjs",
    "calzatura-vilchez/bff/upstashRest.cjs",
  ],
};

const VITEST_INTEROP = [
  "src/__tests__/bffClient.test.ts",
  "src/__tests__/supabaseDirectAccessGuard.test.js",
  "src/__tests__/interoperabilityBffGuards.test.js",
  "src/__tests__/interoperabilityAiClientGuard.test.ts",
  "src/__tests__/interoperabilityCloudinarySign.test.js",
  "src/__tests__/deliveryOpenRouteErrors.test.ts",
  "src/__tests__/deliveryGeocodeHousenumber.test.ts",
  "src/__tests__/imageAssetsIntegrity.test.js",
  "src/__tests__/securitySurfaces.guard.test.js",
];

const E2E_INTEROP = [
  "e2e/checkout-cod-order.spec.ts",
  "e2e/checkout-stripe.spec.ts",
  "e2e/admin-predictions.spec.ts",
  "e2e/register-validation.spec.ts",
  "e2e/profile-save.spec.ts",
];

const TC_INT_IDS = ["TC-INT-001", "TC-INT-002", "TC-INT-003", "TC-INT-004", "TC-INT-005"];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readDashboardInterop() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/data.json"), "utf8"));
  const compat = data.characteristics.find((c) => c.id === "compatibilidad");
  return compat?.subcharacteristics.find((s) => s.name === "Interoperabilidad")?.percent ?? null;
}

function cuT07HasInteropCases() {
  const csv = fs.readFileSync(
    path.join(ROOT, "documentacion/cuadros-excel/CU-T07-matriz-pruebas-requisitos.csv"),
    "utf8",
  );
  return TC_INT_IDS.every((id) => csv.includes(id));
}

function main() {
  const runTests = process.argv.includes("--run-tests");
  let allOk = true;

  console.log("=== Verificación Interoperabilidad ISO 25010 ===\n");

  for (const doc of [
    "documentacion/interoperabilidad-trazabilidad-iso25000.md",
    "dashboard-iso25000/data.json",
  ]) {
    allOk = exists(doc) ? (console.log(`OK: ${doc}`), true) && allOk : (console.error(`FAIL: falta ${doc}`), false) && allOk;
  }

  const pct = readDashboardInterop();
  allOk =
    pct === 100
      ? (console.log(`OK: Dashboard Interoperabilidad = ${pct}%`), true) && allOk
      : (console.error(`FAIL: Dashboard Interoperabilidad = ${pct}% (esperado 100)`), false) && allOk;

  allOk = cuT07HasInteropCases()
    ? (console.log(`OK: CU-T07 contiene ${TC_INT_IDS.join(", ")}`), true) && allOk
    : (console.error(`FAIL: CU-T07 sin casos TC-INT`), false) && allOk;

  console.log("\n--- Dominios de integración ---");
  for (const [domain, files] of Object.entries(INTEGRATION_EVIDENCE)) {
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

    console.log("\n--- Vitest (interoperabilidad) ---");
    const vitest = spawnSync(
      "node",
      ["scripts/run-clean-env.mjs", "vitest", "run", ...VITEST_INTEROP],
      { cwd: APP, stdio: "inherit", shell: process.platform === "win32" },
    );
    allOk =
      vitest.status === 0 ? (console.log("OK: Vitest interoperabilidad"), true) && allOk : (console.error("FAIL: Vitest interoperabilidad"), false) && allOk;

    console.log("\n--- Cloud Functions (Stripe/stock RPC) ---");
    const fnTest = spawnSync("npm", ["test"], { cwd: FUNCTIONS, stdio: "inherit", shell: true });
    allOk =
      fnTest.status === 0 ? (console.log("OK: Functions vitest"), true) && allOk : (console.error("FAIL: Functions vitest"), false) && allOk;

    console.log("\n--- Pytest contrato IA + Supabase ---");
    const pytest = spawnSync(
      "python",
      ["-m", "pytest", "tests/test_api_contract.py", "tests/test_supabase_client.py", "-q"],
      { cwd: AI, stdio: "inherit", shell: process.platform === "win32" },
    );
    allOk =
      pytest.status === 0 ? (console.log("OK: Pytest IA interoperabilidad"), true) && allOk : (console.error("FAIL: Pytest IA (¿pip install -r requirements-dev.txt?)"), false) && allOk;

    console.log("\n--- E2E (integraciones) ---");
    const e2e = spawnSync(
      "node",
      ["scripts/run-playwright.mjs", "test", ...E2E_INTEROP],
      { cwd: APP, stdio: "inherit", shell: process.platform === "win32" },
    );
    allOk = e2e.status === 0 ? (console.log("OK: E2E interoperabilidad"), true) && allOk : (console.error("FAIL: E2E interoperabilidad"), false) && allOk;
  } else {
    console.log("\n(Omite tests; usa --run-tests para RLS + Vitest + Functions + Pytest + E2E)");
  }

  console.log(
    allOk ? "\n=== VERDE: Interoperabilidad verificada ===" : "\n=== ROJO: revisar huecos arriba ===",
  );
  process.exit(allOk ? 0 : 1);
}

main();
