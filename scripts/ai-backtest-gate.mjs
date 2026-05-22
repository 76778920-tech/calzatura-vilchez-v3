#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_REPORT = "artifacts/ai-backtesting/evaluation_report.txt";
const DEFAULT_SUMMARY = "artifacts/ai-backtesting/summary.json";

function parseArgs(argv) {
  const args = {
    report: "",
    run: false,
    history: 180,
    folds: 6,
    python: process.env.PYTHON || "python",
    output: DEFAULT_SUMMARY,
    generatedReport: DEFAULT_REPORT,
    maxMapePct: Number(process.env.AI_BACKTEST_MAX_MAPE_PCT || 120),
    minWinsMapeRatio: Number(process.env.AI_BACKTEST_MIN_WINS_MAPE_RATIO || 0.5),
    minFolds: Number(process.env.AI_BACKTEST_MIN_FOLDS || 3),
    minDensityPct: Number(process.env.AI_BACKTEST_MIN_DENSITY_PCT || 0),
    minComparisonDensityPct: Number(process.env.AI_BACKTEST_MIN_COMPARISON_DENSITY_PCT || 0),
    warnOnly: false,
    allowMissingSecrets: false,
    envFile: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[i];
    };

    if (arg === "--report") args.report = next();
    else if (arg === "--run") args.run = true;
    else if (arg === "--history") args.history = Number(next());
    else if (arg === "--folds") args.folds = Number(next());
    else if (arg === "--python") args.python = next();
    else if (arg === "--output") args.output = next();
    else if (arg === "--generated-report") args.generatedReport = next();
    else if (arg === "--max-mape-pct") args.maxMapePct = Number(next());
    else if (arg === "--min-wins-mape-ratio") args.minWinsMapeRatio = Number(next());
    else if (arg === "--min-folds") args.minFolds = Number(next());
    else if (arg === "--min-density-pct") args.minDensityPct = Number(next());
    else if (arg === "--min-comparison-density-pct") args.minComparisonDensityPct = Number(next());
    else if (arg === "--env-file") args.envFile = next();
    else if (arg === "--warn-only") args.warnOnly = true;
    else if (arg === "--allow-missing-secrets") args.allowMissingSecrets = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.report && !args.run) {
    throw new Error("Use --report <file> or --run");
  }
  for (const [name, value] of Object.entries({
    history: args.history,
    folds: args.folds,
    maxMapePct: args.maxMapePct,
    minWinsMapeRatio: args.minWinsMapeRatio,
    minFolds: args.minFolds,
    minDensityPct: args.minDensityPct,
    minComparisonDensityPct: args.minComparisonDensityPct,
  })) {
    if (!Number.isFinite(value)) throw new Error(`${name} must be numeric`);
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/ai-backtest-gate.mjs --report <evaluate-report.txt> [thresholds]
  node scripts/ai-backtest-gate.mjs --run --allow-missing-secrets [thresholds]

Options:
  --run                         Execute ai-service/evaluate.py.
  --report <file>               Parse an existing evaluate.py text report.
  --history N                   History days for --run. Default: 180.
  --folds N                     Backtesting folds for --run. Default: 6.
  --max-mape-pct N              Required max average RF MAPE. Default: 120.
  --min-wins-mape-ratio N       Required RF MAPE win ratio. Default: 0.5.
  --min-folds N                 Minimum evaluated folds. Default: 3.
  --min-density-pct N           Minimum dataset density. Default: 0.
  --min-comparison-density-pct N Minimum density required to gate RF-vs-baseline wins. Default: 0.
  --warn-only                   Report failures but exit 0.
  --allow-missing-secrets       Skip --run when Supabase env vars are absent.
  --env-file <file>             Load simple KEY=VALUE env file before --run.
  --output <file>               Write JSON evidence. Default: ${DEFAULT_SUMMARY}.`);
}

function loadEnvFile(file) {
  if (!file) return;
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) throw new Error(`Env file not found: ${file}`);
  const content = fs.readFileSync(resolved, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function hasSupabaseSecrets() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

function runEvaluate(args) {
  const reportPath = path.resolve(args.generatedReport);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  const commandArgs = [
    "evaluate.py",
    "--history",
    String(args.history),
    "--folds",
    String(args.folds),
    "--output",
    reportPath,
  ];
  const result = spawnSync(args.python, commandArgs, {
    cwd: path.resolve("ai-service"),
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`evaluate.py failed with exit code ${result.status}`);
  }
  return reportPath;
}

function numberFrom(value) {
  if (value === undefined || value === null) return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseReport(content) {
  const metrics = {};

  const avg = content.match(/MAPE promedio RF=([\d.]+)%\s+vs\s+Baseline=([\d.]+)%/i);
  if (avg) {
    metrics.avgMapeRfPct = numberFrom(avg[1]);
    metrics.avgMapeBasePct = numberFrom(avg[2]);
  }

  const wins = content.match(/RF gana en MAPE\s*:\s*(\d+)\s*\/\s*(\d+)\s*folds/i);
  if (wins) {
    metrics.winsMape = numberFrom(wins[1]);
    metrics.nFolds = numberFrom(wins[2]);
    metrics.winsMapeRatio = metrics.nFolds > 0 ? metrics.winsMape / metrics.nFolds : null;
  }

  const density = content.match(/Densidad\s*:\s*([\d.]+)%/i);
  if (density) metrics.densityPct = numberFrom(density[1]);

  const products = content.match(/Productos\s*:\s*(\d+)\s*\|\s*Dias:\s*(\d+)\s*\|\s*Filas:\s*([\d,]+)/i);
  if (products) {
    metrics.nProducts = numberFrom(products[1]);
    metrics.nDays = numberFrom(products[2]);
    metrics.nRows = numberFrom(products[3]);
  }

  const improvement = content.match(/Mejora MAPE promedio:\s*([+-]?[\d.]+)pp/i);
  if (improvement) metrics.mapeImprovementPp = numberFrom(improvement[1]);

  return metrics;
}

function evaluateThresholds(metrics, args) {
  const failures = [];
  const warnings = [];

  if (metrics.avgMapeRfPct === undefined) {
    failures.push("avgMapeRfPct not found in report");
  } else if (metrics.avgMapeRfPct > args.maxMapePct) {
    failures.push(`avgMapeRfPct ${metrics.avgMapeRfPct} > max ${args.maxMapePct}`);
  }

  if (metrics.nFolds === undefined) {
    failures.push("nFolds not found in report");
  } else if (metrics.nFolds < args.minFolds) {
    failures.push(`nFolds ${metrics.nFolds} < min ${args.minFolds}`);
  }

  const densityForComparison = metrics.densityPct === undefined
    || metrics.densityPct >= args.minComparisonDensityPct;
  if (!densityForComparison) {
    warnings.push(
      `densityPct ${metrics.densityPct} < comparison min ${args.minComparisonDensityPct}; ` +
      "RF-vs-baseline win ratio is recorded but not used as a blocking gate",
    );
  } else if (metrics.winsMapeRatio === undefined || metrics.winsMapeRatio === null) {
    failures.push("winsMapeRatio not found in report");
  } else if (metrics.winsMapeRatio < args.minWinsMapeRatio) {
    failures.push(`winsMapeRatio ${metrics.winsMapeRatio.toFixed(3)} < min ${args.minWinsMapeRatio}`);
  }

  if (metrics.densityPct !== undefined && metrics.densityPct < args.minDensityPct) {
    failures.push(`densityPct ${metrics.densityPct} < min ${args.minDensityPct}`);
  }

  if (
    metrics.avgMapeRfPct !== undefined &&
    metrics.avgMapeBasePct !== undefined &&
    metrics.avgMapeRfPct > metrics.avgMapeBasePct
  ) {
    warnings.push(`RF MAPE ${metrics.avgMapeRfPct} is worse than baseline ${metrics.avgMapeBasePct}`);
  }

  return { failures, warnings };
}

function writeJson(file, data) {
  const resolved = path.resolve(file);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFile(args.envFile);

  if (args.run && !hasSupabaseSecrets()) {
    const summary = {
      status: "skipped",
      reason: "SUPABASE_URL and SUPABASE_SERVICE_KEY are required for evaluate.py",
      allowMissingSecrets: args.allowMissingSecrets,
      generatedAt: new Date().toISOString(),
    };
    writeJson(args.output, summary);
    console.log(`SKIP ${summary.reason}`);
    if (args.allowMissingSecrets || args.warnOnly) return;
    process.exit(1);
  }

  const reportPath = args.run ? runEvaluate(args) : path.resolve(args.report);
  const report = fs.readFileSync(reportPath, "utf8");
  const metrics = parseReport(report);
  const thresholdResult = evaluateThresholds(metrics, args);
  const passed = thresholdResult.failures.length === 0;
  const summary = {
    status: passed ? "passed" : "failed",
    warnOnly: args.warnOnly,
    reportPath,
    generatedAt: new Date().toISOString(),
    thresholds: {
      maxMapePct: args.maxMapePct,
      minWinsMapeRatio: args.minWinsMapeRatio,
      minFolds: args.minFolds,
      minDensityPct: args.minDensityPct,
      minComparisonDensityPct: args.minComparisonDensityPct,
    },
    metrics,
    failures: thresholdResult.failures,
    warnings: thresholdResult.warnings,
  };
  writeJson(args.output, summary);

  console.log(`AI backtest gate: ${summary.status}`);
  console.log(JSON.stringify({ metrics, failures: summary.failures, warnings: summary.warnings }, null, 2));
  if (!passed && !args.warnOnly) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(`ai-backtest-gate: ${error.message}`);
  process.exit(1);
}
