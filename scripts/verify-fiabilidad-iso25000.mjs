#!/usr/bin/env node
/**
 * Gate maestro Fiabilidad (ISO 25010) — ejecuta sub-gates en secuencia.
 * Uso: node scripts/verify-fiabilidad-iso25000.mjs [--full]
 *
 * --full  Incluye --check-ci, --run-drill-check, --run-evidence-check y --run-tests
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const full = process.argv.includes("--full");

const GATES = [
  ["Madurez", ["node", "scripts/verify-madurez-iso25000.mjs", ...(full ? ["--check-ci", "--check-audit"] : [])]],
  [
    "Tolerancia a fallos",
    ["node", "scripts/verify-tolerancia-fallos-iso25000.mjs", ...(full ? ["--run-tests", "--run-e2e"] : [])],
  ],
  ["Capacidad de recuperación", ["node", "scripts/verify-recuperacion-iso25000.mjs", ...(full ? ["--run-drill-check"] : [])]],
  [
    "Cumplimiento de fiabilidad",
    ["node", "scripts/verify-cumplimiento-fiabilidad-iso25000.mjs", ...(full ? ["--run-evidence-check"] : [])],
  ],
];

function main() {
  console.log(`=== Gate maestro Fiabilidad ISO 25010${full ? " (modo full)" : ""} ===\n`);
  let allOk = true;

  for (const [name, cmd] of GATES) {
    console.log(`\n>>> ${name}`);
    const r = spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" });
    if (r.status !== 0) {
      allOk = false;
      console.error(`\n*** FALLÓ: ${name} ***\n`);
    }
  }

  console.log(allOk ? "\n=== VERDE: Fiabilidad completa ===" : "\n=== ROJO: Fiabilidad — revisar sub-gates ===");
  process.exit(allOk ? 0 : 1);
}

main();
