#!/usr/bin/env node
/**
 * Servidor standalone (dev) — puerto 4322.
 * En producción local unificado usar dashboard-iso25000/server.mjs (4321).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleQcApi, seedIfEmpty } from "./handler.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.QC_PORT || 4322);
const DIST = path.join(__dirname, "..", "dist");

function serveStatic(req, res) {
  let urlPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const filePath = path.join(DIST, urlPath);
  if (!filePath.startsWith(DIST) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return false;
  }
  const ext = path.extname(filePath);
  const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
  res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
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
    try {
      await handleQcApi(req, res, url);
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (serveStatic(req, res)) return;
  res.writeHead(404);
  res.end("Not found");
});

seedIfEmpty().catch((e) => {
  console.error("QC seedIfEmpty:", e.message);
});
server.listen(PORT, () => {
  console.log(`QC Adecuación Funcional (standalone) — http://localhost:${PORT}`);
});
