#!/usr/bin/env node
/**
 * Valida evidencia archivada de corridas k6 (RNF-CAP-02).
 * Uso: node scripts/k6-evidence-check.mjs --evidence <file.json> [--output summary.json]
 */
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { evidence: "", output: "", warnOnly: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[i];
    };
    if (arg === "--evidence") args.evidence = next();
    else if (arg === "--output") args.output = next();
    else if (arg === "--warn-only") args.warnOnly = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: node scripts/k6-evidence-check.mjs --evidence <file.json> [--output summary.json]`);
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.evidence) throw new Error("--evidence is required");
  return args;
}

function readEvidence(file) {
  const resolved = path.resolve(file);
  return { resolved, evidence: JSON.parse(fs.readFileSync(resolved, "utf8")) };
}

function validate(evidence) {
  const failures = [];
  const required = ["runId", "scenario", "date", "environment", "script", "peakVus", "result", "metrics", "thresholds"];

  for (const field of required) {
    if (evidence[field] === undefined || evidence[field] === "") {
      failures.push(`Missing required field: ${field}`);
    }
  }

  if (!["pass", "passed"].includes(String(evidence.result || "").toLowerCase())) {
    failures.push(`result must be pass/passed, got: ${evidence.result}`);
  }

  const m = evidence.metrics || {};
  const t = evidence.thresholds || {};

  if (Number(m.httpReqFailedRate) > Number(t.maxHttpFailedRate ?? 0.02)) {
    failures.push(`httpReqFailedRate ${m.httpReqFailedRate} > max ${t.maxHttpFailedRate ?? 0.02}`);
  }
  if (Number(m.p95CatalogMs) > Number(t.maxP95CatalogMs ?? 3000)) {
    failures.push(`p95CatalogMs ${m.p95CatalogMs} > max ${t.maxP95CatalogMs ?? 3000}`);
  }

  if (!fs.existsSync(path.resolve(evidence.script))) {
    failures.push(`script path not found: ${evidence.script}`);
  }

  return failures;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { resolved, evidence } = readEvidence(args.evidence);
  const failures = validate(evidence);
  const passed = failures.length === 0;
  const summary = {
    status: passed ? "passed" : "failed",
    evidencePath: resolved,
    checkedAt: new Date().toISOString(),
    scenario: evidence.scenario,
    observed: evidence.metrics,
    failures,
  };

  if (args.output) {
    const out = path.resolve(args.output);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  }

  console.log(`K6 evidence check: ${summary.status} (${evidence.scenario || "unknown"})`);
  for (const f of failures) console.log(`FAIL ${f}`);
  if (!passed && !args.warnOnly) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(`k6-evidence-check: ${error.message}`);
  process.exit(1);
}
