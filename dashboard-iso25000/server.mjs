#!/usr/bin/env node
/**
 * Servidor unificado ISO/IEC 25000 — puerto 4321
 *   /                        → Dashboard principal (6 características ISO 9126)
 *   /adecuacion-funcional/*  → Módulo CF/COF/TECP (React)
 *   /api/*                   → API del módulo de adecuación funcional
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleEvidenceApi } from "./evidence-api.mjs";
import { handleQcApi, seedIfEmpty } from "../modulo-adecuacion-funcional-iso25010/server/handler.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.ISO_PORT || process.argv[2] || 4321);
const HOST = process.env.ISO_BIND_HOST || "127.0.0.1";
const DASH_ROOT = __dirname;
const REPO_ROOT = path.resolve(__dirname, "..");
const QC_DIST = path.resolve(__dirname, "../modulo-adecuacion-funcional-iso25010/dist");
const QC_BASE = "/adecuacion-funcional";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function sendFile(res, filePath, status = 200) {
  const ext = path.extname(filePath);
  res.writeHead(status, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

function serveDashboard(urlPath, res) {
  let rel = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.join(DASH_ROOT, rel);
  if (!filePath.startsWith(DASH_ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return false;
  }
  sendFile(res, filePath);
  return true;
}

function serveEngineerReports(urlPath, res) {
  const reports = {
    "/stress": path.join(DASH_ROOT, "stress/index.html"),
    "/stress/": path.join(DASH_ROOT, "stress/index.html"),
    "/zap": path.join(REPO_ROOT, "zap-reports/zap-production-report-v5.html"),
    "/zap/": path.join(REPO_ROOT, "zap-reports/zap-production-report-v5.html"),
  };
  const filePath = reports[urlPath];
  if (!filePath || !fs.existsSync(filePath)) return false;
  sendFile(res, filePath);
  return true;
}

function serveQcApp(urlPath, res) {
  if (!urlPath.startsWith(QC_BASE)) return false;

  let rel = urlPath.slice(QC_BASE.length) || "/";
  if (rel.endsWith("/")) rel += "index.html";
  if (!path.extname(rel)) rel = "/index.html";

  const filePath = path.join(QC_DIST, rel);
  const indexPath = path.join(QC_DIST, "index.html");

  if (filePath.startsWith(QC_DIST) && fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    sendFile(res, filePath);
    return true;
  }

  if (fs.existsSync(indexPath)) {
    sendFile(res, indexPath);
    return true;
  }

  res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<h1>Módulo no compilado</h1><p>Ejecuta: <code>cd modulo-adecuacion-funcional-iso25010 && npm run build</code></p>`);
  return true;
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith("/api/")) {
    if (handleEvidenceApi(url, res)) return;
    try {
      await handleQcApi(req, res, url);
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (serveEngineerReports(url.pathname, res)) return;
  if (serveQcApp(url.pathname, res)) return;
  if (serveDashboard(url.pathname, res)) return;

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 — No encontrado: " + url.pathname);
});

try {
  await seedIfEmpty();
} catch (e) {
  console.error("QC seedIfEmpty:", e.message);
}
server.listen(PORT, HOST, () => {
  console.log(`Dashboard ISO/IEC 25000 — http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  console.log(`Informe stress k6 — http://localhost:${PORT}/stress/`);
  console.log(`Informe ZAP DAST — http://localhost:${PORT}/zap/`);
  console.log(`Adecuación Funcional (CF/COF/TECP) — http://localhost:${PORT}${QC_BASE}/`);
});
