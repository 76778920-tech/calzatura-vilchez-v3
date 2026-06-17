#!/usr/bin/env node
/**
 * Verificación Tolerancia a fallos — ítem por ítem.
 * Uso: node scripts/verify-tolerancia-fallos-iso25000.mjs [--run-tests] [--run-e2e]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "calzatura-vilchez");

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  return false;
}

function ok(msg) {
  console.log(`OK: ${msg}`);
  return true;
}

function readDashboardPct() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/data.json"), "utf8"));
  return data.characteristics.find((c) => c.id === "fiabilidad")?.subcharacteristics.find((s) => s.name === "Tolerancia a Fallos")?.percent ?? null;
}

function checkItem1() {
  const main = read("calzatura-vilchez/src/main.tsx");
  return main.includes("AppErrorBoundary") && exists("calzatura-vilchez/src/components/layout/AppErrorBoundary.tsx")
    ? ok("Ítem 1: AppErrorBoundary global en main.tsx")
    : fail("Ítem 1: sin error boundary global");
}

function checkItem2() {
  const bff = read("calzatura-vilchez/bff/server.cjs");
  const hasGuard = bff.includes('order.estado !== "pagado"') && bff.includes("assertOrderStatusTransition");
  const hasTests =
    exists("calzatura-vilchez/functions/__tests__/stripeLegacyGuards.test.js") &&
    exists("calzatura-vilchez/src/__tests__/bffOrderStatusPolicy.test.js");
  return hasGuard && hasTests ? ok("Ítem 2: idempotencia Stripe + tests política") : fail("Ítem 2: guard o tests Stripe incompletos");
}

function checkItem3() {
  const dash = read("calzatura-vilchez/src/domains/administradores/predictions/AdminPredictionsDashboard.tsx");
  const spec = read("calzatura-vilchez/e2e/admin-predictions.spec.ts");
  const ui = dash.includes("pred-warnings-banner") && dash.includes("Datos insuficientes para predicciones fiables");
  const e2e = spec.includes("TC-PRED-003") && spec.includes("Datos insuficientes para predicciones fiables");
  return ui && e2e ? ok("Ítem 3: banner IA + E2E TC-PRED-003") : fail("Ítem 3: warnings IA incompletos");
}

function checkItem4() {
  const files = [
    "calzatura-vilchez/functions/orderStatusPolicy.js",
    "calzatura-vilchez/src/__tests__/bffAuditEndpointPolicy.test.js",
    "calzatura-vilchez/src/__tests__/precisionBffGuards.test.js",
  ];
  const missing = files.filter((f) => !exists(f));
  return missing.length === 0 ? ok("Ítem 4: BFF fail-closed — policy + tests") : fail(`Ítem 4: faltan ${missing.join(", ")}`);
}

function checkItem5() {
  const checkout = read("calzatura-vilchez/src/domains/carrito/pages/checkout/CheckoutPagoStep.tsx");
  const spec = read("calzatura-vilchez/e2e/checkout-cod-order.spec.ts");
  const adminDash = read("calzatura-vilchez/e2e/admin-dashboard.spec.ts");
  const ui = checkout.includes("checkout-error-state") && checkout.includes('role="alert"');
  const e2eChk = spec.includes("TC-CHK-ERR-001") && spec.includes("checkout-error-state");
  const e2eAdmin = adminDash.includes("No se pudo cargar el historial de actividad");
  return ui && e2eChk && e2eAdmin
    ? ok("Ítem 5: errores checkout (TC-CHK-ERR-001) + admin dashboard")
    : fail("Ítem 5: manejo de errores checkout/admin incompleto");
}

function main() {
  const runTests = process.argv.includes("--run-tests");
  const runE2e = process.argv.includes("--run-e2e");
  const items = [1, 2, 3, 4, 5];
  const results = {
    1: checkItem1(),
    2: checkItem2(),
    3: checkItem3(),
    4: checkItem4(),
    5: checkItem5(),
  };

  console.log("=== Verificación Tolerancia a fallos — ítem por ítem ===\n");

  if (runTests) {
    console.log("--- Vitest guards + política ---");
    const r = spawnSync(
      "npx",
      [
        "vitest",
        "run",
        "src/__tests__/fiabilidadToleranciaGuards.test.js",
        "src/__tests__/bffOrderStatusPolicy.test.js",
        "functions/__tests__/stripeLegacyGuards.test.js",
      ],
      { cwd: APP, stdio: "inherit", shell: process.platform === "win32" },
    );
    if (r.status !== 0) {
      results.tests = false;
      fail("Vitest tolerancia falló");
    } else {
      results.tests = true;
      ok("Vitest tolerancia passed");
    }
  }

  if (runE2e) {
    console.log("\n--- Playwright tolerancia ---");
    const runs = [
      ["e2e/admin-predictions.spec.ts", "TC-PRED-003"],
      ["e2e/checkout-cod-order.spec.ts", "TC-CHK-ERR-001"],
    ];
    let e2eOk = true;
    for (const [spec, grep] of runs) {
      const r = spawnSync("node", ["scripts/run-playwright.mjs", "test", spec, "-g", grep], {
        cwd: APP,
        stdio: "inherit",
        shell: false,
      });
      if (r.status !== 0) {
        e2eOk = false;
        fail(`E2E tolerancia falló: ${grep}`);
      } else {
        ok(`E2E passed: ${grep}`);
      }
    }
    results.e2e = e2eOk;
  }

  const passed = items.filter((n) => results[n]).length;
  const pct = Math.round((passed / items.length) * 100);
  const dash = readDashboardPct();

  console.log(`\n--- Resumen: ${passed}/${items.length} ítems (${pct} %) ---`);
  if (dash !== pct) fail(`Dashboard declara ${dash}% pero verificación = ${pct}%`);
  else ok(`Dashboard alineado: ${dash}%`);

  const allOk =
    passed === items.length &&
    dash === pct &&
    (!runTests || results.tests !== false) &&
    (!runE2e || results.e2e === true);
  console.log(allOk ? "\n=== VERDE: Tolerancia a fallos ===" : "\n=== ROJO: Tolerancia a fallos ===");
  process.exit(allOk ? 0 : 1);
}

main();
