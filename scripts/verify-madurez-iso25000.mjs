#!/usr/bin/env node
/**
 * Verificación Madurez — un ítem de lista de cotejo por validación.
 * Uso: node scripts/verify-madurez-iso25000.mjs [--check-ci] [--check-audit]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const WORKFLOWS = {
  1: { file: "ci.yml", jobHint: "Lint + Tests + Build", label: "CI lint/typecheck/unit" },
  2: { file: "ci-integration.yml", jobHint: null, label: "CI Integration E2E" },
  3: { file: "sonarqube.yml", jobHint: null, label: "SonarQube Analysis" },
  4: { file: "security-devsecops.yml", jobHint: null, label: "Security DevSecOps Gates" },
  5: { file: "ci.yml", jobHint: "AI Service", label: "CI servicio IA" },
  7: { file: "ci.yml", label: "Último run workflows madurez" },
};

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

function ghLatestRun(workflowFile) {
  const r = spawnSync(
    "gh",
    [
      "run",
      "list",
      "--workflow",
      workflowFile,
      "--branch",
      "main",
      "--status",
      "completed",
      "--limit",
      "5",
      "--json",
      "databaseId,conclusion,displayTitle,createdAt",
    ],
    { encoding: "utf8", cwd: ROOT },
  );
  if (r.status !== 0) return null;
  try {
    const runs = JSON.parse(r.stdout.trim() || "[]");
    const currentId = process.env.GITHUB_RUN_ID ? Number(process.env.GITHUB_RUN_ID) : null;
    for (const run of runs) {
      if (currentId != null && run.databaseId === currentId) continue;
      if (run.conclusion === "success") return run;
    }
    return null;
  } catch {
    return null;
  }
}

function npmAuditOk(dir) {
  const r = spawnSync("npm", ["audit", "--omit=dev", "--audit-level=high"], {
    cwd: path.join(ROOT, dir),
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return r.status === 0;
}

function readDashboardPct() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/data.json"), "utf8"));
  return data.characteristics.find((c) => c.id === "fiabilidad")?.subcharacteristics.find((s) => s.name === "Madurez")?.percent ?? null;
}

function checkItem1(checkCi, checkAudit) {
  const ci = fs.readFileSync(path.join(ROOT, ".github/workflows/ci.yml"), "utf8");
  let pass = ci.includes("npm run lint") && ci.includes("npm test") && ci.includes("npm run typecheck");
  pass = pass ? ok("Ítem 1: ci.yml define lint + unit + typecheck") : fail("Ítem 1: ci.yml incompleto") && false;
  if (checkAudit) {
    const fe = npmAuditOk("calzatura-vilchez");
    const fn = npmAuditOk("calzatura-vilchez/functions");
    pass = fe && fn ? ok("Ítem 1: npm audit high/critical limpio (frontend + functions)") && pass : fail("Ítem 1: npm audit falla — commitear package-lock.json") && false;
  }
  if (checkCi) {
    const run = ghLatestRun("ci.yml");
    pass =
      run?.conclusion === "success"
        ? ok(`Ítem 1: último ci.yml success (${run.createdAt})`) && pass
        : fail(`Ítem 1: último ci.yml = ${run?.conclusion ?? "sin datos"}`) && false;
  }
  return pass;
}

function checkWorkflowItem(n, checkCi) {
  const wf = WORKFLOWS[n];
  const pass = exists(`.github/workflows/${wf.file}`)
    ? ok(`Ítem ${n}: workflow ${wf.file} presente`)
    : fail(`Ítem ${n}: falta ${wf.file}`);
  if (!pass || !checkCi) return pass;
  const run = ghLatestRun(wf.file);
  return run?.conclusion === "success"
    ? ok(`Ítem ${n}: ${wf.label} — success (${run.createdAt})`) && pass
    : fail(`Ítem ${n}: ${wf.label} — ${run?.conclusion ?? "sin gh"}`) && false;
}

function checkItem6() {
  const ci = fs.readFileSync(path.join(ROOT, ".github/workflows/ci.yml"), "utf8");
  const markers = ["readiness-check.mjs", "ai-backtest-gate.mjs", "restore-drill-check.mjs", "k6-evidence-check.mjs"];
  let pass = true;
  for (const m of markers) {
    pass = ci.includes(m) ? ok(`Ítem 6: CI incluye ${m}`) && pass : fail(`Ítem 6: CI sin ${m}`) && false;
  }
  return pass;
}

function checkItem7(checkCi) {
  if (!checkCi) {
    console.log("(Ítem 7: omitido sin --check-ci — no cuenta para el score)");
    return null;
  }
  const files = ["ci.yml", "ci-integration.yml", "sonarqube.yml", "security-devsecops.yml"];
  let pass = true;
  for (const f of files) {
    const run = ghLatestRun(f);
    pass =
      run?.conclusion === "success"
        ? ok(`Ítem 7: ${f} success`) && pass
        : fail(`Ítem 7: ${f} = ${run?.conclusion ?? "sin gh"}`) && false;
  }
  return pass;
}

function checkItem8() {
  return exists("scripts/verify-madurez-iso25000.mjs") && exists("documentacion/fiabilidad-trazabilidad-iso25000.md")
    ? ok("Ítem 8: gate + trazabilidad Madurez")
    : fail("Ítem 8: falta gate o documentación");
}

function main() {
  const checkCi = process.argv.includes("--check-ci");
  const checkAudit = process.argv.includes("--check-audit") || checkCi;
  const items = [1, 2, 3, 4, 5, 6, 7, 8];
  const results = {};

  console.log("=== Verificación Madurez — ítem por ítem ===\n");

  results[1] = checkItem1(checkCi, checkAudit);
  results[2] = checkWorkflowItem(2, checkCi);
  results[3] = checkWorkflowItem(3, checkCi);
  results[4] = checkWorkflowItem(4, checkCi);
  results[5] = checkWorkflowItem(5, checkCi);
  results[6] = checkItem6();
  results[7] = checkItem7(checkCi);
  results[8] = checkItem8();

  const passed = items.filter((n) => results[n] === true).length;
  const evaluated = items.filter((n) => results[n] !== null).length;
  const pct = Math.round((passed / items.length) * 100);
  const dash = readDashboardPct();

  console.log(`\n--- Resumen: ${passed}/${items.length} ítems (${pct} %) ---`);
  if (dash !== pct) {
    fail(`Dashboard declara ${dash}% pero la verificación calcula ${pct}%`);
  } else {
    ok(`Dashboard alineado: ${dash}%`);
  }

  const allOk = passed === items.length && dash === pct && evaluated === items.length;
  console.log(allOk ? "\n=== VERDE: Madurez ===" : "\n=== ROJO: Madurez — revisar ítems arriba ===");
  process.exit(allOk ? 0 : 1);
}

main();
