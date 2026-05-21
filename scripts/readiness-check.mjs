#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 1;

function parseArgs(argv) {
  const args = {
    config: "",
    output: "",
    timeoutMs: DEFAULT_TIMEOUT_MS,
    retries: DEFAULT_RETRIES,
    warnOnly: false,
    planOnly: false,
    targets: [],
    requiredEnv: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[i];
    };

    if (arg === "--config") args.config = next();
    else if (arg === "--output") args.output = next();
    else if (arg === "--timeout-ms") args.timeoutMs = Number(next());
    else if (arg === "--retries") args.retries = Number(next());
    else if (arg === "--target") args.targets.push(parseTarget(next()));
    else if (arg === "--require-env") args.requiredEnv.push(next());
    else if (arg === "--warn-only") args.warnOnly = true;
    else if (arg === "--plan-only") args.planOnly = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) {
    throw new Error("--timeout-ms must be a positive number");
  }
  if (!Number.isInteger(args.retries) || args.retries < 0) {
    throw new Error("--retries must be a non-negative integer");
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/readiness-check.mjs [options]

Options:
  --config <file>       JSON config with targets and requiredEnv.
  --target name=url     Add an HTTP target from CLI.
  --require-env NAME    Require an environment variable to be present.
  --timeout-ms N        Per-attempt timeout. Default: ${DEFAULT_TIMEOUT_MS}.
  --retries N           Retry count after first attempt. Default: ${DEFAULT_RETRIES}.
  --output <file>       Write JSON evidence.
  --warn-only           Exit 0 even when a required check fails.
  --plan-only           Validate configuration without network calls.

Environment fallback:
  READINESS_TARGETS may contain a JSON array of target objects.
  BFF_BASE_URL/VITE_BACKEND_API_URL and AI_SERVICE_URL/VITE_AI_SERVICE_URL
  are used when no config or CLI target is provided.`);
}

function parseTarget(raw) {
  const eq = raw.indexOf("=");
  if (eq <= 0) throw new Error(`Invalid --target value: ${raw}. Use name=url`);
  return { name: raw.slice(0, eq), url: raw.slice(eq + 1) };
}

function readJson(file) {
  const resolved = path.resolve(file);
  return JSON.parse(fs.readFileSync(resolved, "utf8"));
}

function normalizeUrl(base, suffix) {
  const trimmed = String(base || "").trim();
  if (!trimmed) return "";
  if (/\/health$|\/api\/health$/.test(trimmed)) return trimmed;
  return `${trimmed.replace(/\/+$/, "")}${suffix}`;
}

function defaultTargets() {
  const bff = normalizeUrl(
    process.env.BFF_BASE_URL || process.env.BFF_URL || process.env.VITE_BACKEND_API_URL || "http://127.0.0.1:8787",
    "/health",
  );
  const ai = normalizeUrl(
    process.env.AI_SERVICE_URL || process.env.VITE_AI_SERVICE_URL || "http://127.0.0.1:8000",
    "/api/health",
  );
  return [
    { name: "bff", url: bff, expectedStatus: [200], maxMs: 2000 },
    { name: "ai-service", url: ai, expectedStatus: [200], maxMs: 3000 },
  ];
}

function targetsFromEnv() {
  if (!process.env.READINESS_TARGETS) return [];
  const parsed = JSON.parse(process.env.READINESS_TARGETS);
  if (!Array.isArray(parsed)) throw new Error("READINESS_TARGETS must be a JSON array");
  return parsed;
}

function mergeConfig(args) {
  const config = args.config ? readJson(args.config) : {};
  const envTargets = targetsFromEnv();
  const targets = [
    ...(config.targets || []),
    ...envTargets,
    ...args.targets,
  ];
  return {
    requiredEnv: [...(config.requiredEnv || []), ...args.requiredEnv],
    targets: targets.length > 0 ? targets : defaultTargets(),
  };
}

function validateConfig(config) {
  const errors = [];
  if (!Array.isArray(config.targets) || config.targets.length === 0) {
    errors.push("At least one target is required");
  }
  for (const [idx, target] of (config.targets || []).entries()) {
    if (!target.name) errors.push(`targets[${idx}].name is required`);
    if (!target.url) errors.push(`targets[${idx}].url is required`);
    try {
      const url = new URL(target.url);
      if (!["http:", "https:"].includes(url.protocol)) {
        errors.push(`targets[${idx}].url must be http or https`);
      }
    } catch {
      errors.push(`targets[${idx}].url is not a valid URL`);
    }
  }
  return errors;
}

function missingEnv(requiredEnv) {
  return requiredEnv
    .filter((name) => !process.env[name])
    .map((name) => ({ name, ok: false, status: "missing" }));
}

function expectedStatuses(target) {
  if (Array.isArray(target.expectedStatus)) return target.expectedStatus.map(Number);
  if (target.expectedStatus !== undefined) return [Number(target.expectedStatus)];
  return [200];
}

async function fetchWithTimeout(target, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(target.url, {
      method: target.method || "GET",
      headers: target.headers || {},
      signal: controller.signal,
    });
    const body = await response.text();
    return {
      ok: true,
      statusCode: response.status,
      ms: Date.now() - startedAt,
      bodySample: body.slice(0, 200),
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: error.name === "AbortError" ? "TIMEOUT" : "ERROR",
      ms: Date.now() - startedAt,
      error: error.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkTarget(target, globalOptions) {
  const timeoutMs = Number(target.timeoutMs || globalOptions.timeoutMs);
  const retries = Number(target.retries ?? globalOptions.retries);
  const statuses = expectedStatuses(target);
  let last = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    last = await fetchWithTimeout(target, timeoutMs);
    const statusOk = statuses.includes(Number(last.statusCode));
    const textOk = !target.expectText || String(last.bodySample || "").includes(target.expectText);
    const latencyOk = !target.maxMs || last.ms <= Number(target.maxMs);
    const ok = last.ok && statusOk && textOk && latencyOk;
    if (ok) {
      return {
        name: target.name,
        url: target.url,
        ok: true,
        optional: Boolean(target.optional),
        statusCode: last.statusCode,
        ms: last.ms,
        attempt: attempt + 1,
      };
    }
    last.failure = {
      statusOk,
      textOk,
      latencyOk,
      expectedStatus: statuses,
      maxMs: target.maxMs || null,
    };
  }

  return {
    name: target.name,
    url: target.url,
    ok: Boolean(target.optional),
    optional: Boolean(target.optional),
    statusCode: last.statusCode,
    ms: last.ms,
    error: last.error || "Readiness assertion failed",
    failure: last.failure,
  };
}

function ensureOutput(file, data) {
  if (!file) return;
  const resolved = path.resolve(file);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = mergeConfig(args);
  const configErrors = validateConfig(config);
  const envFailures = missingEnv(config.requiredEnv);

  if (configErrors.length > 0) {
    throw new Error(configErrors.join("; "));
  }

  const startedAt = new Date().toISOString();
  const targetResults = args.planOnly
    ? config.targets.map((target) => ({
      name: target.name,
      url: target.url,
      ok: true,
      status: "planned",
      optional: Boolean(target.optional),
    }))
    : await Promise.all(config.targets.map((target) => checkTarget(target, args)));

  const requiredEnvResults = config.requiredEnv.map((name) => ({
    name,
    ok: Boolean(process.env[name]),
    status: process.env[name] ? "present" : "missing",
  }));

  const hardFailures = [
    ...targetResults.filter((result) => !result.ok && !result.optional),
    ...envFailures,
  ];
  const ok = hardFailures.length === 0;
  const summary = {
    status: ok ? "ok" : "failed",
    warnOnly: args.warnOnly,
    planOnly: args.planOnly,
    startedAt,
    finishedAt: new Date().toISOString(),
    targets: targetResults,
    requiredEnv: requiredEnvResults,
  };

  ensureOutput(args.output, summary);

  for (const result of targetResults) {
    const badge = result.ok ? "OK" : "FAIL";
    const latency = result.ms === undefined ? "" : ` ${result.ms}ms`;
    console.log(`${badge} ${result.name} ${result.statusCode || result.status || ""}${latency}`);
    if (result.error) console.log(`  ${result.error}`);
  }
  for (const result of requiredEnvResults) {
    console.log(`${result.ok ? "OK" : "FAIL"} env:${result.name} ${result.status}`);
  }

  if (!ok && !args.warnOnly) process.exit(1);
}

main().catch((error) => {
  console.error(`readiness-check: ${error.message}`);
  process.exit(1);
});
