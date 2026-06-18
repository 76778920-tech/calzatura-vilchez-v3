#!/usr/bin/env node
/**
 * Verificación repetible de Cumplimiento de la funcionalidad (ISO/IEC 25010 / 9126).
 * Uso: node scripts/verify-cumplimiento-iso25000.mjs [--run-tests]
 *
 * Evalúa adherencia a normas legales y trazabilidad SRS — no SGSI ISO/IEC 27001.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  LEGAL_RF_EVIDENCE,
  LEGAL_RF_IDS,
  MUST_RF_EVIDENCE,
  MUST_RF_IDS,
} from "./iso25000-must-rf-manifest.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "calzatura-vilchez");

const COMPLIANCE_EVIDENCE = {
  "Catálogo SRS CU-T05": [
    "documentacion/cuadros-excel/CU-T05-requisitos.csv",
    "calzatura-vilchez/src/__tests__/functionalComplianceSrs.guard.test.js",
  ],
  "Manifest Must + legal": ["scripts/iso25000-must-rf-manifest.mjs"],
  "Estado del arte CU-T06": ["documentacion/cuadros-excel/CU-T06-trazabilidad-articulo-requisito.csv"],
  "Ley 29571 — libro reclamaciones": LEGAL_RF_EVIDENCE["RF-LEG-01"],
  "Ley 29733 — privacidad": LEGAL_RF_EVIDENCE["RF-LEG-02"],
  "Cookies / consentimiento": LEGAL_RF_EVIDENCE["RF-LEG-03"],
  "Términos comercio electrónico": LEGAL_RF_EVIDENCE["RF-LEG-04"],
  "BFF libro reclamaciones": [
    "calzatura-vilchez/bff/libroReclamaciones.cjs",
    "calzatura-vilchez/src/__tests__/complaintNotifyEmail.guard.test.js",
    "calzatura-vilchez/src/__tests__/functionalComplianceLegal.guard.test.js",
  ],
};

const VITEST_COMPLIANCE = [
  "src/__tests__/functionalComplianceSrs.guard.test.js",
  "src/__tests__/functionalComplianceLegal.guard.test.js",
];

const E2E_COMPLIANCE = [
  "e2e/cumplimiento-funcional-legal.spec.ts",
  "e2e/cookie-consent.spec.ts",
];

const TC_CMP_IDS = ["TC-CMP-001", "TC-CMP-002", "TC-CMP-003", "TC-CMP-004", "TC-CMP-005"];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readDashboardCompliance() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/data.json"), "utf8"));
  const func = data.characteristics.find((c) => c.id === "funcionalidad");
  return func?.subcharacteristics.find((s) => s.name === "Cumplimiento de la funcionalidad")?.percent ?? null;
}

function cuT05HasMustAndLegal() {
  const csv = fs.readFileSync(path.join(ROOT, "documentacion/cuadros-excel/CU-T05-requisitos.csv"), "utf8");
  const missing = [...MUST_RF_IDS, ...LEGAL_RF_IDS].filter((id) => !csv.includes(id));
  return missing;
}

function cuT07HasComplianceCases() {
  const csv = fs.readFileSync(
    path.join(ROOT, "documentacion/cuadros-excel/CU-T07-matriz-pruebas-requisitos.csv"),
    "utf8",
  );
  return TC_CMP_IDS.every((id) => csv.includes(id));
}

function manifestEvidenceOk() {
  const offenders = [];
  for (const [rf, files] of Object.entries({ ...MUST_RF_EVIDENCE, ...LEGAL_RF_EVIDENCE })) {
    const missing = files.filter((f) => !exists(f));
    if (missing.length) offenders.push({ rf, missing });
  }
  return offenders;
}

function main() {
  const runTests = process.argv.includes("--run-tests");
  let allOk = true;

  console.log("=== Verificación Cumplimiento funcional ISO 25010 ===\n");

  for (const doc of [
    "documentacion/cumplimiento-trazabilidad-iso25000.md",
    "documentacion/05-especificacion-requisitos-software-SRS.md",
    "dashboard-iso25000/data.json",
  ]) {
    allOk = exists(doc)
      ? (console.log(`OK: ${doc}`), true) && allOk
      : (console.error(`FAIL: falta ${doc}`), false) && allOk;
  }

  const pct = readDashboardCompliance();
  allOk =
    pct === 100
      ? (console.log(`OK: Dashboard Cumplimiento = ${pct}%`), true) && allOk
      : (console.error(`FAIL: Dashboard Cumplimiento = ${pct}% (esperado 100)`), false) && allOk;

  const cuT05Missing = cuT05HasMustAndLegal();
  allOk =
    cuT05Missing.length === 0
      ? (console.log(`OK: CU-T05 contiene ${MUST_RF_IDS.length} Must + ${LEGAL_RF_IDS.length} RF-LEG`), true) && allOk
      : (console.error(`FAIL: CU-T05 faltan: ${cuT05Missing.join(", ")}`), false) && allOk;

  allOk = cuT07HasComplianceCases()
    ? (console.log(`OK: CU-T07 contiene ${TC_CMP_IDS.join(", ")}`), true) && allOk
    : (console.error("FAIL: CU-T07 sin casos TC-CMP"), false) && allOk;

  const manifestGaps = manifestEvidenceOk();
  allOk =
    manifestGaps.length === 0
      ? (console.log(`OK: Manifest evidencia (${MUST_RF_IDS.length + LEGAL_RF_IDS.length} RF)`), true) && allOk
      : (manifestGaps.forEach(({ rf, missing }) => console.error(`FAIL: ${rf} — faltan: ${missing.join(", ")}`)), false) && allOk;

  console.log("\n--- Dominios de cumplimiento ---");
  for (const [domain, files] of Object.entries(COMPLIANCE_EVIDENCE)) {
    const unique = [...new Set(files)];
    const missing = unique.filter((f) => !exists(f));
    if (missing.length) {
      console.error(`FAIL: ${domain} — faltan: ${missing.join(", ")}`);
      allOk = false;
    } else {
      console.log(`OK: ${domain} (${unique.length} archivos)`);
    }
  }

  if (runTests) {
    console.log("\n--- Vitest (cumplimiento funcional) ---");
    const vitest = spawnSync(
      "node",
      ["scripts/run-clean-env.mjs", "vitest", "run", ...VITEST_COMPLIANCE],
      { cwd: APP, stdio: "inherit", shell: process.platform === "win32" },
    );
    allOk =
      vitest.status === 0
        ? (console.log("OK: Vitest cumplimiento"), true) && allOk
        : (console.error("FAIL: Vitest cumplimiento"), false) && allOk;

    console.log("\n--- E2E (páginas legales + cookies) ---");
    const e2e = spawnSync(
      "node",
      ["scripts/run-playwright.mjs", "test", ...E2E_COMPLIANCE],
      { cwd: APP, stdio: "inherit", shell: process.platform === "win32" },
    );
    allOk =
      e2e.status === 0 ? (console.log("OK: E2E cumplimiento"), true) && allOk : (console.error("FAIL: E2E cumplimiento"), false) && allOk;
  } else {
    console.log("\n(Omite tests; usa --run-tests para Vitest + E2E legal)");
  }

  console.log(
    allOk ? "\n=== VERDE: Cumplimiento funcional verificado ===" : "\n=== ROJO: revisar huecos arriba ===",
  );
  process.exit(allOk ? 0 : 1);
}

main();
