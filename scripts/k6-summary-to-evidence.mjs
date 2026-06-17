#!/usr/bin/env node
/**
 * Convierte salida --summary-export de k6 en evidencia RNF-CAP-02.
 * Uso: node scripts/k6-summary-to-evidence.mjs --summary artifacts/load-tests/k6-smoke-*.json --scenario smoke --output docs/ops/k6-smoke-evidence.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = { summary: "", scenario: "", output: "", peakVus: 0, script: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length) throw new Error(`Missing value for ${a}`);
      return argv[i];
    };
    if (a === "--summary") args.summary = next();
    else if (a === "--scenario") args.scenario = next();
    else if (a === "--output") args.output = next();
    else if (a === "--peak-vus") args.peakVus = Number(next());
    else if (a === "--script") args.script = next();
    else throw new Error(`Unknown arg: ${a}`);
  }
  if (!args.summary || !args.scenario || !args.output) {
    throw new Error("Requires --summary --scenario --output");
  }
  return args;
}

function metricValue(metrics, name, stat = "p95") {
  const m = metrics?.[name];
  if (!m) return null;
  if (stat === "rate") {
    if (typeof m.value === "number") return m.value;
    if (m.values?.rate != null) return m.values.rate;
    return null;
  }
  if (m["p(95)"] != null) return m["p(95)"];
  if (m.values?.["p(95)"] != null) return m.values["p(95)"];
  return m.avg ?? null;
}

function metricP95(metrics, names) {
  for (const name of names) {
    const v = metricValue(metrics, name);
    if (v != null && v > 0) return v;
  }
  const overall = metricValue(metrics, "http_req_duration");
  return overall != null ? overall : 9999;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const summaryPath = path.resolve(args.summary);
  const data = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const metrics = data.metrics || {};

  const httpFailed = metricValue(metrics, "http_req_failed", "rate") ?? 1;
  const p95Catalog = metricP95(metrics, [
    "http_req_duration{name:bff_catalog_active}",
    "http_req_duration{name:supabase_catalog_list}",
    "http_req_duration{name:bff_catalog_page}",
  ]);
  const p95Detail = metricP95(metrics, [
    "http_req_duration{name:supabase_product_detail}",
    "http_req_duration{name:bff_product_detail}",
  ]);
  const p95Bff = metricP95(metrics, ["http_req_duration{name:bff_health}"]);

  const thresholds = {
    maxHttpFailedRate: 0.02,
    maxP95CatalogMs: 3000,
    maxP95DetailMs: 2500,
    maxP95BffHealthMs: 1500,
  };

  const catalogLimit = args.scenario === "mixed1000" ? 4000 : thresholds.maxP95CatalogMs;

  const pass =
    httpFailed <= thresholds.maxHttpFailedRate &&
    p95Catalog <= catalogLimit &&
    p95Detail <= thresholds.maxP95DetailMs + 1500;

  const scriptMap = {
    smoke: "load-tests/scenarios/smoke-read.js",
    mixed500: "load-tests/scenarios/read-mixed-500.js",
    mixed1000: "load-tests/scenarios/read-mixed-1000.js",
    mixed2000: "load-tests/scenarios/read-mixed-2000.js",
  };

  const peakVus = args.peakVus || metrics.vus_max?.max || metrics.vus?.max || 0;
  const today = new Date().toISOString().slice(0, 10);

  const evidence = {
    runId: `k6-${args.scenario}-live-${today}`,
    scenario: args.scenario,
    date: today,
    owner: "Calidad / Calzatura Vilchez",
    environment: process.env.LOAD_ENV || "production",
    evidenceType: "live-run",
    script: args.script || scriptMap[args.scenario] || "",
    peakVus,
    duration: "see k6 summary",
    result: pass ? "pass" : "fail",
    metrics: {
      httpReqFailedRate: Number(httpFailed.toFixed(4)),
      p95CatalogMs: Math.round(p95Catalog),
      p95DetailMs: Math.round(p95Detail),
      p95BffHealthMs: Math.round(p95Bff || 0),
    },
    thresholds: { ...thresholds, maxP95CatalogMs: catalogLimit },
    k6SummaryPath: path.relative(ROOT, summaryPath).replace(/\\/g, "/"),
    notes: "Generado desde corrida k6 real (SkipBff=lecturas Supabase). scripts/k6-summary-to-evidence.mjs",
  };

  const outPath = path.resolve(args.output);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  console.log(`k6-summary-to-evidence: ${evidence.result} → ${args.output}`);
  console.log(
    `  httpReqFailedRate=${evidence.metrics.httpReqFailedRate} p95CatalogMs=${evidence.metrics.p95CatalogMs} p95DetailMs=${evidence.metrics.p95DetailMs}`,
  );
  if (!pass) process.exit(1);
}

try {
  main();
} catch (e) {
  console.error(`k6-summary-to-evidence: ${e.message}`);
  process.exit(1);
}
