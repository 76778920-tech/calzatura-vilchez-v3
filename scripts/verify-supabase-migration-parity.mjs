#!/usr/bin/env node
/**
 * Compara migraciones locales con el historial remoto (Supabase CLI).
 * Sale 0 con mensaje si falta SUPABASE_URL o SUPABASE_ACCESS_TOKEN (skip en CI sin secretos).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(repoRoot, "calzatura-vilchez");
const migrationsDir = path.join(appDir, "supabase", "migrations");

function log(msg) {
  console.log(`verify-supabase-migration-parity: ${msg}`);
}

function fail(msg) {
  console.error(`verify-supabase-migration-parity: ${msg}`);
  process.exit(1);
}

function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname;
    const ref = host.split(".")[0];
    return ref && ref !== "localhost" ? ref : "";
  } catch {
    return "";
  }
}

function localMigrationVersions() {
  if (!fs.existsSync(migrationsDir)) fail(`no existe ${migrationsDir}`);
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => f.slice(0, 14))
    .sort();
}

function parseMigrationList(stdout) {
  const localOnly = [];
  const remoteOnly = [];
  const mismatched = [];

  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("─") || trimmed.startsWith("LOCAL")) continue;
    const parts = trimmed.split("│").map((p) => p.trim());
    if (parts.length < 2) continue;
    const local = parts[0].replace(/\s/g, "");
    const remote = parts[1].replace(/\s/g, "");
    if (!/^\d{14}$/.test(local) && !/^\d{14}$/.test(remote)) continue;
    if (local && !remote) localOnly.push(local);
    if (remote && !local) remoteOnly.push(remote);
    if (local && remote && local !== remote) mismatched.push({ local, remote });
  }

  return { localOnly, remoteOnly, mismatched };
}

const supabaseUrl = process.env.SUPABASE_URL?.trim() || "";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim() || "";

if (!supabaseUrl) {
  log("SUPABASE_URL no configurada — omitiendo paridad remota.");
  process.exit(0);
}

if (!accessToken) {
  log("SUPABASE_ACCESS_TOKEN no configurado — omitiendo paridad remota (configura token para comparar con migration list).");
  process.exit(0);
}

const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || projectRefFromUrl(supabaseUrl);
if (!projectRef) {
  fail("no se pudo derivar project ref desde SUPABASE_URL");
}

const localVersions = localMigrationVersions();
if (localVersions.length === 0) {
  fail("no hay migraciones locales");
}

process.chdir(appDir);
const env = {
  ...process.env,
  SUPABASE_ACCESS_TOKEN: accessToken,
};

try {
  execFileSync("npx", ["supabase", "link", "--project-ref", projectRef, "--yes"], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
} catch (err) {
  const stderr = err.stderr?.toString?.() || String(err);
  fail(`supabase link falló: ${stderr}`);
}

let listOutput = "";
try {
  listOutput = execFileSync("npx", ["supabase", "migration", "list"], {
    env,
    encoding: "utf8",
  });
} catch (err) {
  const stderr = err.stderr?.toString?.() || String(err);
  fail(`supabase migration list falló: ${stderr}`);
}

const { localOnly, remoteOnly, mismatched } = parseMigrationList(listOutput);

if (localOnly.length > 0) {
  fail(`migraciones locales sin aplicar en remoto: ${localOnly.join(", ")}`);
}
if (remoteOnly.length > 0) {
  fail(`migraciones remotas ausentes en el repo: ${remoteOnly.join(", ")}`);
}
if (mismatched.length > 0) {
  fail(`versiones desalineadas: ${mismatched.map((m) => `${m.local}≠${m.remote}`).join(", ")}`);
}

const remoteApplied = new Set(
  listOutput
    .split(/\r?\n/)
    .flatMap((line) => {
      const parts = line.split("│").map((p) => p.trim());
      const remote = parts[1]?.replace(/\s/g, "") || "";
      return /^\d{14}$/.test(remote) ? [remote] : [];
    })
);

const missingOnRemote = localVersions.filter((v) => !remoteApplied.has(v));
if (missingOnRemote.length > 0) {
  fail(`archivos locales no reflejados en migration list remoto: ${missingOnRemote.join(", ")}`);
}

log(`paridad OK — ${localVersions.length} migraciones locales alineadas con remoto (${projectRef}).`);
