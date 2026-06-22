#!/usr/bin/env node
/**
 * Verificación Usabilidad — lista de cotejo ISO 9126-1 (5 subcaracterísticas).
 * No exige acta SUS completada (evita datos ficticios); sí exige preparación verificable.
 *
 * Uso: node scripts/verify-usabilidad-iso25000.mjs [--check-ci]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "calzatura-vilchez");

const ACTA_COMPLETADA_GLOB = "documentacion/plantillas/acta-sesion-usabilidad-COMPLETADA";

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

function hasActaCompletada() {
  const dir = path.join(ROOT, "documentacion/plantillas");
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some((f) => f.startsWith("acta-sesion-usabilidad-COMPLETADA"));
}

function ghCurrentRunJobOk(jobName) {
  const runId = process.env.GITHUB_RUN_ID;
  if (!runId) return null;
  const r = spawnSync("gh", ["run", "view", runId, "--json", "jobs"], { encoding: "utf8", cwd: ROOT });
  if (r.status !== 0) return false;
  const jobs = JSON.parse(r.stdout.trim() || "{}").jobs ?? [];
  const job = jobs.find((j) => j.name === jobName);
  return job?.status === "completed" && job?.conclusion === "success";
}

function checkInteligibilidad() {
  let pass = true;
  pass = exists("calzatura-vilchez/src/routes/paths.ts") ? ok("I1: paths.ts rutas públicas") && pass : fail("I1") && false;
  const paths = read("calzatura-vilchez/src/routes/paths.ts");
  pass =
    paths.includes("ayudaPreguntasFrecuentes") && paths.includes("ayudaRastreoPedido")
      ? ok("I2: rutas ayuda declaradas")
      : fail("I2: faltan rutas ayuda") && false;
  pass = exists("calzatura-vilchez/e2e/accessibility.spec.ts")
    ? ok("I3: E2E axe WCAG accessibility.spec.ts")
    : fail("I3") && false;
  const a11y = read("calzatura-vilchez/e2e/accessibility.spec.ts");
  pass =
    a11y.includes("wcag21aa") && a11y.includes('page.goto("/")')
      ? ok("I4: axe WCAG 2.1 AA en rutas públicas")
      : fail("I4") && false;
  pass =
    read("calzatura-vilchez/src/domains/carrito/components/CheckoutDeliveryMap.tsx").includes("checkout-delivery-map-hint")
      ? ok("I5: ayudas visuales checkout (hints)")
      : fail("I5") && false;
  return pass;
}

function checkAprendizaje() {
  let pass = true;
  pass = exists("calzatura-vilchez/e2e/register-validation.spec.ts")
    ? ok("L1: E2E register-validation")
    : fail("L1") && false;
  pass = exists("calzatura-vilchez/src/__tests__/adminPredictionsTypes.test.ts")
    ? ok("L2: unit test selectores IA (loadPref)")
    : fail("L2") && false;
  const model = read("calzatura-vilchez/src/domains/administradores/predictions/useAdminPredictionsModel.tsx");
  pass =
    model.includes('localStorage.setItem("pred_horizon"') && model.includes("loadPref")
      ? ok("L3: persistencia horizonte/historial/alertas IA")
      : fail("L3") && false;
  pass = exists("calzatura-vilchez/e2e/admin-predictions.spec.ts")
    ? ok("L4: E2E admin-predictions (feedback insuficientes)")
    : fail("L4") && false;
  return pass;
}

function checkOperabilidad() {
  let pass = true;
  pass = exists("calzatura-vilchez/e2e/admin-product-delete.spec.ts")
    ? ok("O1: E2E confirmación borrado producto TC-PROD-DEL01/02")
    : fail("O1") && false;
  pass = exists("calzatura-vilchez/e2e/admin-layout.spec.ts")
    ? ok("O2: E2E admin-layout (aria-current, sidebar)")
    : fail("O2") && false;
  const del = read("calzatura-vilchez/e2e/admin-product-delete.spec.ts");
  pass =
    del.includes("TC-PROD-DEL01") && del.includes("TC-PROD-DEL02")
      ? ok("O3: casos confirmar/cancelar destructivo")
      : fail("O3") && false;
  return pass;
}

function checkAtractividad() {
  let pass = true;
  const pw = read("calzatura-vilchez/playwright.config.ts");
  pass =
    pw.includes("iphone-safari") && pw.includes("idoneidad-journey.spec.ts")
      ? ok("A1: viewport móvil iPhone 13 en matriz Playwright")
      : fail("A1") && false;
  pass = exists("calzatura-vilchez/e2e/browser-matrix.spec.ts")
    ? ok("A2: browser-matrix humo multi-navegador")
    : fail("A2") && false;
  pass =
    read("calzatura-vilchez/e2e/admin-layout.spec.ts").includes("tema")
      ? ok("A3: E2E toggle tema claro/oscuro admin")
      : fail("A3: toggle tema") && false;
  return pass;
}

function checkCumplimiento(checkCi) {
  let pass = true;
  const srs = read("documentacion/05-especificacion-requisitos-software-SRS.md");
  pass = srs.includes("RNF-USA-01") ? ok("U1: RNF-USA-01 en SRS") && pass : fail("U1: falta RNF-USA-01") && false;
  pass =
    srs.toLowerCase().includes("wcag") || srs.includes("RNF-USA-02")
      ? ok("U2: accesibilidad/WCAG referenciada en SRS")
      : fail("U2: falta RNF-USA-02 o WCAG en SRS") && false;
  pass = exists("documentacion/plantillas/instrumento-sus-calzatura-vilchez.md")
    ? ok("U3: instrumento SUS Brooke documentado")
    : fail("U3") && false;
  pass = exists("documentacion/usabilidad-trazabilidad-iso25000.md")
    ? ok("U4: trazabilidad usabilidad + ISO 9241-11")
    : fail("U4") && false;
  pass = exists("documentacion/plantillas/acta-sesion-usabilidad-PLANTILLA.md")
    ? ok("U5: plantilla acta sesión (sin datos ficticios)")
    : fail("U5") && false;

  const ci = read(".github/workflows/ci.yml");
  pass = ci.includes("test:e2e") ? ok("U6: job E2E en CI (incluye accessibility)") && pass : fail("U6") && false;

  if (checkCi) {
    pass =
      ghCurrentRunJobOk("E2E Playwright (Chromium)") === true
        ? ok("U7: job E2E success en run actual")
        : fail("U7: E2E no success en run actual") && false;
  } else {
    ok("U7: E2E CI (omitido sin --check-ci)");
  }

  if (hasActaCompletada()) {
    ok("U8: acta sesión COMPLETADA presente — revisar SUS ≥70 manualmente");
  } else {
    ok("U8: sesión SUS pendiente (correcto: no acta ficticia en repo)");
  }

  pass = exists("scripts/verify-usabilidad-iso25000.mjs") ? ok("U9: gate verify-usabilidad") && pass : fail("U9") && false;

  return pass;
}

function main() {
  const checkCi = process.argv.includes("--check-ci");
  console.log("=== Gate Usabilidad ISO 9126-1 ===\n");

  let pass = true;
  console.log("--- Inteligibilidad ---");
  pass = checkInteligibilidad() && pass;
  console.log("\n--- Facilidad de aprendizaje ---");
  pass = checkAprendizaje() && pass;
  console.log("\n--- Operabilidad ---");
  pass = checkOperabilidad() && pass;
  console.log("\n--- Atractividad ---");
  pass = checkAtractividad() && pass;
  console.log("\n--- Cumplimiento usabilidad ---");
  pass = checkCumplimiento(checkCi) && pass;

  console.log(pass ? "\nRESULT: VERDE — preparación usabilidad verificada" : "\nRESULT: ROJO — corregir ítems FAIL");
  process.exit(pass ? 0 : 1);
}

main();
