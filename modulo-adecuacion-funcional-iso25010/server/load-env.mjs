import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

function parseEnvLine(line) {
  const t = line.trim();
  if (!t || t.startsWith("#")) return null;
  const eq = t.indexOf("=");
  if (eq < 1) return null;
  const key = t.slice(0, eq).trim();
  let val = t.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return { key, val };
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    if (!process.env[parsed.key]) process.env[parsed.key] = parsed.val;
  }
}

/** Carga variables del monorepo (BFF / calzatura-vilchez) sin depender de dotenv. */
export function loadQcEnv() {
  const candidates = [
    path.join(REPO_ROOT, "calzatura-vilchez", "bff", ".env"),
    path.join(REPO_ROOT, "calzatura-vilchez", ".env.local"),
    path.join(REPO_ROOT, "calzatura-vilchez", ".env"),
    path.join(REPO_ROOT, ".env.local"),
    path.join(REPO_ROOT, ".env"),
  ];
  for (const file of candidates) loadEnvFile(file);
}

export function getSupabaseServiceKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ""
  ).trim();
}

export function getSupabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
}

export function hasSupabaseCreds() {
  return Boolean(getSupabaseUrl() && getSupabaseServiceKey());
}
