#!/usr/bin/env node
/**
 * Comprueba patrones que SonarQube suele marcar antes de push/CI.
 * Uso: node scripts/sonar-preflight.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC_ROOT = join(PKG_ROOT, "src");
const E2E_ROOT = join(PKG_ROOT, "e2e");

const RULES = [
  {
    id: "no-role-status",
    glob: "src",
    pattern: /role=["']status["']/g,
    message: 'Usar <output> o LoadingStatusRegion en lugar de role="status".',
  },
  {
    id: "no-role-dialog",
    glob: "src",
    pattern: /role=["']dialog["']/g,
    message: 'Usar elemento <dialog> nativo en lugar de role="dialog".',
  },
  {
    id: "no-role-list",
    glob: "src",
    pattern: /role=["']list(item)?["']/g,
    message: "Usar <ul>/<ol> y <li> en lugar de role list/listitem.",
  },
  {
    id: "no-document-write",
    glob: "src",
    pattern: /\.document\.write\s*\(/g,
    message: "document.write está obsoleto; usar Blob/innerHTML.",
  },
  {
    id: "no-e2e-skip",
    glob: "e2e",
    pattern: /\btest\.skip\s*\(/g,
    message: "No usar test.skip; limpiar estado en beforeEach.",
  },
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "__tests__") continue;
      walk(path, files);
    } else if (/\.(tsx?|jsx?)$/.test(name)) {
      files.push(path);
    }
  }
  return files;
}

function scanRoot(root, rule) {
  const hits = [];
  for (const file of walk(root)) {
    const text = readFileSync(file, "utf8");
    if (!rule.pattern.test(text)) continue;
    rule.pattern.lastIndex = 0;
    const rel = relative(process.cwd(), file).replace(/\\/g, "/");
    const lines = text.split("\n");
    lines.forEach((line, index) => {
      if (rule.pattern.test(line)) {
        hits.push({ file: rel, line: index + 1, snippet: line.trim() });
      }
      rule.pattern.lastIndex = 0;
    });
  }
  return hits;
}

let failed = false;

for (const rule of RULES) {
  const root = rule.glob === "e2e" ? E2E_ROOT : SRC_ROOT;
  const hits = scanRoot(root, rule);
  const filtered =
    rule.id === "no-role-status"
      ? hits.filter((h) => !h.file.includes("LoadingStatusRegion.tsx"))
      : hits;

  if (filtered.length === 0) continue;

  failed = true;
  console.error(`\n[sonar-preflight] ${rule.id}: ${rule.message}`);
  for (const hit of filtered) {
    console.error(`  ${hit.file}:${hit.line}  ${hit.snippet}`);
  }
}

if (failed) {
  console.error("\n[sonar-preflight] FALLÓ — corrige los hallazgos antes de push.");
  process.exit(1);
}

console.log("[sonar-preflight] OK — sin patrones prohibidos en src/ y e2e/.");
