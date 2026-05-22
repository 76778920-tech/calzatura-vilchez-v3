import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { downloadXlsx, readXlsxFirstSheet } from "@/domains/administradores/utils/spreadsheet";
import { AlertTriangle, CheckCircle, Download, FileSpreadsheet, Loader, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { logAudit } from "@/services/audit";
import {
  adminDataCountSalesUntil,
  adminDataDeleteSalesUntil,
  adminDataDeleteScenarioTestData,
  adminDataDeleteTestBatch,
  adminDataExport,
  adminDataImport,
  adminDataListTestDocs,
  adminDataProductIds,
  type AdminDataCollection,
} from "@/domains/administradores/services/adminData";
import { aiAdminFetch } from "@/services/aiAdminClient";
import { calculatePriceRange } from "@/domains/ventas/services/finance";
import { AccessibleConfirmDialog } from "@/components/common/AccessibleConfirmDialog";

// ── Types ─────────────────────────────────────────────────────────────────────

type ImportStatus = "idle" | "loading" | "success" | "error";
type ExportStatus = "idle" | "loading" | "success";

type Row = Record<string, unknown>;
type ScenarioKey = "crisis" | "normal" | "buenas" | "general";
type PendingDataDelete =
  | { type: "sales-date"; date: string }
  | { type: "scenario"; scenario: ScenarioKey }
  | { type: "batch"; loteImportacion: string };

interface ImportContext {
  fileName: string;
  importadoEn: string;
  loteImportacion: string;
  escenario: ScenarioKey;
}

interface TestBatchSummary {
  loteImportacion: string;
  escenario: ScenarioKey;
  importadoEn: string;
  total: number;
  counts: Record<string, number>;
}

interface CollectionConfig {
  id: string;
  label: string;
  description: string;
  canImport: boolean;
  templateHeaders: string[];
  templateExample: Row;
  extraData?: () => Promise<Record<string, unknown>>;
  exportTransform: (d: Row, extra?: Record<string, unknown>) => Row;
  importTransform: (row: Row, context: ImportContext) => Row;
  importValidate: (row: Row) => string | null;
  importDocId?: (row: Row) => string | null;
  upsertOnConflict?: string;
}

const SCENARIO_OPTIONS: { key: ScenarioKey; label: string }[] = [
  { key: "crisis", label: "Crisis" },
  { key: "normal", label: "Normal" },
  { key: "buenas", label: "Buenas Ventas" },
  { key: "general", label: "General" },
];

function inferScenario(fileName: string): ScenarioKey {
  const normalized = fileName.toLowerCase();
  if (normalized.includes("crisis")) return "crisis";
  if (normalized.includes("normal")) return "normal";
  if (normalized.includes("buenas") || normalized.includes("buenas_ventas") || normalized.includes("alta")) return "buenas";
  return "general";
}

function importBaseName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  const withoutExtension = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  let slug = "";

  for (const char of withoutExtension.toLowerCase()) {
    const isAsciiLetter = char >= "a" && char <= "z";
    const isDigit = char >= "0" && char <= "9";
    if (isAsciiLetter || isDigit) {
      slug += char;
    } else if (slug && !slug.endsWith("-")) {
      slug += "-";
    }

    if (slug.length >= 48) break;
  }

  if (slug.endsWith("-")) {
    slug = slug.slice(0, -1);
  }
  return slug || "archivo";
}

function compactDigits(value: string, maxLength = Number.MAX_SAFE_INTEGER): string {
  let digits = "";
  for (const char of value) {
    if (char >= "0" && char <= "9") {
      digits += char;
      if (digits.length >= maxLength) break;
    }
  }
  return digits;
}

function normalizeImportToken(value: unknown, maxLength: number): string {
  const raw = cellString(value).trim();
  let normalized = "";
  let lastWasSeparator = false;

  for (const char of raw) {
    const isSeparator = char === "/" || char === "\\" || char.trim() === "";
    if (isSeparator) {
      if (normalized && !lastWasSeparator) {
        normalized += "-";
        lastWasSeparator = true;
      }
    } else {
      normalized += char;
      lastWasSeparator = false;
    }

    if (normalized.length >= maxLength) break;
  }

  if (normalized.endsWith("-")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function removePrefix(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function createImportContext(fileName: string): ImportContext {
  const importadoEn = new Date().toISOString();
  const escenario = inferScenario(fileName);
  const base = importBaseName(fileName);
  const stamp = compactDigits(importadoEn, 14);
  const rand = crypto.randomUUID().slice(0, 4);
  return {
    fileName,
    importadoEn,
    loteImportacion: `${escenario}-${stamp}-${rand}-${base}`,
    escenario,
  };
}

function scenarioLabel(key: string | null | undefined) {
  return SCENARIO_OPTIONS.find((item) => item.key === key)?.label ?? "General";
}

/** Evita "[object Object]" al exportar celdas tipadas como unknown (Sonar / Row). */
function cellString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? `${value}` : "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "bigint") return `${value}`;
  if (typeof value !== "object") return "";
  if (value instanceof Date) return value.toISOString();
  const maybeTs = value as { toDate?: () => Date };
  if (typeof maybeTs.toDate === "function") {
    try {
      return maybeTs.toDate().toISOString();
    } catch {
      return "";
    }
  }
  return "";
}

function normalizeImportId(value: unknown): string {
  return normalizeImportToken(value, 120);
}

function deriveProductImportId(row: Row): string | null {
  const explicitId = normalizeImportId(row.id);
  if (explicitId) return explicitId;
  const fromProductId = normalizeImportId(row.productId);
  if (fromProductId) return fromProductId;
  const fromCode = normalizeImportId(row.codigo);
  return fromCode || null;
}

function parseBooleanCell(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const normalized = cellString(value).trim().toLowerCase();
  return ["true", "1", "si", "sí", "yes"].includes(normalized);
}

function parseJsonCell<T>(value: unknown, fallback: T): T {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(cellString(value)) as T;
  } catch {
    return fallback;
  }
}

function parseStringArrayCell(value: unknown): string[] {
  const parsed = parseJsonCell<unknown>(value, []);
  if (Array.isArray(parsed)) {
    return parsed.map((item) => cellString(item).trim()).filter(Boolean);
  }
  return cellString(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumberMapCell(value: unknown): Record<string, number> {
  const parsed = parseJsonCell<Record<string, unknown>>(value, {});
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return Object.fromEntries(
    Object.entries(parsed).map(([key, amount]) => [cellString(key).trim(), Number(cellString(amount) || 0)])
  );
}


async function invalidateAICache(): Promise<void> {
  try {
    await aiAdminFetch("/api/cache/invalidate", { method: "POST" });
  } catch {
    // El panel puede seguir funcionando aunque el refresco del cache falle.
  }
}

// ── Configuración de colecciones ──────────────────────────────────────────────

const COLLECTIONS: CollectionConfig[] = [
  {
    id: "productos",
    label: "Productos",
    description: "Catálogo completo de calzado",
    canImport: true,
    templateHeaders: [
      "id", "codigo", "nombre", "precio", "stock", "categoria", "tipoCalzado",
      "descripcion", "marca", "color", "familiaId", "tallas", "tallaStock", "destacado",
    ],
    templateExample: {
      id: "PRUEBA_CV001",
      codigo: "CV-001",
      nombre: "Zapatilla Deportiva",
      precio: 89.9,
      stock: 10,
      categoria: "Deportivo",
      tipoCalzado: "Zapatillas",
      descripcion: "Descripcion del producto (opcional)",
      marca: "Nike",
      color: "Negro",
      familiaId: "",
      tallas: "[\"39\",\"40\",\"41\"]",
      tallaStock: "{\"39\":3,\"40\":4,\"41\":3}",
      destacado: false,
    },
    exportTransform: (d, extra) => {
      const id = cellString(d.id);
      return {
        id,
        codigo: (extra as Record<string, string> | undefined)?.[id] ?? "",
        nombre: cellString(d.nombre),
        precio: d.precio ?? 0,
        stock: d.stock ?? 0,
        categoria: cellString(d.categoria),
        tipoCalzado: cellString(d.tipoCalzado),
        descripcion: cellString(d.descripcion),
        marca: cellString(d.marca),
        color: cellString(d.color),
        familiaId: cellString(d.familiaId),
        tallas: JSON.stringify(d.tallas ?? []),
        tallaStock: JSON.stringify(d.tallaStock ?? {}),
        destacado: d.destacado ?? false,
      };
    },
    importTransform: (row, context) => ({
      nombre: cellString(row.nombre).trim(),
      precio: Number(row.precio ?? 0),
      stock: Number(row.stock ?? 0),
      categoria: cellString(row.categoria).trim(),
      tipoCalzado: cellString(row.tipoCalzado).trim(),
      descripcion: cellString(row.descripcion).trim(),
      marca: cellString(row.marca).trim(),
      color: cellString(row.color).trim(),
      familiaId: cellString(row.familiaId).trim() || undefined,
      tallas: parseStringArrayCell(row.tallas),
      tallaStock: parseNumberMapCell(row.tallaStock),
      destacado: parseBooleanCell(row.destacado),
      imagen: "",
      imagenes: [],
      esDePrueba: true,
      importadoEn: context.importadoEn,
      loteImportacion: context.loteImportacion,
      escenario: context.escenario,
    }),
    importValidate: (row) => {
      if (!deriveProductImportId(row)) return "Debes incluir 'id' o 'codigo' para identificar el producto";
      if (!row.nombre) return "Falta el campo 'nombre'";
      if (row.precio === undefined || Number.isNaN(Number(row.precio))) return "El campo 'precio' debe ser un número";
      if (row.stock === undefined || Number.isNaN(Number(row.stock))) return "El campo 'stock' debe ser un número";
      if (!row.categoria) return "Falta el campo 'categoria'";
      return null;
    },
    importDocId: deriveProductImportId,
  },
  {
    id: "productoFinanzas",
    label: "Finanzas de Producto",
    description: "Costos y márgenes para reportes y pruebas",
    canImport: true,
    templateHeaders: [
      "productId", "costoCompra", "margenMinimo", "margenObjetivo", "margenMaximo",
      "precioMinimo", "precioSugerido", "precioMaximo",
    ],
    templateExample: {
      productId: "PRUEBA_CV001",
      costoCompra: 72,
      margenMinimo: 20,
      margenObjetivo: 35,
      margenMaximo: 55,
      precioMinimo: 86.4,
      precioSugerido: 97.2,
      precioMaximo: 111.6,
    },
    exportTransform: (d) => ({
      productId: cellString(d.productId),
      costoCompra: d.costoCompra ?? 0,
      margenMinimo: d.margenMinimo ?? 0,
      margenObjetivo: d.margenObjetivo ?? 0,
      margenMaximo: d.margenMaximo ?? 0,
      precioMinimo: d.precioMinimo ?? 0,
      precioSugerido: d.precioSugerido ?? 0,
      precioMaximo: d.precioMaximo ?? 0,
      actualizadoEn: cellString(d.actualizadoEn),
    }),
    importTransform: (row, context) => ({
      productId: cellString(row.productId).trim(),
      costoCompra: Number(row.costoCompra ?? 0),
      margenMinimo: Number(row.margenMinimo ?? 0),
      margenObjetivo: Number(row.margenObjetivo ?? 0),
      margenMaximo: Number(row.margenMaximo ?? 0),
      precioMinimo: Number(row.precioMinimo ?? 0),
      precioSugerido: Number(row.precioSugerido ?? 0),
      precioMaximo: Number(row.precioMaximo ?? 0),
      actualizadoEn: context.importadoEn,
      esDePrueba: true,
      importadoEn: context.importadoEn,
      loteImportacion: context.loteImportacion,
      escenario: context.escenario,
    }),
    importValidate: (row) => {
      if (!row.productId) return "Falta el campo 'productId'";
      if (row.costoCompra === undefined || Number.isNaN(Number(row.costoCompra))) return "El campo 'costoCompra' debe ser un número";
      if (row.margenObjetivo === undefined || Number.isNaN(Number(row.margenObjetivo))) return "El campo 'margenObjetivo' debe ser un número";
      return null;
    },
    upsertOnConflict: "productId",
  },
  {
    id: "fabricantes",
    label: "Fabricantes",
    description: "Proveedores y fabricantes registrados",
    canImport: true,
    templateHeaders: ["dni", "nombres", "apellidos", "marca", "telefono", "observaciones"],
    templateExample: {
      dni: "12345678",
      nombres: "Juan",
      apellidos: "Perez Lopez",
      marca: "Marca XYZ",
      telefono: "999888777",
      observaciones: "",
    },
    exportTransform: (d) => ({
      id: cellString(d.id),
      dni: cellString(d.dni),
      nombres: cellString(d.nombres),
      apellidos: cellString(d.apellidos),
      marca: cellString(d.marca),
      telefono: cellString(d.telefono),
      activo: d.activo ?? true,
      observaciones: cellString(d.observaciones),
      creadoEn: cellString(d.creadoEn),
      actualizadoEn: cellString(d.actualizadoEn),
      esDePrueba: d.esDePrueba ?? false,
      importadoEn: cellString(d.importadoEn),
      loteImportacion: cellString(d.loteImportacion),
      escenario: cellString(d.escenario),
    }),
    importTransform: (row, context) => ({
      dni: cellString(row.dni).trim(),
      nombres: cellString(row.nombres).trim(),
      apellidos: cellString(row.apellidos).trim(),
      marca: cellString(row.marca).trim(),
      telefono: cellString(row.telefono).trim(),
      observaciones: cellString(row.observaciones).trim(),
      activo: true,
      creadoEn: context.importadoEn,
      actualizadoEn: context.importadoEn,
      esDePrueba: true,
      importadoEn: context.importadoEn,
      loteImportacion: context.loteImportacion,
      escenario: context.escenario,
    }),
    importValidate: (row) => {
      const dni = compactDigits(cellString(row.dni));
      if (dni.length !== 8) return "El DNI debe tener exactamente 8 dígitos";
      if (!row.nombres) return "Falta el campo 'nombres'";
      if (!row.apellidos) return "Falta el campo 'apellidos'";
      if (!row.marca) return "Falta el campo 'marca'";
      return null;
    },
  },
  {
    id: "ventasDiarias",
    label: "Ventas Diarias",
    description: "Historial de ventas — ideal para datos de prueba",
    canImport: true,
    templateHeaders: [
      "productId", "codigo", "nombre", "color", "talla",
      "fecha", "cantidad", "precioVenta", "total",
      "costoUnitario", "costoTotal", "ganancia",
      "documentoTipo", "documentoNumero",
    ],
    templateExample: {
      productId: "ID_PRODUCTO",
      codigo: "CV-001",
      nombre: "Zapatilla Deportiva",
      color: "Negro",
      talla: "40",
      fecha: "2026-04-20",
      cantidad: 2,
      precioVenta: 89.9,
      total: 179.8,
      costoUnitario: 60,
      costoTotal: 120,
      ganancia: 59.8,
      documentoTipo: "ninguno",
      documentoNumero: "",
    },
    exportTransform: (d) => ({
      id: cellString(d.id),
      productId: cellString(d.productId),
      codigo: cellString(d.codigo),
      nombre: cellString(d.nombre),
      color: cellString(d.color),
      talla: cellString(d.talla),
      fecha: cellString(d.fecha),
      cantidad: d.cantidad ?? 0,
      precioVenta: d.precioVenta ?? 0,
      total: d.total ?? 0,
      costoUnitario: d.costoUnitario ?? 0,
      costoTotal: d.costoTotal ?? 0,
      ganancia: d.ganancia ?? 0,
      documentoTipo: cellString(d.documentoTipo) || "ninguno",
      documentoNumero: cellString(d.documentoNumero),
      devuelto: d.devuelto ?? false,
      creadoEn: cellString(d.creadoEn),
    }),
    importTransform: (row, context) => ({
      productId: cellString(row.productId).trim(),
      codigo: cellString(row.codigo).trim(),
      nombre: cellString(row.nombre).trim(),
      color: cellString(row.color).trim(),
      talla: cellString(row.talla).trim(),
      fecha: cellString(row.fecha).trim(),
      cantidad: Number(row.cantidad ?? 0),
      precioVenta: Number(row.precioVenta ?? 0),
      total: Number(row.total ?? 0),
      costoUnitario: Number(row.costoUnitario ?? 0),
      costoTotal: Number(row.costoTotal ?? 0),
      ganancia: Number(row.ganancia ?? 0),
      documentoTipo: (cellString(row.documentoTipo) || "ninguno").trim(),
      documentoNumero: cellString(row.documentoNumero).trim(),
      devuelto: false,
      creadoEn: context.importadoEn,
      esDePrueba: true,
      importadoEn: context.importadoEn,
      loteImportacion: context.loteImportacion,
      escenario: context.escenario,
    }),
    importValidate: (row) => {
      if (!row.productId) return "Falta el campo 'productId'";
      if (!row.fecha) return "Falta el campo 'fecha'";
      if (row.cantidad === undefined || Number.isNaN(Number(row.cantidad))) return "El campo 'cantidad' debe ser un número";
      if (row.precioVenta === undefined || Number.isNaN(Number(row.precioVenta))) return "El campo 'precioVenta' debe ser un número";
      if (row.total === undefined || Number.isNaN(Number(row.total))) return "El campo 'total' debe ser un número";
      return null;
    },
  },
  {
    id: "pedidos",
    label: "Pedidos",
    description: "Solo exportación — los pedidos se generan desde la tienda",
    canImport: false,
    templateHeaders: [],
    templateExample: {},
    exportTransform: (d) => ({
      id: cellString(d.id),
      userId: cellString(d.userId),
      userEmail: cellString(d.userEmail),
      total: d.total ?? 0,
      subtotal: d.subtotal ?? 0,
      envio: d.envio ?? 0,
      estado: cellString(d.estado),
      metodoPago: cellString(d.metodoPago),
      notas: cellString(d.notas),
      creadoEn: cellString(d.creadoEn),
    }),
    importTransform: () => ({}),
    importValidate: () => null,
  },
  {
    id: "usuarios",
    label: "Usuarios",
    description: "Solo exportación — los usuarios se registran desde la tienda",
    canImport: false,
    templateHeaders: [],
    templateExample: {},
    exportTransform: (d) => ({
      uid: cellString(d.uid ?? d.id),
      nombre: cellString(d.nombre ?? d.nombres),
      email: cellString(d.email),
      rol: cellString(d.rol),
      telefono: cellString(d.telefono),
      creadoEn: cellString(d.creadoEn),
    }),
    importTransform: () => ({}),
    importValidate: () => null,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function exportCollection(config: CollectionConfig): Promise<void> {
  const { rows: docs, extra } = await adminDataExport(config.id as AdminDataCollection);
  const rows = (docs ?? []).map((d) => config.exportTransform(d as Row, extra));
  if (rows.length === 0) throw new Error("La colección está vacía");
  await downloadXlsx(
    `${config.id}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    config.label,
    rows,
  );
}

async function downloadTemplate(config: CollectionConfig): Promise<void> {
  await downloadXlsx(`plantilla_${config.id}.xlsx`, "Plantilla", [config.templateExample]);
}

async function importRows(
  config: CollectionConfig,
  rows: Row[],
  context: ImportContext,
): Promise<{ ok: number; errors: string[] }> {
  const errors: string[] = [];
  const validRows: { data: Row; docId: string | null; source: Row }[] = [];
  let validProductIds: Set<string> | null = null;

  if (config.id === "ventasDiarias" || config.id === "productoFinanzas") {
    validProductIds = await adminDataProductIds();
  }

  rows.forEach((row, i) => {
    const err = config.importValidate(row);
    const isVentas = config.id === "ventasDiarias";
    const productId = isVentas ? cellString(row.productId).trim() : "";
    const productMissingInCatalog = isVentas && productId.length > 0 && !(validProductIds?.has(productId) ?? false);

    if (err) {
      errors.push(`Fila ${i + 2}: ${err}`);
    } else if (productMissingInCatalog) {
      errors.push(`Fila ${i + 2}: El productId '${productId}' no existe en la tabla productos`);
    } else {
      const docId = config.importDocId ? config.importDocId(row) : null;
      validRows.push({ data: config.importTransform(row, context), docId, source: row });
    }
  });

  const CHUNK = 500;
  for (let i = 0; i < validRows.length; i += CHUNK) {
    const chunk = validRows.slice(i, i + CHUNK);
    const rowsToInsert = chunk.map(({ data, docId }) =>
      docId ? { ...data, id: docId } : data,
    );
    const productCodes =
      config.id === "productos"
        ? chunk
            .filter(({ source }) => cellString(source.codigo).trim())
            .map(({ data, docId, source }) => ({
              productoId: cellString(docId ?? data.id).trim(),
              codigo: cellString(source.codigo).trim(),
            }))
            .filter((row) => row.productoId && row.codigo)
        : undefined;

    await adminDataImport({
      collection: config.id as AdminDataCollection,
      rows: rowsToInsert,
      onConflict: config.upsertOnConflict,
      productCodes,
    });
  }

  return { ok: validRows.length, errors };
}

async function fetchTestDocs() {
  return adminDataListTestDocs();
}

async function listTestBatches(): Promise<TestBatchSummary[]> {
  const docs = await fetchTestDocs();
  const grouped = new Map<string, TestBatchSummary>();

  docs.forEach(({ colId, data }) => {
    const loteImportacion = cellString(data.loteImportacion).trim();
    if (!loteImportacion) return;

    const current = grouped.get(loteImportacion) ?? {
      loteImportacion,
      escenario: ((cellString(data.escenario) || "general").trim() || "general") as ScenarioKey,
      importadoEn: cellString(data.importadoEn ?? data.creadoEn),
      total: 0,
      counts: {},
    };

    current.total += 1;
    current.counts[colId] = (current.counts[colId] ?? 0) + 1;
    if (!current.importadoEn) current.importadoEn = cellString(data.importadoEn ?? data.creadoEn);
    grouped.set(loteImportacion, current);
  });

  return Array.from(grouped.values()).sort((a, b) => b.importadoEn.localeCompare(a.importadoEn));
}

async function countScenarioTestData(escenario: ScenarioKey): Promise<number> {
  const docs = await fetchTestDocs();
  return docs.filter(({ data }) => (cellString(data.escenario) || "general").trim() === escenario).length;
}

async function deleteScenarioTestData(escenario: ScenarioKey): Promise<number> {
  const docs = await fetchTestDocs();
  const targets = docs.filter(({ data }) => (cellString(data.escenario) || "general").trim() === escenario);
  await adminDataDeleteScenarioTestData(escenario);
  return targets.length;
}

async function deleteTestBatch(loteImportacion: string): Promise<number> {
  const docs = await fetchTestDocs();
  const targets = docs.filter(({ data }) => cellString(data.loteImportacion).trim() === loteImportacion);
  await adminDataDeleteTestBatch(loteImportacion);
  return targets.length;
}

// ── Eliminación por fecha ─────────────────────────────────────────────────────

async function countSalesUpToDate(dateStr: string): Promise<number> {
  return adminDataCountSalesUntil(dateStr);
}

async function deleteSalesUpToDate(dateStr: string): Promise<number> {
  return adminDataDeleteSalesUntil(dateStr);
}

// ── Escenarios de prueba (≈ 500 filas c/u) ───────────────────────────────────

const BASE_PRODUCTS = [
  { id: "PRUEBA_CV001", nombre: "Zapatilla Running Pro",  precio: 119.9, costo: 75,   cat: "Deportivo", marca: "Adidas",     color: "Azul",   talla: "40", baseProb: 0.65, minQ: 1, maxQ: 3 },
  { id: "PRUEBA_CV002", nombre: "Bota de Cuero Casual",   precio: 159.9, costo: 95,   cat: "Casual",    marca: "Clarks",     color: "Marron", talla: "42", baseProb: 0.5,  minQ: 1, maxQ: 2 },
  { id: "PRUEBA_CV003", nombre: "Sandalia Verano",        precio:  49.9, costo: 28,   cat: "Casual",    marca: "Crocs",      color: "Beige",  talla: "38", baseProb: 0.45, minQ: 1, maxQ: 4 },
  { id: "PRUEBA_CV004", nombre: "Mocasin Ejecutivo",      precio: 129.9, costo: 80,   cat: "Formal",    marca: "Bata",       color: "Negro",  talla: "41", baseProb: 0.55, minQ: 1, maxQ: 2 },
  { id: "PRUEBA_CV005", nombre: "Zapatilla Escolar",      precio:  79.9, costo: 50,   cat: "Escolar",   marca: "Kolosh",     color: "Blanco", talla: "36", baseProb: 0.6,  minQ: 1, maxQ: 3 },
  { id: "PRUEBA_CV006", nombre: "Bota Urbana Negra",      precio: 189.9, costo: 120,  cat: "Urbano",    marca: "Timberland", color: "Negro",  talla: "43", baseProb: 0.4,  minQ: 1, maxQ: 2 },
  { id: "PRUEBA_CV007", nombre: "Zapato Formal Clasico",  precio: 149.9, costo: 90,   cat: "Formal",    marca: "Bata",       color: "Cafe",   talla: "40", baseProb: 0.45, minQ: 1, maxQ: 2 },
  { id: "PRUEBA_CV008", nombre: "Chancleta Playera",      precio:  29.9, costo: 15,   cat: "Playa",     marca: "Rider",      color: "Verde",  talla: "39", baseProb: 0.55, minQ: 1, maxQ: 5 },
] as const;

interface ScenarioCfg {
  key: string;
  label: string;
  color: string;
  detail: string;
  days: number;
  probMult: number;
  qtyMult: number;
  priceDiscount: number;
  trendStartMult: number;
  trendEndMult: number;
  recentShockDays?: number;
  recentShockMult?: number;
  stocks: readonly number[];
}

function uniqueSortedSizes(sizes: string[]) {
  return Array.from(new Set(sizes.map(String))).sort((a, b) => Number(a) - Number(b));
}

function buildScenarioColorStock(baseSize: string, stock: number) {
  const base = Number(baseSize);
  const sizes = uniqueSortedSizes([String(base - 1), String(base), String(base + 1)]);
  const weights = [0.3, 0.4, 0.3];
  const tallaStock: Record<string, number> = {};
  let assigned = 0;

  sizes.forEach((size, index) => {
    const qty = index === sizes.length - 1
      ? Math.max(0, stock - assigned)
      : Math.max(0, Math.round(stock * weights[index]));
    tallaStock[size] = qty;
    assigned += qty;
  });

  return {
    tallas: sizes,
    tallaStock,
  };
}

// Stock por producto: CV001..CV008
// Crisis -> mucho stock acumulado (no se vende)
// Normal -> stock moderado
// Buenas ventas -> stock casi agotado (alta demanda)
const SCENARIOS: ScenarioCfg[] = [
  {
    key: "crisis",
    label: "Crisis",
    color: "#ef4444",
    detail: "180 dias · ventas bajas · precios con 10% descuento · ~500 filas",
    days: 180,
    probMult: 0.42,
    qtyMult: 0.6,
    priceDiscount: 0.15,
    trendStartMult: 0.95,
    trendEndMult: 0.4,
    recentShockDays: 30,
    recentShockMult: 0.62,
    stocks: [98, 74, 108, 58, 86, 66, 52, 124],
  },
  {
    key: "normal",
    label: "Normal",
    color: "#f59e0b",
    detail: "90 dias · ventas regulares · precios normales · ~500 filas",
    days: 90,
    probMult: 1.1,
    qtyMult: 1,
    priceDiscount: 0,
    trendStartMult: 0.98,
    trendEndMult: 1.05,
    stocks: [22, 15, 30, 18, 28, 25, 16, 40],
  },
  {
    key: "buenas",
    label: "Buenas Ventas",
    color: "#10b981",
    detail: "70 dias · temporada alta · alta demanda · stock en riesgo · ~500 filas",
    days: 70,
    probMult: 1.5,
    qtyMult: 1.5,
    priceDiscount: 0,
    trendStartMult: 1.1,
    trendEndMult: 1.9,
    recentShockDays: 21,
    recentShockMult: 1.12,
    stocks: [4, 2, 8, 5, 3, 7, 1, 12],
  },
];

function detRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function downloadScenario(sc: ScenarioCfg): void {
  const productRows = BASE_PRODUCTS.map((p, i) => {
    const precio = sc.priceDiscount > 0
      ? Math.round(p.precio * (1 - sc.priceDiscount) * 100) / 100
      : p.precio;
    const inventory = buildScenarioColorStock(p.talla, sc.stocks[i]);
    let tipoCalzado = "Casual";
    if (p.cat === "Formal") tipoCalzado = "Zapatos de Vestir";
    else if (p.cat === "Deportivo") tipoCalzado = "Zapatillas";
    return {
      id: p.id,
      codigo: removePrefix(p.id, "PRUEBA_"),
      nombre: p.nombre,
      precio,
      stock: sc.stocks[i],
      categoria: p.cat,
      tipoCalzado,
      descripcion: `Producto de prueba — escenario ${sc.label}`,
      marca: p.marca,
      color: p.color,
      tallas: JSON.stringify(inventory.tallas),
      tallaStock: JSON.stringify(inventory.tallaStock),
      destacado: false,
    };
  });
  void downloadXlsx(`productos_${sc.key}.xlsx`, "Productos", productRows);

  const financeRows = BASE_PRODUCTS.map((p) => {
    const precio = sc.priceDiscount > 0
      ? Math.round(p.precio * (1 - sc.priceDiscount) * 100) / 100
      : p.precio;
    const pricing = calculatePriceRange(p.costo, 20, 35, 55);
    return {
      productId: p.id,
      costoCompra: p.costo,
      margenMinimo: pricing.margenMinimo,
      margenObjetivo: pricing.margenObjetivo,
      margenMaximo: pricing.margenMaximo,
      precioMinimo: pricing.precioMinimo,
      precioSugerido: Math.round(precio * 100) / 100,
      precioMaximo: Math.max(pricing.precioMaximo, Math.round(precio * 1.12 * 100) / 100),
    };
  });
  setTimeout(() => {
    void downloadXlsx(`finanzas_${sc.key}.xlsx`, "Finanzas", financeRows);
  }, 250);

  setTimeout(() => {
    const salesRows: Row[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let offset = sc.days; offset >= 1; offset--) {
      const d = new Date(today);
      d.setDate(d.getDate() - offset);
      const dateStr = d.toISOString().slice(0, 10);

      BASE_PRODUCTS.forEach((p, pIdx) => {
        const seed = offset * 100 + pIdx;
        const progress = (sc.days - offset) / Math.max(1, sc.days - 1);
        const trendMult = sc.trendStartMult + ((sc.trendEndMult - sc.trendStartMult) * progress);
        const shockMult =
          sc.recentShockDays && offset <= sc.recentShockDays
            ? (sc.recentShockMult ?? 1)
            : 1;
        const effectiveTrend = trendMult * shockMult;
        const prob = Math.min(0.97, p.baseProb * sc.probMult * effectiveTrend);
        if (detRand(seed) < prob) {
          const rawQty = p.minQ + detRand(seed + 50) * (p.maxQ - p.minQ);
          const qtyTrend = Math.max(0.45, Math.min(1.7, 0.7 + (effectiveTrend * 0.45)));
          const qty = Math.max(1, Math.round(rawQty * sc.qtyMult * qtyTrend));
          const precio = sc.priceDiscount > 0
            ? Math.round(p.precio * (1 - sc.priceDiscount) * 100) / 100
            : p.precio;
          const total  = Math.round(qty * precio   * 100) / 100;
          const costoT = Math.round(qty * p.costo  * 100) / 100;
          salesRows.push({
            productId: p.id,
            codigo: removePrefix(p.id, "PRUEBA_"),
            nombre: p.nombre,
            color: p.color,
            talla: p.talla,
            fecha: dateStr,
            cantidad: qty,
            precioVenta: precio,
            total,
            costoUnitario: p.costo,
            costoTotal: costoT,
            ganancia: Math.round((total - costoT) * 100) / 100,
            documentoTipo: "ninguno",
            documentoNumero: "",
          });
        }
      });
    }

    void downloadXlsx(`ventas_${sc.key}.xlsx`, "Ventas Diarias", salesRows);
  }, 600);
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function AdminData() {
  const [importStatus, setImportStatus] = useState<Record<string, ImportStatus>>({});
  const [exportStatus, setExportStatus] = useState<Record<string, ExportStatus>>({});
  const [importErrors, setImportErrors] = useState<Record<string, string[]>>({});
  const [importResult, setImportResult] = useState<Record<string, { ok: number; total: number; loteImportacion?: string; escenario?: ScenarioKey }>>({});
  const today = new Date().toISOString().slice(0, 10);
  const [testBatches, setTestBatches] = useState<TestBatchSummary[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState<string | null>(null);
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("crisis");
  const [scenarioCount, setScenarioCount] = useState<number | null>(null);
  const [scenarioCountLoading, setScenarioCountLoading] = useState(false);
  const [scenarioDeleteLoading, setScenarioDeleteLoading] = useState(false);
  const [deleteDate, setDeleteDate] = useState(today);
  const [deleteCount, setDeleteCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDataDelete | null>(null);
  const [scenarioDone, setScenarioDone] = useState<Record<string, boolean>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const refreshTestBatches = useCallback(async () => {
    setBatchLoading(true);
    try {
      setTestBatches(await listTestBatches());
    } catch {
      toast.error("No se pudo cargar el historial de lotes de prueba");
    } finally {
      setBatchLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshTestBatches();
  }, [refreshTestBatches]);

  const handleCountByDate = async () => {
    if (!deleteDate) return;
    setCountLoading(true);
    try {
      const count = await countSalesUpToDate(deleteDate);
      setDeleteCount(count);
    } catch {
      toast.error("No se pudo contar los registros");
    } finally {
      setCountLoading(false);
    }
  };

  const handleDeleteByDate = async () => {
    if (!deleteDate) return;
    setPendingDelete({ type: "sales-date", date: deleteDate });
  };

  const confirmDeleteByDate = async (date: string) => {
    setDeleteLoading(true);
    try {
      const deleted = await deleteSalesUpToDate(date);
      setDeleteCount(0);
      setPendingDelete(null);
      await invalidateAICache();
      await refreshTestBatches();
      toast.success(`${deleted} registros eliminados correctamente`);
    } catch {
      toast.error("Error al eliminar los registros. Intenta de nuevo.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = async (config: CollectionConfig) => {
    setExportStatus((prev) => ({ ...prev, [config.id]: "loading" }));
    try {
      await exportCollection(config);
      setExportStatus((prev) => ({ ...prev, [config.id]: "success" }));
      toast.success(`${config.label} exportado`);
      setTimeout(() => setExportStatus((prev) => ({ ...prev, [config.id]: "idle" })), 3000);
    } catch (err) {
      setExportStatus((prev) => ({ ...prev, [config.id]: "idle" }));
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error(`Error al exportar: ${msg}`);
    }
  };

  const handleImport = async (config: CollectionConfig, file: File) => {
    setImportStatus((prev) => ({ ...prev, [config.id]: "loading" }));
    setImportErrors((prev) => ({ ...prev, [config.id]: [] }));
    setImportResult((prev) => ({ ...prev, [config.id]: { ok: 0, total: 0 } }));
    try {
      const context = createImportContext(file.name);
      const buffer = await file.arrayBuffer();
      const rows = (await readXlsxFirstSheet(buffer)) as Row[];

      if (rows.length === 0) {
        toast.error("El archivo está vacío");
        setImportStatus((prev) => ({ ...prev, [config.id]: "idle" }));
        return;
      }

      const { ok, errors } = await importRows(config, rows, context);
      setImportErrors((prev) => ({ ...prev, [config.id]: errors }));
      setImportResult((prev) => ({
        ...prev,
        [config.id]: {
          ok,
          total: rows.length,
          loteImportacion: context.loteImportacion,
          escenario: context.escenario,
        },
      }));

      if (ok > 0) {
        await invalidateAICache();
        await refreshTestBatches();
        void logAudit("importar", config.id as "producto" | "fabricante" | "venta", context.loteImportacion, config.label, {
          ok,
          total: rows.length,
          errores: errors.length,
          escenario: context.escenario,
          lote: context.loteImportacion,
        });
      }

      if (errors.length === 0) {
        setImportStatus((prev) => ({ ...prev, [config.id]: "success" }));
        toast.success(`${ok} registros importados correctamente`);
      } else {
        setImportStatus((prev) => ({ ...prev, [config.id]: "error" }));
        toast.error(`${ok} importados, ${errors.length} con errores`);
      }
    } catch {
      setImportStatus((prev) => ({ ...prev, [config.id]: "error" }));
      setImportErrors((prev) => ({
        ...prev,
        [config.id]: ["No se pudo leer el archivo. Asegúrate de que sea un .xlsx válido."],
      }));
      toast.error("Error al procesar el archivo");
    }
  };

  const handleCountScenario = async () => {
    setScenarioCountLoading(true);
    try {
      setScenarioCount(await countScenarioTestData(scenarioKey));
    } catch {
      toast.error("No se pudo contar el escenario seleccionado");
    } finally {
      setScenarioCountLoading(false);
    }
  };

  const handleDeleteScenario = async () => {
    setPendingDelete({ type: "scenario", scenario: scenarioKey });
  };

  const confirmDeleteScenario = async (scenario: ScenarioKey) => {
    setScenarioDeleteLoading(true);
    try {
      const deleted = await deleteScenarioTestData(scenario);
      setScenarioCount(0);
      setPendingDelete(null);
      await invalidateAICache();
      await refreshTestBatches();
      toast.success(`${deleted} registros del escenario ${scenarioLabel(scenario)} eliminados`);
    } catch {
      toast.error("No se pudo eliminar el escenario seleccionado");
    } finally {
      setScenarioDeleteLoading(false);
    }
  };

  const handleDeleteBatch = async (loteImportacion: string) => {
    setPendingDelete({ type: "batch", loteImportacion });
  };

  const confirmDeleteBatch = async (loteImportacion: string) => {
    setDeletingBatch(loteImportacion);
    try {
      const deleted = await deleteTestBatch(loteImportacion);
      setPendingDelete(null);
      await invalidateAICache();
      await refreshTestBatches();
      toast.success(`${deleted} registros eliminados del lote seleccionado`);
    } catch {
      toast.error("No se pudo eliminar el lote seleccionado");
    } finally {
      setDeletingBatch(null);
    }
  };

  const confirmDeleteLoading =
    (pendingDelete?.type === "sales-date" && deleteLoading) ||
    (pendingDelete?.type === "scenario" && scenarioDeleteLoading) ||
    (pendingDelete?.type === "batch" && deletingBatch === pendingDelete.loteImportacion);

  const confirmDeleteCopy = (() => {
    if (!pendingDelete) return null;
    if (pendingDelete.type === "sales-date") {
      return {
        title: "Eliminar ventas por fecha",
        confirmLabel: "Eliminar registros",
        loadingLabel: "Eliminando...",
        description: (
          <p>
            Se eliminaran permanentemente todos los registros de <strong>Ventas Diarias</strong> con fecha igual o anterior a{" "}
            <strong>{pendingDelete.date}</strong>. Esta accion no se puede deshacer.
          </p>
        ),
      };
    }
    if (pendingDelete.type === "scenario") {
      return {
        title: "Eliminar escenario de prueba",
        confirmLabel: "Eliminar escenario",
        loadingLabel: "Eliminando...",
        description: (
          <p>
            Se eliminaran los datos de prueba del escenario <strong>{scenarioLabel(pendingDelete.scenario)}</strong> en productos,
            fabricantes y ventas diarias. Esta accion no afecta datos reales.
          </p>
        ),
      };
    }
    return {
      title: "Eliminar lote de prueba",
      confirmLabel: "Eliminar lote",
      loadingLabel: "Eliminando...",
      description: (
        <p>
          Se eliminaran los datos marcados como prueba del lote <code>{pendingDelete.loteImportacion}</code>. Esta accion no se
          puede deshacer.
        </p>
      ),
    };
  })();

  const confirmPendingDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === "sales-date") {
      void confirmDeleteByDate(pendingDelete.date);
      return;
    }
    if (pendingDelete.type === "scenario") {
      void confirmDeleteScenario(pendingDelete.scenario);
      return;
    }
    void confirmDeleteBatch(pendingDelete.loteImportacion);
  };

  let testBatchesBlock: ReactNode;
  if (batchLoading) {
    testBatchesBlock = <p className="data-clean-note">Cargando lotes recientes...</p>;
  } else if (testBatches.length === 0) {
    testBatchesBlock = (
      <p className="data-clean-note">Todavía no hay lotes de prueba marcados para eliminar.</p>
    );
  } else {
    testBatchesBlock = (
      <div style={{ display: "grid", gap: "0.85rem" }}>
        {testBatches.slice(0, 8).map((batch) => (
          <div key={batch.loteImportacion} className="data-clean-actions" style={{ alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="data-card-title" style={{ fontSize: "14px", marginBottom: "0.15rem" }}>
                {scenarioLabel(batch.escenario)} — {batch.total} registros
              </p>
              <p className="data-clean-note" style={{ marginBottom: "0.3rem" }}>
                <code>{batch.loteImportacion}</code>
              </p>
              <p className="data-clean-note">
                {Object.entries(batch.counts)
                  .map(([colId, count]) => `${colId}: ${count}`)
                  .join(" · ")}
              </p>
            </div>
            <button
              type="button"
              className="btn data-btn-danger"
              disabled={deletingBatch === batch.loteImportacion}
              onClick={() => void handleDeleteBatch(batch.loteImportacion)}
            >
              {deletingBatch === batch.loteImportacion ? <Loader size={14} className="data-spin" /> : <Trash2 size={14} />}
              {deletingBatch === batch.loteImportacion ? "Eliminando..." : "Eliminar lote"}
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="pred-root">
      <div className="dash-header">
        <div>
          <p className="dash-greeting">Importación y exportación</p>
          <h1 className="dash-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileSpreadsheet size={26} /> Gestión de Datos Excel
          </h1>
        </div>
      </div>

      <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "1.5rem", maxWidth: "680px" }}>
        Exporta cualquier colección a Excel, o importa datos de prueba desde un archivo. Descarga primero
        la plantilla para ver el formato exacto que se espera.
      </p>

      <div className="data-grid">
        {COLLECTIONS.map((config) => {
          const iStatus = importStatus[config.id] ?? "idle";
          const eStatus = exportStatus[config.id] ?? "idle";
          const errors = importErrors[config.id] ?? [];
          const result = importResult[config.id];

          let exportStatusIcon: ReactNode = <Download size={15} />;
          if (eStatus === "loading") exportStatusIcon = <Loader size={15} className="data-spin" />;
          else if (eStatus === "success") exportStatusIcon = <CheckCircle size={15} />;

          let exportStatusLabel = `Exportar ${config.label}`;
          if (eStatus === "loading") exportStatusLabel = "Exportando...";
          else if (eStatus === "success") exportStatusLabel = "Descargado";

          let importStatusIcon: ReactNode = <Upload size={13} />;
          if (iStatus === "loading") importStatusIcon = <Loader size={13} className="data-spin" />;
          else if (iStatus === "success") importStatusIcon = <CheckCircle size={13} style={{ color: "#10b981" }} />;
          else if (iStatus === "error") importStatusIcon = <AlertTriangle size={13} style={{ color: "#f59e0b" }} />;

          const importButtonLabel = iStatus === "loading" ? "Importando..." : "Importar Excel";

          return (
            <div key={config.id} className="dash-card data-card">
              <div className="data-card-header">
                <FileSpreadsheet size={20} className="data-card-icon" />
                <div>
                  <h3 className="data-card-title">{config.label}</h3>
                  <p className="data-card-desc">{config.description}</p>
                </div>
              </div>

              <div className="data-card-actions">
                <button
                  type="button"
                  className="btn btn-primary data-btn"
                  disabled={eStatus === "loading"}
                  onClick={() => handleExport(config)}
                >
                  {exportStatusIcon}
                  {exportStatusLabel}
                </button>

                {config.canImport && (
                  <>
                    <div className="data-import-row">
                      <button
                        type="button"
                        className="btn data-btn-ghost"
                        onClick={() => downloadTemplate(config)}
                      >
                        <Download size={13} /> Plantilla
                      </button>
                      <button
                        type="button"
                        className="btn data-btn-ghost data-btn-import"
                        disabled={iStatus === "loading"}
                        onClick={() => fileRefs.current[config.id]?.click()}
                      >
                        {importStatusIcon}
                        {importButtonLabel}
                      </button>
                      <input
                        ref={(el) => { fileRefs.current[config.id] = el; }}
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleImport(config, file);
                          e.target.value = "";
                        }}
                      />
                    </div>

                    {result && result.total > 0 && (
                      <p className={`data-result ${errors.length === 0 ? "data-result-ok" : "data-result-warn"}`}>
                        {result.ok} de {result.total} filas importadas
                        {errors.length > 0 ? ` — ${errors.length} con errores` : " correctamente"}
                      </p>
                    )}
                    {result?.loteImportacion && (
                      <p className="data-clean-note">
                        Lote: <code>{result.loteImportacion}</code> — escenario <strong>{scenarioLabel(result.escenario)}</strong>
                      </p>
                    )}

                    {errors.length > 0 && (
                      <div className="data-errors">
                        {errors.slice(0, 8).map((err) => (
                          <p key={`${config.id}:${err}`} className="data-error-line">• {err}</p>
                        ))}
                        {errors.length > 8 && (
                          <p className="data-error-more">...y {errors.length - 8} errores más</p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {!config.canImport && (
                  <p className="data-no-import">
                    La importación no está disponible para esta colección.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="dash-card data-clean-card" style={{ marginTop: "1.5rem" }}>
        <div className="data-clean-header">
          <Trash2 size={20} className="data-clean-icon" />
          <div>
            <h3 className="data-card-title">Eliminar lotes de prueba</h3>
            <p className="data-card-desc">
              Cada importación nueva queda marcada con un lote. Elimina desde aquí solo lo que subiste para pruebas,
              sin tocar ventas reales.
            </p>
          </div>
        </div>

        {testBatchesBlock}
      </div>

      <div className="dash-card data-clean-card" style={{ marginTop: "1.5rem" }}>
        <div className="data-clean-header">
          <Trash2 size={20} className="data-clean-icon" />
          <div>
            <h3 className="data-card-title">Eliminar por escenario</h3>
            <p className="data-card-desc">
              Útil cuando probaste un escenario completo como Crisis, Normal o Buenas Ventas y quieres limpiar todo ese conjunto.
            </p>
          </div>
        </div>

        <div className="data-clean-actions">
          <select
            value={scenarioKey}
            onChange={(e) => { setScenarioKey(e.target.value as ScenarioKey); setScenarioCount(null); }}
            className="data-date-input"
          >
            {SCENARIO_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn data-btn-ghost"
            onClick={handleCountScenario}
            disabled={scenarioCountLoading || scenarioDeleteLoading}
          >
            {scenarioCountLoading ? <Loader size={14} className="data-spin" /> : <FileSpreadsheet size={14} />}
            {scenarioCount === null ? "Contar escenario" : `${scenarioCount} registros encontrados`}
          </button>
          <button
            type="button"
            className="btn data-btn-danger"
            onClick={handleDeleteScenario}
            disabled={scenarioDeleteLoading || scenarioCount === null || scenarioCount === 0}
          >
            {scenarioDeleteLoading ? <Loader size={14} className="data-spin" /> : <Trash2 size={14} />}
            {scenarioDeleteLoading ? "Eliminando..." : "Eliminar escenario"}
          </button>
        </div>

        <p className="data-clean-note">
          Este borrado afecta datos marcados como prueba en <code>productos</code>, <code>fabricantes</code> y <code>ventasDiarias</code>.
        </p>
      </div>

      <div className="dash-card data-clean-card">
        <div className="data-clean-header">
          <Trash2 size={20} className="data-clean-icon" />
          <div>
            <h3 className="data-card-title">Eliminar ventas hasta una fecha</h3>
            <p className="data-card-desc">
              Elimina todos los registros de Ventas Diarias con fecha igual o anterior a la seleccionada.
              Se borran permanentemente de Supabase.
            </p>
          </div>
        </div>

        <div className="data-clean-actions">
          <input
            type="date"
            value={deleteDate}
            max={today}
            onChange={(e) => { setDeleteDate(e.target.value); setDeleteCount(null); }}
            className="data-date-input"
          />
          <button
            type="button"
            className="btn data-btn-ghost"
            onClick={handleCountByDate}
            disabled={!deleteDate || countLoading || deleteLoading}
          >
            {countLoading ? <Loader size={14} className="data-spin" /> : <FileSpreadsheet size={14} />}
            {deleteCount === null
              ? "Contar registros"
              : `${deleteCount} registros encontrados`}
          </button>
          <button
            type="button"
            className="btn data-btn-danger"
            onClick={handleDeleteByDate}
            disabled={!deleteDate || deleteLoading || deleteCount === 0}
          >
            {deleteLoading ? <Loader size={14} className="data-spin" /> : <Trash2 size={14} />}
            {deleteLoading ? "Eliminando..." : "Eliminar registros"}
          </button>
        </div>

        <p className="data-clean-note">
          Solo afecta la colección <code>ventasDiarias</code>. Productos, pedidos y usuarios no se modifican.
        </p>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "0.35rem" }}>
          Escenarios de prueba
        </h2>
        <p className="data-clean-note" style={{ marginBottom: "1.25rem" }}>
          Cada escenario descarga <strong>3 archivos</strong>: productos, finanzas del producto y
          ventas diarias con ~500 registros. Importa en este orden: <strong>productos</strong>,
          luego <strong>finanzas de producto</strong> y por último <strong>ventas diarias</strong>.
          Los IDs ya vienen enlazados.
        </p>

        <div className="data-grid">
          {SCENARIOS.map((sc) => (
            <div key={sc.key} className="dash-card data-card">
              <div className="data-card-header">
                <span
                  style={{
                    width: 12, height: 12, borderRadius: "50%",
                    background: sc.color, flexShrink: 0, marginTop: 4,
                  }}
                />
                <div>
                  <h3 className="data-card-title">{sc.label}</h3>
                  <p className="data-card-desc">{sc.detail}</p>
                </div>
              </div>
              <div className="data-card-actions" style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn btn-primary data-btn"
                  onClick={() => {
                    downloadScenario(sc);
                    setScenarioDone((prev) => ({ ...prev, [sc.key]: true }));
                  }}
                >
                  {scenarioDone[sc.key] ? <CheckCircle size={14} /> : <Download size={14} />}
                  {scenarioDone[sc.key]
                    ? "Descargado"
                    : `Descargar escenario ${sc.label}`}
                </button>
                <p className="data-clean-note" style={{ marginTop: "0.5rem" }}>
                  Archivos: <code>productos_{sc.key}.xlsx</code> y <code>ventas_{sc.key}.xlsx</code>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {pendingDelete && confirmDeleteCopy && (
        <AccessibleConfirmDialog
          title={confirmDeleteCopy.title}
          description={confirmDeleteCopy.description}
          confirmLabel={confirmDeleteCopy.confirmLabel}
          loadingLabel={confirmDeleteCopy.loadingLabel}
          loading={confirmDeleteLoading}
          onCancel={() => {
            if (!confirmDeleteLoading) setPendingDelete(null);
          }}
          onConfirm={confirmPendingDelete}
        />
      )}
    </div>
  );
}
