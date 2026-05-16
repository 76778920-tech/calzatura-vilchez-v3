#!/usr/bin/env node
/**
 * Vitest escribe SF:src/... en coverage/lcov.info (cwd = calzatura-vilchez).
 * SonarScanner en la raíz del monorepo resuelve fuentes como calzatura-vilchez/src/...
 * Sin este ajuste, SonarCloud no enlaza el LCOV y muestra cobertura ~0% en TS aunque los tests pasen.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lcovPath = path.join(__dirname, "..", "coverage", "lcov.info");

if (!fs.existsSync(lcovPath)) {
  console.error("fix-lcov-for-sonar: no existe", lcovPath);
  process.exit(1);
}

const lines = fs.readFileSync(lcovPath, "utf8").split(/\r?\n/);
const out = [];
for (const line of lines) {
  if (line.startsWith("SF:")) {
    const rel = line.slice(3).replace(/\\/g, "/").trim();
    if (rel.startsWith("calzatura-vilchez/")) {
      out.push(`SF:${rel}`);
    } else if (rel.startsWith("src/")) {
      out.push(`SF:calzatura-vilchez/${rel}`);
    } else {
      out.push(line);
    }
  } else {
    out.push(line);
  }
}

fs.writeFileSync(lcovPath, out.join("\n"), "utf8");
console.log("fix-lcov-for-sonar: rutas SF: actualizadas en", lcovPath);
