#!/usr/bin/env node
/**
 * Ejecuta sonar-scanner con reintentos solo ante errores transitorios (503/502/429).
 * No reintenta si falla el Quality Gate (exit 3).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_ATTEMPTS = 6;
const WAIT_SECONDS = [45, 90, 120, 180, 240, 300];

const SCANNER = path.join(ROOT, "node_modules", "sonarqube-scanner", "bin", "sonar-scanner.js");

function sleep(seconds) {
  spawnSync("sleep", [String(seconds)], { stdio: "inherit" });
}

function isQualityGateFailure(exitCode, output) {
  return exitCode === 3 || /QUALITY GATE STATUS:\s*FAILED/i.test(output);
}

function isTransientFailure(output) {
  return /503|502|429|Service Unavailable|temporarily unavailable|ECONNRESET|ETIMEDOUT|socket hang up|upload report/i.test(
    output,
  );
}

function runScan(attempt) {
  console.log(`\n=== SonarQube scan — intento ${attempt}/${MAX_ATTEMPTS} ===\n`);
  const r = spawnSync(process.execPath, [SCANNER], {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8",
  });
  const output = `${r.stdout || ""}${r.stderr || ""}`;
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return { exitCode: r.status ?? 1, output };
}

function main() {
  if (!process.env.SONAR_TOKEN) {
    console.error("SONAR_TOKEN no configurado");
    process.exit(1);
  }

  let lastExit = 1;
  let lastOutput = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { exitCode, output } = runScan(attempt);
    lastExit = exitCode;
    lastOutput = output;

    if (exitCode === 0) {
      console.log(`SonarQube OK (intento ${attempt})`);
      process.exit(0);
    }

    if (isQualityGateFailure(exitCode, output)) {
      console.error("Quality Gate FAILED — no se reintenta (corrige hallazgos en SonarCloud).");
      process.exit(exitCode);
    }

    if (!isTransientFailure(output) || attempt === MAX_ATTEMPTS) {
      break;
    }

    const wait = WAIT_SECONDS[attempt - 1] ?? 120;
    console.warn(`Error transitorio SonarCloud (intento ${attempt}). Esperando ${wait}s…`);
    sleep(wait);
  }

  console.error(
    `SonarQube falló tras ${MAX_ATTEMPTS} intentos (p. ej. HTTP 503). ` +
      "Reejecuta el workflow o comprueba https://status.sonarcloud.io",
  );
  if (lastOutput && !isTransientFailure(lastOutput)) {
    console.error("Última salida no parece 503 — revisa credenciales o configuración del proyecto.");
  }
  process.exit(lastExit || 1);
}

main();
