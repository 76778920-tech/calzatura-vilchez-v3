#!/usr/bin/env node
/**
 * Verificación Cumplimiento de fiabilidad — ítem por ítem (RNF-CAP-02).
 * Uso: node scripts/verify-cumplimiento-fiabilidad-iso25000.mjs [--run-evidence-check]
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
  return data.characteristics.find((c) => c.id === "fiabilidad")?.subcharacteristics.find((s) => s.name === "Cumplimiento de Fiabilidad")?.percent ?? null;
}

function checkItem1() {
  const doc = read("documentacion/08-pruebas-y-calidad.md");
  return doc.includes("RNF-CAP-02") && doc.includes("k6") ? ok("Ítem 1: RNF-CAP-02 documentado") : fail("Ítem 1: RNF-CAP-02 ausente");
}

function checkItem2() {
  const scripts = ["load-tests/scenarios/smoke-read.js", "load-tests/scenarios/read-mixed-1000.js", "scripts/run-load-test.ps1"];
  const missing = scripts.filter((s) => !exists(s));
  return missing.length === 0 ? ok("Ítem 2: scripts k6 disponibles") : fail(`Ítem 2: faltan ${missing.join(", ")}`);
}

function checkEvidenceItem(n, file, runCheck) {
  if (!exists(file)) return fail(`Ítem ${n}: falta ${file}`);
  const ev = JSON.parse(read(file));
  if (!["pass", "passed"].includes(String(ev.result).toLowerCase())) return fail(`Ítem ${n}: result no pass`);
  if (!runCheck) return ok(`Ítem ${n}: evidencia ${path.basename(file)} presente`);
  const r = spawnSync("node", ["scripts/k6-evidence-check.mjs", "--evidence", file], { cwd: ROOT, encoding: "utf8" });
  return r.status === 0 ? ok(`Ítem ${n}: ${path.basename(file)} validado`) : fail(`Ítem ${n}: evidencia inválida`);
}

function checkItem5() {
  if (!exists("docs/ops/k6-mixed2000-bff-evidence.json")) {
    return fail("Ítem 5: falta docs/ops/k6-mixed2000-bff-evidence.json");
  }
  const ev = JSON.parse(read("docs/ops/k6-mixed2000-bff-evidence.json"));
  if (!["pass", "passed"].includes(String(ev.result).toLowerCase())) {
    return fail("Ítem 5: mixed2000-bff result no pass");
  }
  if (!ev.bffIncluded) return fail("Ítem 5: mixed2000 sin bffIncluded");
  return ok("Ítem 5: k6-mixed2000-bff-evidence.json (2000 VU BFF live)");
}

function checkItem6() {
  const live = [
    "docs/ops/k6-smoke-evidence.json",
    "docs/ops/k6-mixed1000-bff-evidence.json",
  ];
  const missing = live.filter((s) => !exists(s));
  if (missing.length > 0) return fail(`Ítem 6: faltan ${missing.join(", ")}`);
  for (const f of live) {
    const ev = JSON.parse(read(f));
    if (ev.evidenceType !== "live-run") return fail(`Ítem 6: ${f} no es corrida live`);
  }
  const bff = JSON.parse(read("docs/ops/k6-mixed1000-bff-evidence.json"));
  if (!bff.bffIncluded) return fail("Ítem 6: mixed1000-bff sin bffIncluded");
  return ok("Ítem 6: evidencia k6 live (smoke + mixed1000 BFF) archivada en docs/ops/");
}

function checkItem7() {
  return exists("scripts/verify-cumplimiento-fiabilidad-iso25000.mjs")
    ? ok("Ítem 7: gate verify-cumplimiento-fiabilidad presente")
    : fail("Ítem 7: falta gate");
}

function main() {
  const runCheck = process.argv.includes("--run-evidence-check");
  console.log("=== Verificación Cumplimiento de fiabilidad — ítem por ítem ===\n");

  if (runCheck) {
    for (const [ev, out] of [
      ["docs/ops/k6-smoke-evidence.json", "artifacts/load-tests/k6-smoke-summary.ci.json"],
      ["docs/ops/k6-mixed1000-bff-evidence.json", "artifacts/load-tests/k6-mixed1000-summary.ci.json"],
    ]) {
      spawnSync("node", ["scripts/k6-evidence-check.mjs", "--evidence", ev, "--output", out], { cwd: ROOT, stdio: "inherit" });
    }
  }

  const results = {
    1: checkItem1(),
    2: checkItem2(),
    3: checkEvidenceItem(3, "docs/ops/k6-smoke-evidence.json", runCheck),
    4: checkEvidenceItem(4, "docs/ops/k6-mixed1000-bff-evidence.json", runCheck),
    5: checkItem5(),
    6: checkItem6(),
    7: checkItem7(),
  };

  const items = [1, 2, 3, 4, 5, 6, 7];
  const passed = items.filter((n) => results[n]).length;
  const pct = Math.round((passed / items.length) * 100);
  const dash = readDashboardPct();

  console.log(`\n--- Resumen: ${passed}/${items.length} ítems (${pct} %) ---`);
  if (dash !== pct) fail(`Dashboard declara ${dash}% pero verificación = ${pct}%`);
  else ok(`Dashboard alineado: ${dash}%`);

  const allOk = passed === items.length && dash === pct;
  console.log(allOk ? "\n=== VERDE: Cumplimiento de fiabilidad ===" : "\n=== ROJO: Cumplimiento de fiabilidad ===");
  process.exit(allOk ? 0 : 1);
}

main();
