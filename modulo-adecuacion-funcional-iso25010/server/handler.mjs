/**
 * Handlers REST compartidos — usable desde servidor standalone (4322) o unificado (4321).
 */
import { getRepository, getPersistenceInfo } from "./repository.mjs";
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

export async function seedIfEmpty() {
  const repo = getRepository();
  if (await repo.isEmpty()) {
    await repo.applySeed(buildSeedDb());
    console.log(`Base de datos QC inicializada (${repo.backend}) — datos Calzatura Vilchez.`);
  }
}

export async function handleQcApi(req, res, url) {
  const repo = getRepository();

  if (req.method === "GET" && url.pathname === "/api/health") {
    const info = getPersistenceInfo();
    return sendJson(res, 200, {
      ok: true,
      module: "adecuacion-funcional-iso25010",
      persistence: repo.backend,
      persistenceMode: info.mode,
    });
  }

  if (req.method === "POST" && url.pathname === "/api/seed") {
    await repo.applySeed(buildSeedDb());
    return sendJson(res, 200, { ok: true, message: "Datos de ejemplo cargados", persistence: repo.backend });
  }

  if (req.method === "GET" && url.pathname === "/api/evaluaciones") {
    const evaluaciones = await repo.listEvaluaciones();
    const list = await Promise.all(
      evaluaciones.map(async (e) => {
        const children = await repo.getChildren(e.id);
        const metrics = calcAllMetrics(e, children.funciones, children.transacciones, children.casos_prueba);
        return { ...e, metricas: metrics };
      }),
    );
    return sendJson(res, 200, list);
  }

  if (req.method === "POST" && url.pathname === "/api/evaluaciones") {
    try {
      const body = await readBody(req);
      const row = await repo.createEvaluacion(body);
      return sendJson(res, 201, row);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  const evalMatch = url.pathname.match(/^\/api\/evaluaciones\/([^/]+)$/);
  if (evalMatch) {
    const id = decodeURIComponent(evalMatch[1]);
    if (req.method === "GET") {
      const ev = await repo.getEvaluacion(id);
      if (!ev) return sendJson(res, 404, { error: "Evaluación no encontrada" });
      const children = await repo.getChildren(id);
      const metrics = calcAllMetrics(ev, children.funciones, children.transacciones, children.casos_prueba);
      return sendJson(res, 200, { ...ev, ...children, metricas: metrics });
    }
    if (req.method === "PUT") {
      const body = await readBody(req);
      try {
        const row = await repo.updateEvaluacion(id, body);
        if (!row) return sendJson(res, 404, { error: "Evaluación no encontrada" });
        return sendJson(res, 200, row);
      } catch (e) {
        return sendJson(res, 400, { error: e.message });
      }
    }
    if (req.method === "DELETE") {
      if (!(await repo.deleteEvaluacion(id))) return sendJson(res, 404, { error: "Evaluación no encontrada" });
      return sendJson(res, 200, { ok: true });
    }
  }

  const pdfMatch = url.pathname.match(/^\/api\/evaluaciones\/([^/]+)\/reporte\.pdf$/);
  if (pdfMatch && req.method === "GET") {
    const id = decodeURIComponent(pdfMatch[1]);
    const ev = await repo.getEvaluacion(id);
    if (!ev) return sendJson(res, 404, { error: "Evaluación no encontrada" });
    const children = await repo.getChildren(id);
    const metrics = calcAllMetrics(ev, children.funciones, children.transacciones, children.casos_prueba);
    const pdf = buildEvaluationPdf(metrics);
    return sendPdf(res, pdf, `reporte-${ev.codigo}.pdf`);
  }

  const metricMatch = url.pathname.match(/^\/api\/evaluaciones\/([^/]+)\/metricas$/);
  if (metricMatch && req.method === "GET") {
    const id = decodeURIComponent(metricMatch[1]);
    const ev = await repo.getEvaluacion(id);
    if (!ev) return sendJson(res, 404, { error: "Evaluación no encontrada" });
    const children = await repo.getChildren(id);
    return sendJson(res, 200, calcAllMetrics(ev, children.funciones, children.transacciones, children.casos_prueba));
  }

  async function handleChild(collectionName, upsertFn) {
    const m = url.pathname.match(new RegExp(`^/api/evaluaciones/([^/]+)/${collectionName}$`));
    if (!m) return false;
    const evalId = decodeURIComponent(m[1]);
    if (!(await repo.getEvaluacion(evalId))) {
      sendJson(res, 404, { error: "Evaluación no encontrada" });
      return true;
    }

    if (req.method === "POST") {
      try {
        const body = await readBody(req);
        const row = await upsertFn(evalId, body);
        if (!row) {
          sendJson(res, 404, { error: "Registro no encontrado" });
          return true;
        }
        sendJson(res, 201, row);
        return true;
      } catch (e) {
        sendJson(res, 400, { error: e.message });
        return true;
      }
    }
    return false;
  }

  if (await handleChild("funciones", (id, body) => repo.upsertFuncion(id, body))) return;
  if (await handleChild("transacciones", (id, body) => repo.upsertTransaccion(id, body))) return;
  if (await handleChild("casos-prueba", (id, body) => repo.upsertCasoPrueba(id, body))) return;

  const delFunc = url.pathname.match(/^\/api\/funciones\/([^/]+)$/);
  if (delFunc && req.method === "DELETE") {
    if (!(await repo.deleteFuncion(delFunc[1]))) return sendJson(res, 404, { error: "No encontrado" });
    return sendJson(res, 200, { ok: true });
  }
  const delTx = url.pathname.match(/^\/api\/transacciones\/([^/]+)$/);
  if (delTx && req.method === "DELETE") {
    if (!(await repo.deleteTransaccion(delTx[1]))) return sendJson(res, 404, { error: "No encontrado" });
    return sendJson(res, 200, { ok: true });
  }
  const delCaso = url.pathname.match(/^\/api\/casos-prueba\/([^/]+)$/);
  if (delCaso && req.method === "DELETE") {
    if (!(await repo.deleteCasoPrueba(delCaso[1]))) return sendJson(res, 404, { error: "No encontrado" });
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: "Ruta no encontrada" });
}
