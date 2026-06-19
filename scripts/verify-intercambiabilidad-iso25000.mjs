#!/usr/bin/env node
/**
 * Verificación repetible de Intercambiabilidad (ISO 25010 · Portabilidad).
 * Ítems checklist 5 (VITE_AI_SERVICE_URL) y 6 (contrato HTTP IA).
 * Uso: node scripts/verify-intercambiabilidad-iso25000.mjs [--run-tests]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "calzatura-vilchez");
const AI = path.join(ROOT, "ai-service");

const REQUIRED_FILES = [
  "calzatura-vilchez/.env.example",
  "calzatura-vilchez/src/services/aiAdminClient.ts",
  "calzatura-vilchez/docs/04-api/api-referencia.md",
  "calzatura-vilchez/src/__tests__/interoperabilityAiClientGuard.test.js",
  "calzatura-vilchez/e2e/admin-predictions.spec.ts",
  "calzatura-vilchez-mobile/.env.example",
  "calzatura-vilchez-mobile/codemagic.yaml",
  "calzatura-vilchez-mobile/lib/features/admin/presentation/pages/admin_predictions_page.dart",
  "ai-service/tests/test_api_contract.py",
  "documentacion/portabilidad-mapeo-iso25023.md",
];

/** Debe coincidir con PROXY_ROUTES en aiAdminClient.ts y guard Vitest */
const IA_ROUTES_WHITELIST = [
  "/api/predict/combined",
  "/api/sales/weekly-chart",
  "/api/model/metrics",
  "/api/ire/historial",
  "/api/cache/invalidate",
  "/api/campaign/active",
  "/api/campaign/feedback",
  "/api/predict/campaign-detection",
  "/api/campaign/learning-stats",
];

/** Ítem 5 — web: VITE_* embebido en build; proxy: URL IA en servidor */
const ITEM5_WEB_DEPLOY_FILES = [
  "calzatura-vilchez/Dockerfile",
  ".github/workflows/ci.yml",
  ".github/workflows/deploy-production.yml",
  "docker-compose.yml",
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

function readDashboardPercent() {
  const data = JSON.parse(readText("dashboard-iso25000/data.json"));
  const port = data.characteristics.find((c) => c.id === "portabilidad");
  return port?.subcharacteristics.find((s) => s.name === "Intercambiabilidad")?.percent ?? null;
}

function readChecklistItem(n) {
  const cl = JSON.parse(readText("dashboard-iso25000/checklists-data.json"));
  return cl.checklists?.Intercambiabilidad?.items?.find((i) => i.n === n) ?? null;
}

function main() {
  const runTests = process.argv.includes("--run-tests");
  let allOk = true;

  console.log("=== Verificación Intercambiabilidad ISO 25010 (Portabilidad) ===\n");

  for (const f of REQUIRED_FILES) {
    allOk = exists(f) ? ok(`Artefacto: ${f}`) && allOk : fail(`Falta: ${f}`) && allOk;
  }

  const pct = readDashboardPercent();
  allOk =
    pct === 100
      ? ok(`Dashboard Intercambiabilidad = ${pct}%`) && allOk
      : fail(`Dashboard Intercambiabilidad = ${pct}% (esperado 100)`) && allOk;

  console.log("\n--- Checklist ítems 1–6 ---");
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const item = readChecklistItem(n);
    if (!item) {
      allOk = fail(`Checklist ítem ${n} no encontrado`) && allOk;
      continue;
    }
    const generic =
      item.observacion.includes("Pendiente o evidencia insuficiente") ||
      item.observacion === "Evidencia conforme al repositorio.";
    allOk = item.cumple && !generic
      ? ok(`Ítem ${n}: ${item.indicador} = Sí (${item.observacion.slice(0, 55)}…)`)
      : fail(`Ítem ${n}: ${item.indicador} — ${generic ? "observación genérica o No" : item.observacion}`) &&
        allOk;
  }

  console.log("\n--- Ítem 5: URL servicio IA (web + Android admin) ---");
  const envEx = readText("calzatura-vilchez/.env.example");
  allOk = envEx.includes("VITE_AI_SERVICE_URL")
    ? ok("Web .env.example — VITE_AI_SERVICE_URL") && allOk
    : fail("Web .env.example sin VITE_AI_SERVICE_URL") && allOk;
  allOk = envEx.includes("VITE_AI_ADMIN_PROXY_URL")
    ? ok("Web .env.example — VITE_AI_ADMIN_PROXY_URL (proxy)") && allOk
    : fail("Web .env.example sin VITE_AI_ADMIN_PROXY_URL") && allOk;

  const aiClient = readText("calzatura-vilchez/src/services/aiAdminClient.ts");
  allOk =
    aiClient.includes("VITE_AI_SERVICE_URL") &&
    aiClient.includes("VITE_AI_ADMIN_PROXY_URL") &&
    aiClient.includes("aiAdminFetch")
      ? ok("aiAdminClient.ts — URL directa o proxy + aiAdminFetch") && allOk
      : fail("aiAdminClient.ts incompleto para ítem 5") && allOk;

  for (const rel of ITEM5_WEB_DEPLOY_FILES) {
    if (!exists(rel)) {
      allOk = fail(`Ítem 5 web: falta ${rel}`) && allOk;
      continue;
    }
    allOk = readText(rel).includes("VITE_AI_SERVICE_URL")
      ? ok(`Ítem 5 web: ${rel} inyecta VITE_AI_SERVICE_URL (rebuild al cambiar)`) && allOk
      : fail(`Ítem 5 web: ${rel} sin VITE_AI_SERVICE_URL`) && allOk;
  }

  const mobileEnv = readText("calzatura-vilchez-mobile/.env.example");
  allOk = mobileEnv.includes("AI_SERVICE_URL")
    ? ok("Android .env.example — AI_SERVICE_URL") && allOk
    : fail("Mobile .env.example sin AI_SERVICE_URL") && allOk;

  const codemagic = readText("calzatura-vilchez-mobile/codemagic.yaml");
  allOk = codemagic.includes("AI_SERVICE_URL")
    ? ok("codemagic.yaml — AI_SERVICE_URL (rebuild APK al cambiar)") && allOk
    : fail("codemagic.yaml sin AI_SERVICE_URL") && allOk;

  const mobilePred = readText(
    "calzatura-vilchez-mobile/lib/features/admin/presentation/pages/admin_predictions_page.dart",
  );
  allOk =
    mobilePred.includes("Env.aiServiceUrl") && mobilePred.includes("/api/predict/combined")
      ? ok("admin_predictions_page.dart — AI_SERVICE_URL + contrato /api/predict/combined") && allOk
      : fail("Mobile admin predicciones sin Env.aiServiceUrl o ruta combined") && allOk;

  console.log("\n--- Ítem 6: contrato HTTP IA ---");
  for (const route of IA_ROUTES_WHITELIST) {
    allOk = aiClient.includes(route)
      ? ok(`aiAdminClient — ${route}`) && allOk
      : fail(`aiAdminClient sin ${route}`) && allOk;
  }

  const apiDoc = readText("calzatura-vilchez/docs/04-api/api-referencia.md");
  allOk = apiDoc.includes("### 2.0 Contrato HTTP del cliente admin")
    ? ok("api-referencia.md — §2.0 contrato admin") && allOk
    : fail("api-referencia.md sin §2.0") && allOk;

  for (const route of IA_ROUTES_WHITELIST) {
    allOk = apiDoc.includes(route)
      ? ok(`api-referencia §2.0 — ${route}`) && allOk
      : fail(`api-referencia sin ${route}`) && allOk;
  }

  allOk = apiDoc.includes("Firebase ID token")
    ? ok("api-referencia.md — auth web admin (Firebase ID token) documentada") && allOk
    : fail("api-referencia.md §1 sin Firebase ID token (Option B)") && allOk;

  allOk = !apiDoc.includes("VITE_AI_SERVICE_TOKEN")
    ? ok("api-referencia.md — sin VITE_AI_SERVICE_TOKEN obsoleto en frontend") && allOk
    : fail("api-referencia.md aún menciona VITE_AI_SERVICE_TOKEN en frontend") && allOk;

  allOk = apiDoc.includes("AI_SERVICE_URL") && apiDoc.includes("rebuild APK")
    ? ok("api-referencia.md — Android AI_SERVICE_URL + rebuild documentados") && allOk
    : fail("api-referencia.md sin Android/rebuild en §2.0") && allOk;

  allOk = apiDoc.includes("Supabase") && apiDoc.includes("JSON")
    ? ok("api-referencia.md — compatibilidad Supabase + JSON documentada") && allOk
    : fail("api-referencia.md sin requisito Supabase/JSON para IA sustituto") && allOk;

  const mapeo = readText("documentacion/portabilidad-mapeo-iso25023.md");
  const MAPEO_PHRASES = [
    "§5.1",
    "rebuild",
    "AI_SERVICE_URL",
    "Firebase Auth",
    "Supabase",
  ];
  for (const phrase of MAPEO_PHRASES) {
    allOk = mapeo.includes(phrase)
      ? ok(`portabilidad-mapeo — «${phrase}»`) && allOk
      : fail(`portabilidad-mapeo-iso25023.md sin «${phrase}»`) && allOk;
  }
  allOk = mapeo.includes("verify-intercambiabilidad")
    ? ok("portabilidad-mapeo-iso25023.md — gate documentado") && allOk
    : fail("Mapeo ISO sin referencia a verify-intercambiabilidad") && allOk;

  if (runTests) {
    console.log("\n--- Vitest guard (ítems 5 y 6) ---");
    const vitest = spawnSync(
      "node",
      ["scripts/run-clean-env.mjs", "vitest", "run", "src/__tests__/interoperabilityAiClientGuard.test.js"],
      { cwd: APP, stdio: "inherit", shell: process.platform === "win32" },
    );
    allOk =
      vitest.status === 0
        ? ok("interoperabilityAiClientGuard.test.js — 6/6 passed") && allOk
        : fail("Vitest guard intercambiabilidad failed") && allOk;

    console.log("\n--- Pytest contrato HTTP IA ---");
    const pytest = spawnSync(
      "python",
      ["-m", "pytest", "tests/test_api_contract.py", "-q"],
      { cwd: AI, stdio: "inherit", shell: process.platform === "win32" },
    );
    allOk =
      pytest.status === 0
        ? ok("test_api_contract.py passed") && allOk
        : fail("Pytest test_api_contract.py failed (¿pip install -r requirements-dev.txt?)") && allOk;

    console.log("\n--- E2E admin predicciones (HTTP mockeado) ---");
    const e2e = spawnSync(
      "node",
      ["scripts/run-playwright.mjs", "test", "e2e/admin-predictions.spec.ts"],
      {
        cwd: APP,
        stdio: "inherit",
        shell: process.platform === "win32",
        env: { ...process.env, CI: "true", VITE_E2E: "true" },
      },
    );
    allOk =
      e2e.status === 0
        ? ok("admin-predictions.spec.ts — 4/4 passed") && allOk
        : fail("E2E admin-predictions failed") && allOk;
  } else {
    console.log("\n(Omite tests; usa --run-tests para Vitest + Pytest + E2E)");
  }

  console.log(
    allOk ? "\n=== VERDE: Intercambiabilidad ítems 1–6 verificados ===" : "\n=== ROJO: revisar huecos arriba ===",
  );
  process.exit(allOk ? 0 : 1);
}

main();
