#!/usr/bin/env node
/**
 * Valida migraciones SQL versionadas (CI, sin Supabase remoto).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(repoRoot, "calzatura-vilchez", "supabase", "migrations");
const namePattern = /^(\d{14})_[A-Za-z0-9_-]+\.sql$/;
const forbidden = [
  /\bDROP\s+DATABASE\b/i,
  /\bDROP\s+SCHEMA\s+public\b/i,
];

function fail(message) {
  console.error(`validate-supabase-migrations: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(migrationsDir)) {
  fail(`no existe ${migrationsDir}`);
}

const allEntries = fs.readdirSync(migrationsDir);
const nonSql = allEntries.filter((f) => !f.endsWith(".sql") && !f.startsWith("."));
if (nonSql.length > 0) {
  fail(`archivos no-SQL en migrations/: ${nonSql.join(", ")}`);
}

const files = allEntries.filter((f) => f.endsWith(".sql")).sort();

if (files.length === 0) {
  fail("no hay archivos .sql en supabase/migrations");
}

const timestamps = new Set();
let previous = "";

for (const file of files) {
  const match = file.match(namePattern);
  if (!match) {
    fail(`nombre inválido (usa YYYYMMDDHHMMSS_descripcion.sql): ${file}`);
  }
  const ts = match[1];
  if (timestamps.has(ts)) {
    fail(`timestamp duplicado ${ts} (Supabase solo permite una versión por prefijo)`);
  }
  timestamps.add(ts);
  if (previous && ts < previous) {
    fail(`orden incorrecto: ${file} va antes que ${previous}`);
  }
  previous = ts;

  const fullPath = path.join(migrationsDir, file);
  const content = fs.readFileSync(fullPath, "utf8").trim();
  if (!content) {
    fail(`archivo vacío: ${file}`);
  }
  for (const pattern of forbidden) {
    if (pattern.test(content)) {
      fail(`${file} contiene SQL prohibido en migraciones versionadas`);
    }
  }
}

console.log(
  `validate-supabase-migrations: OK — ${files.length} migraciones, orden cronológico, sin duplicados`,
);
