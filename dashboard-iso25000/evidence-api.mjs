/**
 * API de evidencias — sirve archivos del repo (allowlist) para el dashboard ISO 25000.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..");
export const MANIFEST_PATH = path.join(__dirname, "evidence-manifest.json");

const ALLOWED_PREFIXES = [
  "documentacion/",
  "dashboard-iso25000/",
  "calzatura-vilchez/",
  "scripts/",
  "modulo-adecuacion-funcional-iso25010/",
  "docs/ops/",
  "artifacts/load-tests/",
  "load-tests/",
  ".github/workflows/",
  "iso25000_ref.png",
];

const ALLOWED_EXT = new Set([
  ".md", ".ts", ".tsx", ".js", ".mjs", ".cjs", ".py", ".sql", ".json", ".csv",
  ".yaml", ".yml", ".html", ".css", ".txt", ".png", ".spec.ts",
]);

const MAX_BYTES = 512 * 1024;
const MAX_LINES = 400;

function normalizeRel(input) {
  return String(input || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

export function isAllowedEvidencePath(relPath) {
  const rel = normalizeRel(relPath);
  if (!rel || rel.includes("..")) return false;
  if (rel === "iso25000_ref.png") return true;
  const ext = path.extname(rel).toLowerCase();
  if (!ALLOWED_EXT.has(ext) && !rel.endsWith(".spec.ts")) return false;
  return ALLOWED_PREFIXES.some((p) => rel.startsWith(p) || rel === p.replace(/\/$/, ""));
}

export function resolveEvidencePath(relPath) {
  const rel = normalizeRel(relPath);
  if (!isAllowedEvidencePath(rel)) return null;
  const abs = path.resolve(REPO_ROOT, rel);
  if (!abs.startsWith(REPO_ROOT)) return null;
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) return null;
  return abs;
}

function detectLanguage(rel) {
  if (rel.endsWith(".md")) return "markdown";
  if (rel.endsWith(".ts") || rel.endsWith(".tsx") || rel.endsWith(".spec.ts")) return "typescript";
  if (rel.endsWith(".py")) return "python";
  if (rel.endsWith(".sql")) return "sql";
  if (rel.endsWith(".json")) return "json";
  if (rel.endsWith(".csv")) return "csv";
  if (rel.endsWith(".css")) return "css";
  if (rel.endsWith(".html")) return "html";
  if (rel.endsWith(".yml") || rel.endsWith(".yaml")) return "yaml";
  return "javascript";
}

export function readEvidenceSlice(relPath, startLine = 1, endLine = 120) {
  const abs = resolveEvidencePath(relPath);
  if (!abs) return { error: "Ruta no permitida o inexistente", status: 403 };

  const stat = fs.statSync(abs);
  if (stat.size > MAX_BYTES) {
    return { error: "Archivo demasiado grande; use rango de líneas", status: 413 };
  }

  const raw = fs.readFileSync(abs, "utf8");
  const lines = raw.split(/\r?\n/);
  const totalLines = lines.length;
  const start = Math.max(1, Number(startLine) || 1);
  let end = Math.min(totalLines, Number(endLine) || start + MAX_LINES - 1);
  if (end - start + 1 > MAX_LINES) end = start + MAX_LINES - 1;

  const slice = lines.slice(start - 1, end);
  const rel = normalizeRel(relPath);

  return {
    path: rel,
    language: detectLanguage(rel),
    startLine: start,
    endLine: end,
    totalLines,
    truncated: end < totalLines,
    content: slice.join("\n"),
  };
}

export function handleEvidenceApi(url, res) {
  if (url.pathname === "/api/evidence/manifest") {
    if (!fs.existsSync(MANIFEST_PATH)) {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Ejecuta: node scripts/generate-evidence-manifest.mjs" }));
      return true;
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    fs.createReadStream(MANIFEST_PATH).pipe(res);
    return true;
  }

  if (url.pathname === "/api/evidence/file") {
    const rel = url.searchParams.get("path") || "";
    const start = url.searchParams.get("start") || "1";
    const end = url.searchParams.get("end") || "120";
    const result = readEvidenceSlice(rel, start, end);
    if (result.error) {
      res.writeHead(result.status || 400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(result));
      return true;
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(result));
    return true;
  }

  if (url.pathname === "/api/evidence/image") {
    const rel = url.searchParams.get("path") || "";
    const abs = resolveEvidencePath(rel);
    if (!abs || !rel.endsWith(".png")) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Imagen no encontrada");
      return true;
    }
    res.writeHead(200, { "Content-Type": "image/png" });
    fs.createReadStream(abs).pipe(res);
    return true;
  }

  return false;
}
