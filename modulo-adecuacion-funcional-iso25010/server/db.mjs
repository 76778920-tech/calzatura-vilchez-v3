import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "qc-db.json");

const EMPTY_DB = {
  evaluaciones: [],
  funciones: [],
  transacciones: [],
  casos_prueba: [],
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadDb() {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY_DB, null, 2), "utf8");
    return structuredClone(EMPTY_DB);
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

export function saveDb(db) {
  ensureDataDir();
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, DB_FILE);
}

export function newId() {
  return randomUUID();
}

export function getEvaluacion(db, id) {
  return db.evaluaciones.find((e) => e.id === id) ?? null;
}

export function getChildren(db, evaluacionId) {
  return {
    funciones: db.funciones.filter((f) => f.evaluacion_id === evaluacionId),
    transacciones: db.transacciones.filter((t) => t.evaluacion_id === evaluacionId),
    casos_prueba: db.casos_prueba.filter((c) => c.evaluacion_id === evaluacionId),
  };
}

export function upsertEvaluacion(db, payload) {
  const now = new Date().toISOString();
  if (payload.id) {
    const idx = db.evaluaciones.findIndex((e) => e.id === payload.id);
    if (idx === -1) return null;
    if (
      payload.codigo &&
      db.evaluaciones.some((e) => e.codigo === payload.codigo && e.id !== payload.id)
    ) {
      throw new Error(`Código duplicado: ${payload.codigo}`);
    }
    db.evaluaciones[idx] = { ...db.evaluaciones[idx], ...payload, updated_at: now };
    return db.evaluaciones[idx];
  }
  if (!payload.codigo?.trim()) throw new Error("codigo es obligatorio");
  if (!payload.titulo?.trim()) throw new Error("titulo es obligatorio");
  if (db.evaluaciones.some((e) => e.codigo === payload.codigo)) {
    throw new Error(`Código duplicado: ${payload.codigo}`);
  }
  const row = {
    id: newId(),
    codigo: payload.codigo,
    titulo: payload.titulo,
    sistema: payload.sistema ?? "Sistema de Gestión de Calzados Calzatura Vilchez",
    periodo: payload.periodo ?? "",
    evaluador: payload.evaluador ?? "",
    fecha_evaluacion: payload.fecha_evaluacion ?? now.slice(0, 10),
    observaciones: payload.observaciones ?? "",
    created_at: now,
    updated_at: now,
  };
  db.evaluaciones.push(row);
  return row;
}

function upsertInCollection(collection, evaluacionId, payload, uniqueField) {
  const now = new Date().toISOString();
  if (payload.id) {
    const idx = collection.findIndex((r) => r.id === payload.id);
    if (idx === -1) return null;
    collection[idx] = { ...collection[idx], ...payload, updated_at: now };
    return collection[idx];
  }
  const duplicate = collection.find(
    (r) => r.evaluacion_id === evaluacionId && r[uniqueField] === payload[uniqueField],
  );
  if (duplicate) throw new Error(`Duplicado: ${uniqueField}=${payload[uniqueField]}`);
  const row = { id: newId(), evaluacion_id: evaluacionId, created_at: now, ...payload };
  collection.push(row);
  return row;
}

export function upsertFuncion(db, evaluacionId, payload) {
  return upsertInCollection(db.funciones, evaluacionId, payload, "codigo_rf");
}

export function upsertTransaccion(db, evaluacionId, payload) {
  return upsertInCollection(db.transacciones, evaluacionId, payload, "codigo");
}

export function upsertCasoPrueba(db, evaluacionId, payload) {
  return upsertInCollection(db.casos_prueba, evaluacionId, payload, "codigo");
}

export function deleteById(collection, id) {
  const idx = collection.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  collection.splice(idx, 1);
  return true;
}

export function deleteEvaluacionCascade(db, id) {
  const idx = db.evaluaciones.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  db.evaluaciones.splice(idx, 1);
  db.funciones = db.funciones.filter((f) => f.evaluacion_id !== id);
  db.transacciones = db.transacciones.filter((t) => t.evaluacion_id !== id);
  db.casos_prueba = db.casos_prueba.filter((c) => c.evaluacion_id !== id);
  return true;
}
