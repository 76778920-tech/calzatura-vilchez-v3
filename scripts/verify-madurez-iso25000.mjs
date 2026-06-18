#!/usr/bin/env node
/**
 * Verificación Madurez — un ítem de lista de cotejo por validación.
 * Uso: node scripts/verify-madurez-iso25000.mjs [--check-ci] [--check-audit]
 *
 * Regla CI (--check-ci): el run del workflow para GITHUB_SHA debe terminar en success.
 * Si aún está en curso (p. ej. SonarQube en paralelo con ci.yml), espera hasta SONAR_WAIT_MS.
 * No se acepta un success antiguo mientras el run del commit actual falla o sigue pendiente.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Intervalo entre consultas a GitHub Actions cuando un workflow del commit sigue en curso. */
const GH_POLL_INTERVAL_MS = 30_000;
/** Tiempo máximo de espera al run de Sonar del mismo commit (ci.yml y sonarqube.yml van en paralelo). */
const SONAR_WAIT_MS = Number(process.env.MADUREZ_SONAR_WAIT_MS ?? 10 * 60_000);

const WORKFLOWS = {
  1: { file: "ci.yml", jobHint: "Lint + Tests + Build", label: "CI lint/typecheck/unit" },
  2: { file: "ci-integration.yml", jobHint: null, label: "CI Integration E2E" },
  3: { file: "sonarqube.yml", jobHint: null, label: "SonarQube Analysis", waitForSha: true },
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

function ghListRuns(workflowFile, { status = null, limit = 10 } = {}) {
  const args = [
    "run",
    "list",
    "--workflow",
    workflowFile,
    "--branch",
    "main",
    "--limit",
    String(limit),
    "--json",
    "databaseId,conclusion,displayTitle,createdAt,headSha,status",
  ];
  if (status) args.push("--status", status);

  const r = spawnSync("gh", args, { encoding: "utf8", cwd: ROOT });
  if (r.status !== 0) return null;
  try {
    return JSON.parse(r.stdout.trim() || "[]");
  } catch {
    return null;
  }
}

function isActiveRun(run) {
  return run.status === "in_progress" || run.status === "queued" || run.status === "waiting";
}

/**
 * Último run completado (excluye el workflow run actual si coincide databaseId).
 * Estricto: no reutiliza un success antiguo si el más reciente completado es failure.
 */
function ghStrictLatestCompleted(workflowFile) {
  const runs = ghListRuns(workflowFile, { status: "completed", limit: 10 });
  if (!runs) return { run: null, reason: "gh no disponible o sin permisos" };

  const currentId = process.env.GITHUB_RUN_ID ? Number(process.env.GITHUB_RUN_ID) : null;
  const latest = runs.find((run) => currentId == null || run.databaseId !== currentId) ?? null;
  if (!latest) return { run: null, reason: "sin runs completados" };
  if (latest.conclusion !== "success") {
    return { run: latest, reason: latest.conclusion ?? "sin conclusion" };
  }
  return { run: latest, reason: null };
}

async function ghRunForCurrentSha(workflowFile, { wait = false, maxWaitMs = SONAR_WAIT_MS } = {}) {
  const sha = process.env.GITHUB_SHA?.trim();
  if (!sha) return null;

  const deadline = Date.now() + (wait ? maxWaitMs : 0);
  let polls = 0;

  while (true) {
    polls += 1;
    const runs = ghListRuns(workflowFile, { limit: 15 });
    if (!runs) return { run: null, reason: "gh no disponible o sin permisos", sha, polls };

    const forSha = runs.filter((run) => run.headSha === sha);
    const active = forSha.find(isActiveRun);
    const completed = forSha.find((run) => run.status === "completed");

    if (completed) {
      if (completed.conclusion === "success") {
        return { run: completed, reason: null, sha, polls };
      }
      return {
        run: completed,
        reason: completed.conclusion ?? "failure",
        sha,
        polls,
      };
    }

    if (active && wait && Date.now() < deadline) {
      const remaining = Math.ceil((deadline - Date.now()) / 1000);
      console.log(
        `[madurez] ${workflowFile} en curso para ${sha.slice(0, 7)} — reintento en ${GH_POLL_INTERVAL_MS / 1000}s (quedan ~${remaining}s)`,
      );
      await delay(GH_POLL_INTERVAL_MS);
      continue;
    }

    if (active) {
      return { run: active, reason: "in_progress", sha, polls };
    }

    return { run: null, reason: "sin run para este commit", sha, polls };
  }
}

async function ghWorkflowCheck(workflowFile, { waitForSha = false } = {}) {
  if (process.env.GITHUB_SHA?.trim() && waitForSha) {
    return ghRunForCurrentSha(workflowFile, { wait: true });
  }
  return ghStrictLatestCompleted(workflowFile);
}

function formatWorkflowFailure(workflowFile, result) {
  if (!result) return "sin datos";
  if (result.reason === "in_progress") {
    return `aún en curso para ${result.sha?.slice(0, 7) ?? "commit"} (espera agotada)`;
  }
  if (result.reason === "sin run para este commit") {
    return `sin run en main para ${result.sha?.slice(0, 7) ?? "commit"}`;
  }
  return result.reason ?? result.run?.conclusion ?? "sin datos";
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

async function checkItem1(checkCi, checkAudit) {
  const ci = fs.readFileSync(path.join(ROOT, ".github/workflows/ci.yml"), "utf8");
  let pass = ci.includes("npm run lint") && ci.includes("npm test") && ci.includes("npm run typecheck");
  pass = pass ? ok("Ítem 1: ci.yml define lint + unit + typecheck") : fail("Ítem 1: ci.yml incompleto") && false;
  if (checkAudit) {
    const fe = npmAuditOk("calzatura-vilchez");
    const fn = npmAuditOk("calzatura-vilchez/functions");
    pass = fe && fn ? ok("Ítem 1: npm audit high/critical limpio (frontend + functions)") && pass : fail("Ítem 1: npm audit falla — commitear package-lock.json") && false;
  }
  if (checkCi) {
    const result = await ghWorkflowCheck("ci.yml");
    pass =
      result?.run && !result.reason
        ? ok(`Ítem 1: último ci.yml success (${result.run.createdAt})`) && pass
        : fail(`Ítem 1: último ci.yml = ${formatWorkflowFailure("ci.yml", result)}`) && false;
  }
  return pass;
}

async function checkWorkflowItem(n, checkCi) {
  const wf = WORKFLOWS[n];
  const pass = exists(`.github/workflows/${wf.file}`)
    ? ok(`Ítem ${n}: workflow ${wf.file} presente`)
    : fail(`Ítem ${n}: falta ${wf.file}`);
  if (!pass || !checkCi) return pass;

  const result = await ghWorkflowCheck(wf.file, { waitForSha: Boolean(wf.waitForSha) });
  return result?.run && !result.reason
    ? ok(`Ítem ${n}: ${wf.label} — success (${result.run.createdAt})`) && pass
    : fail(`Ítem ${n}: ${wf.label} — ${formatWorkflowFailure(wf.file, result)}`) && false;
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

async function checkItem7(checkCi) {
  if (!checkCi) {
    console.log("(Ítem 7: omitido sin --check-ci — no cuenta para el score)");
    return null;
  }
  const files = [
    { file: "ci.yml", waitForSha: false },
    { file: "ci-integration.yml", waitForSha: false },
    { file: "sonarqube.yml", waitForSha: true },
    { file: "security-devsecops.yml", waitForSha: false },
  ];
  let pass = true;
  for (const { file, waitForSha } of files) {
    const result = await ghWorkflowCheck(file, { waitForSha });
    pass =
      result?.run && !result.reason
        ? ok(`Ítem 7: ${file} success`) && pass
        : fail(`Ítem 7: ${file} = ${formatWorkflowFailure(file, result)}`) && false;
  }
  return pass;
}

function checkItem8() {
  return exists("scripts/verify-madurez-iso25000.mjs") && exists("documentacion/fiabilidad-trazabilidad-iso25000.md")
    ? ok("Ítem 8: gate + trazabilidad Madurez")
    : fail("Ítem 8: falta gate o documentación");
}

async function main() {
  const checkCi = process.argv.includes("--check-ci");
  const checkAudit = process.argv.includes("--check-audit") || checkCi;
  const items = [1, 2, 3, 4, 5, 6, 7, 8];
  const results = {};

  console.log("=== Verificación Madurez — ítem por ítem ===\n");

  results[1] = await checkItem1(checkCi, checkAudit);
  results[2] = await checkWorkflowItem(2, checkCi);
  results[3] = await checkWorkflowItem(3, checkCi);
  results[4] = await checkWorkflowItem(4, checkCi);
  results[5] = await checkWorkflowItem(5, checkCi);
  results[6] = checkItem6();
  results[7] = await checkItem7(checkCi);
  results[8] = checkItem8();

  const passed = items.filter((n) => results[n] === true).length;
  const evaluated = items.filter((n) => results[n] !== null).length;
  const skipped = items.length - evaluated;
  const pct = evaluated > 0 ? Math.round((passed / evaluated) * 100) : 0;
  const dash = readDashboardPct();

  const summaryLabel =
    skipped > 0
      ? `${passed}/${evaluated} ítems evaluados (${skipped} omitido(s) sin --check-ci)`
      : `${passed}/${items.length} ítems`;
  console.log(`\n--- Resumen: ${summaryLabel} (${pct} %) ---`);
  if (dash !== pct) {
    fail(`Dashboard declara ${dash}% pero la verificación calcula ${pct}%`);
  } else {
    ok(`Dashboard alineado: ${dash}%`);
  }

  const allOk = passed === evaluated && dash === pct;
  console.log(allOk ? "\n=== VERDE: Madurez ===" : "\n=== ROJO: Madurez — revisar ítems arriba ===");
  process.exit(allOk ? 0 : 1);
}

main();
