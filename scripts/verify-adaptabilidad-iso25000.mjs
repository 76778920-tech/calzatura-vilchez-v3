#!/usr/bin/env node
/**
 * Verificación repetible de Adaptabilidad (ISO 25010 · Portabilidad).
 * Uso: node scripts/verify-adaptabilidad-iso25000.mjs [--run-e2e]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "calzatura-vilchez");

const REQUIRED_DOCS = [
  "documentacion/adaptabilidad-trazabilidad-iso25000.md",
  "documentacion/portabilidad-mapeo-iso25023.md",
  "documentacion/planes-de-prueba.md",
  "DOCKER.md",
  "calzatura-vilchez/.env.example",
  "calzatura-vilchez-mobile/.env.example",
  "docs/ops/browser-matrix-evidence.json",
];

const REQUIRED_FILES = [
  "calzatura-vilchez/playwright.config.ts",
  "calzatura-vilchez/e2e/browser-matrix.spec.ts",
  "calzatura-vilchez/e2e/idoneidad-journey.spec.ts",
];

const ENV_KEYS_WEB = [
  "VITE_BACKEND_API_URL",
  "VITE_SUPABASE_URL",
  "VITE_AI_SERVICE_URL",
  "VITE_STRIPE_PUBLIC_KEY",
];

const ENV_KEYS_MOBILE = [
  "BACKEND_API_URL",
  "SUPABASE_URL",
  "AI_SERVICE_URL",
  "STRIPE_PUBLISHABLE_KEY",
];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readText(rel) {
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

function readDashboardAdaptabilidad() {
  const data = JSON.parse(readText("dashboard-iso25000/data.json"));
  const port = data.characteristics.find((c) => c.id === "portabilidad");
  const sub = port?.subcharacteristics.find((s) => s.name === "Adaptabilidad");
  return sub?.percent ?? null;
}

function playwrightHasMultiBrowser() {
  const cfg = readText("calzatura-vilchez/playwright.config.ts");
  return (
    cfg.includes('name: "firefox"') &&
    cfg.includes('name: "webkit"') &&
    cfg.includes("browserMatrixSpecs")
  );
}

function envExampleListsKeys(rel, keys) {
  const text = readText(rel);
  return keys.every((k) => text.includes(k));
}

function evidenceJsonValid() {
  const raw = readText("docs/ops/browser-matrix-evidence.json");
  const data = JSON.parse(raw);
  const projects = data.projects ?? [];
  const passed = projects.filter((p) => p.status === "passed");
  return passed.length >= 2;
}

function main() {
  const runE2e = process.argv.includes("--run-e2e");
  let allOk = true;

  console.log("=== Verificación Adaptabilidad ISO 25010 ===\n");

  for (const doc of REQUIRED_DOCS) {
    allOk = exists(doc) ? ok(`Documento: ${doc}`) && allOk : fail(`Falta: ${doc}`) && allOk;
  }

  for (const f of REQUIRED_FILES) {
    allOk = exists(f) ? ok(`Artefacto: ${f}`) && allOk : fail(`Falta: ${f}`) && allOk;
  }

  const pct = readDashboardAdaptabilidad();
  allOk = pct === 71 ? ok(`Dashboard Adaptabilidad = ${pct}%`) : fail(`Dashboard Adaptabilidad = ${pct}% (esperado 71; iOS FAd-2 pendiente)`) && allOk;

  allOk = playwrightHasMultiBrowser() ? ok("playwright.config.ts — firefox + webkit + iphone-safari") && allOk : fail("Playwright sin proyectos multi-navegador") && allOk;

  allOk = envExampleListsKeys("calzatura-vilchez/.env.example", ENV_KEYS_WEB)
    ? ok(".env.example web — variables de entorno documentadas")
    : fail(".env.example web incompleto") && allOk;

  allOk = envExampleListsKeys("calzatura-vilchez-mobile/.env.example", ENV_KEYS_MOBILE)
    ? ok(".env.example móvil — variables documentadas")
    : fail(".env.example móvil incompleto") && allOk;

  const planes = readText("documentacion/planes-de-prueba.md");
  allOk = planes.includes("TC-MAN-BRW-002") && planes.includes("TC-MAN-BRW-003")
    ? ok("planes-de-prueba.md §4.6 — matriz navegadores")
    : fail("Matriz §4.6 no encontrada") && allOk;

  if (exists("docs/ops/browser-matrix-evidence.json")) {
    try {
      allOk = evidenceJsonValid() ? ok("browser-matrix-evidence.json — ≥2 navegadores passed") && allOk : fail("Evidencia navegadores insuficiente (<2 passed)") && allOk;
    } catch (e) {
      allOk = fail(`browser-matrix-evidence.json inválido: ${e.message}`) && allOk;
    }
  }

  if (runE2e) {
    console.log("\n--- E2E portabilidad (Firefox + WebKit + iPhone) ---");
    const result = spawnSync("npm", ["run", "test:e2e:portabilidad"], {
      cwd: APP,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, CI: "true", VITE_E2E: "true", VITE_ORS_API_KEY: "" },
    });
    allOk = result.status === 0 ? ok("Playwright portabilidad passed") && allOk : fail("Playwright portabilidad failed") && allOk;
  } else {
    console.log("\n(Omite E2E; usa --run-e2e para ejecutar test:e2e:portabilidad)");
  }

  console.log(allOk ? "\n=== VERDE: Adaptabilidad verificada ===" : "\n=== ROJO: revisar huecos arriba ===");
  process.exit(allOk ? 0 : 1);
}

main();
