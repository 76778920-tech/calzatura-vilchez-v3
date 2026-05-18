#!/usr/bin/env node
/**
 * Valida migraciones SQL versionadas antes de merge/deploy.
 * No requiere Supabase CLI ni proyecto enlazado.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(repoRoot, "calzatura-vilchez", "supabase", "migrations");
const namePattern = /^(\d{14})_[A-Za-z0-9_-]+\.sql$/;

function fail(message) {
  console.error(`validate-supabase-migrations: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(migrationsDir)) {
  fail(`no existe ${migrationsDir}`);
}

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

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
    fail(`timestamp duplicado ${ts} en ${file}`);
  }
  timestamps.add(ts);
  if (previous && ts < previous) {
    fail(`orden incorrecto: ${file} va antes que ${previous}`);
  }
  previous = ts;

  const content = fs.readFileSync(path.join(migrationsDir, file), "utf8").trim();
  if (!content) {
    fail(`archivo vacío: ${file}`);
  }
  if (!/;\s*$/m.test(content) && !content.includes("$$")) {
    console.warn(`validate-supabase-migrations: aviso — ${file} sin ';' final (puede ser intencional)`);
  }
}

console.log(`validate-supabase-migrations: OK — ${files.length} migraciones en orden cronológico`);
