#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    evidence: "",
    output: "artifacts/restore-drill/summary.json",
    maxRtoMinutes: Number(process.env.RESTORE_DRILL_MAX_RTO_MINUTES || 60),
    maxRpoMinutes: Number(process.env.RESTORE_DRILL_MAX_RPO_MINUTES || 1440),
    warnOnly: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[i];
    };

    if (arg === "--evidence") args.evidence = next();
    else if (arg === "--output") args.output = next();
    else if (arg === "--max-rto-minutes") args.maxRtoMinutes = Number(next());
    else if (arg === "--max-rpo-minutes") args.maxRpoMinutes = Number(next());
    else if (arg === "--warn-only") args.warnOnly = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.evidence) throw new Error("--evidence is required");
  if (!Number.isFinite(args.maxRtoMinutes) || args.maxRtoMinutes <= 0) {
    throw new Error("--max-rto-minutes must be positive");
  }
  if (!Number.isFinite(args.maxRpoMinutes) || args.maxRpoMinutes <= 0) {
    throw new Error("--max-rpo-minutes must be positive");
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/restore-drill-check.mjs --evidence <file.json> [options]

Options:
  --max-rto-minutes N   Maximum accepted restore time. Default: 60.
  --max-rpo-minutes N   Maximum accepted data loss window. Default: 1440.
  --output <file>       Write JSON validation summary.
  --warn-only           Report failures but exit 0.`);
}

function readEvidence(file) {
  const resolved = path.resolve(file);
  const content = fs.readFileSync(resolved, "utf8");
  return { resolved, evidence: JSON.parse(content) };
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value);
}

function validate(evidence, args) {
  const failures = [];
  const required = [
    "drillId",
    "date",
    "owner",
    "environment",
    "backupSource",
    "restoreTarget",
    "startedAt",
    "completedAt",
    "rtoMinutes",
    "rpoMinutes",
    "result",
    "rollbackPlan",
  ];

  for (const field of required) {
    if (evidence[field] === undefined || evidence[field] === "") {
      failures.push(`Missing required field: ${field}`);
    }
  }

  if (!isIsoDate(evidence.date)) failures.push("date must be ISO-like YYYY-MM-DD");
  if (!isIsoDate(evidence.startedAt)) failures.push("startedAt must be ISO-like");
  if (!isIsoDate(evidence.completedAt)) failures.push("completedAt must be ISO-like");

  if (Number(evidence.rtoMinutes) > args.maxRtoMinutes) {
    failures.push(`rtoMinutes ${evidence.rtoMinutes} > max ${args.maxRtoMinutes}`);
  }
  if (Number(evidence.rpoMinutes) > args.maxRpoMinutes) {
    failures.push(`rpoMinutes ${evidence.rpoMinutes} > max ${args.maxRpoMinutes}`);
  }
  if (!["pass", "passed"].includes(String(evidence.result || "").toLowerCase())) {
    failures.push(`result must be pass/passed, got: ${evidence.result}`);
  }

  if (!Array.isArray(evidence.verificationChecks) || evidence.verificationChecks.length === 0) {
    failures.push("verificationChecks must contain at least one check");
  } else {
    for (const [index, check] of evidence.verificationChecks.entries()) {
      if (!check.name) failures.push(`verificationChecks[${index}].name is required`);
      if (!["pass", "passed"].includes(String(check.status || "").toLowerCase())) {
        failures.push(`verificationChecks[${index}].status must be pass/passed`);
      }
      if (!check.evidence) failures.push(`verificationChecks[${index}].evidence is required`);
    }
  }

  return failures;
}

function writeJson(file, data) {
  const resolved = path.resolve(file);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { resolved, evidence } = readEvidence(args.evidence);
  const failures = validate(evidence, args);
  const passed = failures.length === 0;
  const summary = {
    status: passed ? "passed" : "failed",
    warnOnly: args.warnOnly,
    evidencePath: resolved,
    checkedAt: new Date().toISOString(),
    thresholds: {
      maxRtoMinutes: args.maxRtoMinutes,
      maxRpoMinutes: args.maxRpoMinutes,
    },
    observed: {
      rtoMinutes: evidence.rtoMinutes,
      rpoMinutes: evidence.rpoMinutes,
      verificationChecks: Array.isArray(evidence.verificationChecks)
        ? evidence.verificationChecks.length
        : 0,
    },
    failures,
  };
  writeJson(args.output, summary);

  console.log(`Restore drill check: ${summary.status}`);
  if (failures.length > 0) {
    for (const failure of failures) console.log(`FAIL ${failure}`);
  }
  if (!passed && !args.warnOnly) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(`restore-drill-check: ${error.message}`);
  process.exit(1);
}
