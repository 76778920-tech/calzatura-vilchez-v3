#!/usr/bin/env node
/** Elimina artefactos locales que no deben versionarse (carpeta n/, builds móvil). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function rmrf(target) {
  if (!fs.existsSync(target)) return false;
  fs.rmSync(target, { recursive: true, force: true });
  return true;
}

const targets = [
  path.join(repoRoot, "n"),
  path.join(repoRoot, "calzatura-vilchez-mobile", "android", "build"),
  path.join(repoRoot, "ai-service", "coverage.xml"),
  path.join(repoRoot, "ai-service", "coverage_raw.xml"),
  path.join(repoRoot, "ai-service", "coverage-sonar-generic.xml"),
];

let removed = 0;
for (const t of targets) {
  if (rmrf(t)) {
    console.log(`clean-local-residual: eliminado ${path.relative(repoRoot, t)}`);
    removed += 1;
  }
}

if (removed === 0) {
  console.log("clean-local-residual: nada que limpiar");
} else {
  console.log(`clean-local-residual: ${removed} ruta(s) eliminada(s)`);
}
