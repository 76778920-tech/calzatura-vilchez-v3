#!/usr/bin/env node
/**
 * Verificación Capacidad de recuperación — ítem por ítem.
 * Uso: node scripts/verify-recuperacion-iso25000.mjs [--run-drill-check]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
  return data.characteristics.find((c) => c.id === "fiabilidad")?.subcharacteristics.find((s) => s.name === "Capacidad de Recuperación")?.percent ?? null;
}

function checkItem1() {
  const op = read("documentacion/10-operacion-y-seguridad.md");
  const rb = read("docs/ops/runbook-recuperacion-desastres.md");
  const hasFirebase = rb.includes("Firebase") && (op.includes("Git remoto") || op.includes("Firebase"));
  return hasFirebase ? ok("Ítem 1: backups Firebase documentados (hosting/auth + Git)") : fail("Ítem 1: backups Firebase no documentados");
}

function checkItem2() {
  const op = read("documentacion/10-operacion-y-seguridad.md");
  const has = op.includes("Point-in-time recovery") || op.includes("PITR");
  const rb = read("docs/ops/runbook-recuperacion-desastres.md");
  return has && rb.includes("Supabase") ? ok("Ítem 2: backups Supabase PITR en 10-operacion + runbook") : fail("Ítem 2: Supabase backup incompleto");
}

function checkItem3() {
  const rb = read("docs/ops/runbook-recuperacion-desastres.md");
  const required = ["RTO", "RPO", "Restauración base de datos", "BFF (Render)", "Verificación post-recuperación"];
  const missing = required.filter((s) => !rb.includes(s));
  return missing.length === 0 ? ok("Ítem 3: runbook DR completo") : fail(`Ítem 3: runbook falta ${missing.join(", ")}`);
}

function checkItem4() {
  const live = path.join(ROOT, "docs/ops/restore-drill-evidence.json");
  const file = exists("docs/ops/restore-drill-evidence.json")
    ? live
    : path.join(ROOT, "docs/ops/restore-drill-evidence.ci.json");
  const evidence = JSON.parse(fs.readFileSync(file, "utf8"));
  const valid =
    ["pass", "passed"].includes(String(evidence.result).toLowerCase()) &&
    Array.isArray(evidence.verificationChecks) &&
    evidence.verificationChecks.length > 0;
  const label = evidence.evidenceType === "live-readonly" ? "live-readonly" : "fixture CI";
  return valid
    ? ok(`Ítem 4: evidencia restore drill (${evidence.drillId}) — ${label}`)
    : fail("Ítem 4: evidencia restore drill inválida");
}

function checkItem5(runDrill) {
  if (!exists("scripts/restore-drill-check.mjs")) return fail("Ítem 5: falta restore-drill-check.mjs");
  if (!read(".github/workflows/ci.yml").includes("restore-drill-check.mjs")) return fail("Ítem 5: CI sin restore drill");
  if (!runDrill) {
    ok("Ítem 5: script + CI presentes (usa --run-drill-check para ejecutar)");
    return true;
  }
  const evidenceFile = exists("docs/ops/restore-drill-evidence.json")
    ? "docs/ops/restore-drill-evidence.json"
    : "docs/ops/restore-drill-evidence.ci.json";
  const r = spawnSync(
    "node",
    ["scripts/restore-drill-check.mjs", "--evidence", evidenceFile, "--output", "artifacts/restore-drill/gate-summary.json"],
    { cwd: ROOT, stdio: "inherit" },
  );
  return r.status === 0 ? ok("Ítem 5: restore-drill-check ejecutado OK") : fail("Ítem 5: restore-drill-check falló");
}

function main() {
  const runDrill = process.argv.includes("--run-drill-check");
  console.log("=== Verificación Capacidad de recuperación — ítem por ítem ===\n");

  const results = {
    1: checkItem1(),
    2: checkItem2(),
    3: checkItem3(),
    4: checkItem4(),
    5: checkItem5(runDrill),
  };

  const items = [1, 2, 3, 4, 5];
  const passed = items.filter((n) => results[n]).length;
  const pct = Math.round((passed / items.length) * 100);
  const dash = readDashboardPct();

  console.log(`\n--- Resumen: ${passed}/${items.length} ítems (${pct} %) ---`);
  if (dash !== pct) fail(`Dashboard declara ${dash}% pero verificación = ${pct}%`);
  else ok(`Dashboard alineado: ${dash}%`);

  const allOk = passed === items.length && dash === pct;
  console.log(allOk ? "\n=== VERDE: Capacidad de recuperación ===" : "\n=== ROJO: Capacidad de recuperación ===");
  process.exit(allOk ? 0 : 1);
}

main();
