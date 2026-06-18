/**
 * Handlers REST compartidos — usable desde servidor standalone (4322) o unificado (4321).
 */
import {
  loadDb,
  saveDb,
  getEvaluacion,
  getChildren,
  upsertEvaluacion,
  upsertFuncion,
  upsertTransaccion,
  upsertCasoPrueba,
  deleteById,
  deleteEvaluacionCascade,
} from "./db.mjs";
import { calcAllMetrics } from "./metrics.mjs";
import { buildEvaluationPdf } from "./pdfReport.mjs";
import { buildSeedDb } from "./seed.mjs";

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      if (!chunks.length) return resolve(null);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function sendPdf(res, buffer, filename) {
  res.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": buffer.length,
  });
  res.end(buffer);
}

export function seedIfEmpty() {
  const db = loadDb();
  if (db.evaluaciones.length === 0) {
    const seed = buildSeedDb();
    saveDb(seed);
    console.log("Base de datos QC inicializada con datos Calzatura Vilchez.");
  }
}

export async function handleQcApi(req, res, url) {
  const db = loadDb();

  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, module: "adecuacion-funcional-iso25010" });
  }

  if (req.method === "POST" && url.pathname === "/api/seed") {
    saveDb(buildSeedDb());
    return sendJson(res, 200, { ok: true, message: "Datos de ejemplo cargados" });
  }

  if (req.method === "GET" && url.pathname === "/api/evaluaciones") {
    const list = db.evaluaciones.map((e) => {
      const children = getChildren(db, e.id);
      const metrics = calcAllMetrics(e, children.funciones, children.transacciones, children.casos_prueba);
      return { ...e, metricas: metrics };
    });
    return sendJson(res, 200, list);
  }

  if (req.method === "POST" && url.pathname === "/api/evaluaciones") {
    try {
      const body = await readBody(req);
      const row = upsertEvaluacion(db, body);
      saveDb(db);
      return sendJson(res, 201, row);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  const evalMatch = url.pathname.match(/^\/api\/evaluaciones\/([^/]+)$/);
  if (evalMatch) {
    const id = decodeURIComponent(evalMatch[1]);
    if (req.method === "GET") {
      const ev = getEvaluacion(db, id);
      if (!ev) return sendJson(res, 404, { error: "Evaluación no encontrada" });
      const children = getChildren(db, id);
      const metrics = calcAllMetrics(ev, children.funciones, children.transacciones, children.casos_prueba);
      return sendJson(res, 200, { ...ev, ...children, metricas: metrics });
    }
    if (req.method === "PUT") {
      const body = await readBody(req);
      const row = upsertEvaluacion(db, { ...body, id });
      if (!row) return sendJson(res, 404, { error: "Evaluación no encontrada" });
      saveDb(db);
      return sendJson(res, 200, row);
    }
    if (req.method === "DELETE") {
      if (!deleteEvaluacionCascade(db, id)) return sendJson(res, 404, { error: "Evaluación no encontrada" });
      saveDb(db);
      return sendJson(res, 200, { ok: true });
    }
  }

  const pdfMatch = url.pathname.match(/^\/api\/evaluaciones\/([^/]+)\/reporte\.pdf$/);
  if (pdfMatch && req.method === "GET") {
    const id = decodeURIComponent(pdfMatch[1]);
    const ev = getEvaluacion(db, id);
    if (!ev) return sendJson(res, 404, { error: "Evaluación no encontrada" });
    const children = getChildren(db, id);
    const metrics = calcAllMetrics(ev, children.funciones, children.transacciones, children.casos_prueba);
    const pdf = buildEvaluationPdf(metrics);
    return sendPdf(res, pdf, `reporte-${ev.codigo}.pdf`);
  }

  const metricMatch = url.pathname.match(/^\/api\/evaluaciones\/([^/]+)\/metricas$/);
  if (metricMatch && req.method === "GET") {
    const id = decodeURIComponent(metricMatch[1]);
    const ev = getEvaluacion(db, id);
    if (!ev) return sendJson(res, 404, { error: "Evaluación no encontrada" });
    const children = getChildren(db, id);
    return sendJson(res, 200, calcAllMetrics(ev, children.funciones, children.transacciones, children.casos_prueba));
  }

  async function handleChild(collectionName, upsertFn) {
    const m = url.pathname.match(new RegExp(`^/api/evaluaciones/([^/]+)/${collectionName}$`));
    if (!m) return false;
    const evalId = decodeURIComponent(m[1]);
    if (!getEvaluacion(db, evalId)) return sendJson(res, 404, { error: "Evaluación no encontrada" }), true;

    if (req.method === "POST") {
      try {
        const body = await readBody(req);
        const row = upsertFn(db, evalId, body);
        if (!row) return sendJson(res, 404, { error: "Registro no encontrado" }), true;
        saveDb(db);
        return sendJson(res, 201, row), true;
      } catch (e) {
        return sendJson(res, 400, { error: e.message }), true;
      }
    }
    return false;
  }

  if (await handleChild("funciones", upsertFuncion)) return;
  if (await handleChild("transacciones", upsertTransaccion)) return;
  if (await handleChild("casos-prueba", upsertCasoPrueba)) return;

  const delFunc = url.pathname.match(/^\/api\/funciones\/([^/]+)$/);
  if (delFunc && req.method === "DELETE") {
    if (!deleteById(db.funciones, delFunc[1])) return sendJson(res, 404, { error: "No encontrado" });
    saveDb(db);
    return sendJson(res, 200, { ok: true });
  }
  const delTx = url.pathname.match(/^\/api\/transacciones\/([^/]+)$/);
  if (delTx && req.method === "DELETE") {
    if (!deleteById(db.transacciones, delTx[1])) return sendJson(res, 404, { error: "No encontrado" });
    saveDb(db);
    return sendJson(res, 200, { ok: true });
  }
  const delCaso = url.pathname.match(/^\/api\/casos-prueba\/([^/]+)$/);
  if (delCaso && req.method === "DELETE") {
    if (!deleteById(db.casos_prueba, delCaso[1])) return sendJson(res, 404, { error: "No encontrado" });
    saveDb(db);
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: "Ruta no encontrada" });
}
