import { useCallback, useEffect, useRef, useState } from "react";
import { read, utils, writeFile } from "xlsx";
import { AlertTriangle, CheckCircle, Download, FileSpreadsheet, Loader, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type ImportStatus = "idle" | "loading" | "success" | "error";
type ExportStatus = "idle" | "loading" | "success";

type Row = Record<string, unknown>;
type ScenarioKey = "crisis" | "normal" | "buenas" | "general";

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
}

const AI_BASE = import.meta.env.VITE_AI_SERVICE_URL ?? "http://localhost:8000";
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

function createImportContext(fileName: string): ImportContext {
  const importadoEn = new Date().toISOString();
  const escenario = inferScenario(fileName);
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "archivo";
  const stamp = importadoEn.replace(/\D/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6);
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

async function invalidateAICache(): Promise<void> {
  try {
    await fetch(`${AI_BASE}/api/cache/invalidate`, { method: "POST" });
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
    templateHeaders: ["codigo", "nombre", "precio", "stock", "categoria", "descripcion", "marca", "color", "destacado"],
    templateExample: {
      codigo: "CV-001",
      nombre: "Zapatilla Deportiva",
      precio: 89.90,
      stock: 10,
      categoria: "Deportivo",
      descripcion: "Descripcion del producto (opcional)",
      marca: "Nike",
      color: "Negro",
      destacado: false,
    },
    extraData: async () => {
      const { data } = await supabase.from("productoCodigos").select("productoId, codigo");
      return (data ?? []).reduce<Record<string, string>>((acc, d) => {
        if (d.codigo) acc[d.productoId] = d.codigo;
        return acc;
      }, {});
    },
    exportTransform: (d, extra) => ({
      id: d.id ?? "",
      codigo: (extra as Record<string, string> | undefined)?.[String(d.id)] ?? "",
      nombre: d.nombre ?? "",
      precio: d.precio ?? 0,
      stock: d.stock ?? 0,
      categoria: d.categoria ?? "",
      descripcion: d.descripcion ?? "",
      marca: d.marca ?? "",
      color: d.color ?? "",
      destacado: d.destacado ?? false,
    }),
    importTransform: (row, context) => ({
      nombre: String(row.nombre ?? "").trim(),
      precio: Number(row.precio ?? 0),
      stock: Number(row.stock ?? 0),
      categoria: String(row.categoria ?? "").trim(),
      descripcion: String(row.descripcion ?? "").trim(),
      marca: String(row.marca ?? "").trim(),
      color: String(row.color ?? "").trim(),
      destacado: String(row.destacado).toLowerCase() === "true",
      imagen: "",
      imagenes: [],
      esDePrueba: true,
      importadoEn: context.importadoEn,
      loteImportacion: context.loteImportacion,
      escenario: context.escenario,
    }),
    importValidate: (row) => {
      if (!row.nombre) return "Falta el campo 'nombre'";
      if (row.precio === undefined || isNaN(Number(row.precio))) return "El campo 'precio' debe ser un número";
      if (row.stock === undefined || isNaN(Number(row.stock))) return "El campo 'stock' debe ser un número";
      if (!row.categoria) return "Falta el campo 'categoria'";
      return null;
    },
    importDocId: (row) => (typeof row.id === "string" && row.id ? row.id : null),
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
      id: d.id ?? "",
      dni: d.dni ?? "",
      nombres: d.nombres ?? "",
      apellidos: d.apellidos ?? "",
      marca: d.marca ?? "",
      telefono: d.telefono ?? "",
      activo: d.activo ?? true,
      observaciones: d.observaciones ?? "",
      creadoEn: d.creadoEn ?? "",
    }),
    importTransform: (row, context) => ({
      dni: String(row.dni ?? "").trim(),
      nombres: String(row.nombres ?? "").trim(),
      apellidos: String(row.apellidos ?? "").trim(),
      marca: String(row.marca ?? "").trim(),
      telefono: String(row.telefono ?? "").trim(),
      observaciones: String(row.observaciones ?? "").trim(),
      activo: true,
      creadoEn: context.importadoEn,
      actualizadoEn: context.importadoEn,
      esDePrueba: true,
      importadoEn: context.importadoEn,
      loteImportacion: context.loteImportacion,
      escenario: context.escenario,
    }),
    importValidate: (row) => {
      const dni = String(row.dni ?? "").replace(/\D/g, "");
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
      productId: "ID_PRODUCTO_FIRESTORE",
      codigo: "CV-001",
      nombre: "Zapatilla Deportiva",
      color: "Negro",
      talla: "40",
      fecha: "2026-04-20",
      cantidad: 2,
      precioVenta: 89.90,
      total: 179.80,
      costoUnitario: 60.00,
      costoTotal: 120.00,
      ganancia: 59.80,
      documentoTipo: "ninguno",
      documentoNumero: "",
    },
    exportTransform: (d) => ({
      id: d.id ?? "",
      productId: d.productId ?? "",
      codigo: d.codigo ?? "",
      nombre: d.nombre ?? "",
      color: d.color ?? "",
      talla: d.talla ?? "",
      fecha: d.fecha ?? "",
      cantidad: d.cantidad ?? 0,
      precioVenta: d.precioVenta ?? 0,
      total: d.total ?? 0,
      costoUnitario: d.costoUnitario ?? 0,
      costoTotal: d.costoTotal ?? 0,
      ganancia: d.ganancia ?? 0,
      documentoTipo: d.documentoTipo ?? "ninguno",
      documentoNumero: d.documentoNumero ?? "",
      devuelto: d.devuelto ?? false,
      creadoEn: d.creadoEn ?? "",
    }),
    importTransform: (row, context) => ({
      productId: String(row.productId ?? "").trim(),
      codigo: String(row.codigo ?? "").trim(),
      nombre: String(row.nombre ?? "").trim(),
      color: String(row.color ?? "").trim(),
      talla: String(row.talla ?? "").trim(),
      fecha: String(row.fecha ?? "").trim(),
      cantidad: Number(row.cantidad ?? 0),
      precioVenta: Number(row.precioVenta ?? 0),
      total: Number(row.total ?? 0),
      costoUnitario: Number(row.costoUnitario ?? 0),
      costoTotal: Number(row.costoTotal ?? 0),
      ganancia: Number(row.ganancia ?? 0),
      documentoTipo: String(row.documentoTipo ?? "ninguno").trim(),
      documentoNumero: String(row.documentoNumero ?? "").trim(),
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
      if (row.cantidad === undefined || isNaN(Number(row.cantidad))) return "El campo 'cantidad' debe ser un número";
      if (row.precioVenta === undefined || isNaN(Number(row.precioVenta))) return "El campo 'precioVenta' debe ser un número";
      if (row.total === undefined || isNaN(Number(row.total))) return "El campo 'total' debe ser un número";
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
    exportTransform: (d) => {
      const creadoEn = d.creadoEn;
      const fecha =
        creadoEn !== null &&
        typeof creadoEn === "object" &&
        "toDate" in (creadoEn as object)
          ? (creadoEn as { toDate(): Date }).toDate().toISOString()
          : String(creadoEn ?? "");
      return {
        id: d.id ?? "",
        userId: d.userId ?? "",
        userEmail: d.userEmail ?? "",
        total: d.total ?? 0,
        subtotal: d.subtotal ?? 0,
        envio: d.envio ?? 0,
        estado: d.estado ?? "",
        metodoPago: d.metodoPago ?? "",
        notas: d.notas ?? "",
        creadoEn: fecha,
      };
    },
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
      uid: d.uid ?? d.id ?? "",
      dni: d.dni ?? "",
      nombre: d.nombre ?? "",
      email: d.email ?? "",
      rol: d.rol ?? "",
      telefono: d.telefono ?? "",
      creadoEn: d.creadoEn ?? "",
    }),
    importTransform: () => ({}),
    importValidate: () => null,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function exportCollection(config: CollectionConfig): Promise<void> {
  const [{ data: docs }, extra] = await Promise.all([
    supabase.from(config.id).select("*"),
    config.extraData ? config.extraData() : Promise.resolve({}),
  ]);
  const rows = (docs ?? []).map((d) => config.exportTransform(d as Row, extra));
  if (rows.length === 0) throw new Error("La colección está vacía");
  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, config.label);
  writeFile(wb, `${config.id}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function downloadTemplate(config: CollectionConfig): void {
  const ws = utils.json_to_sheet([config.templateExample]);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Plantilla");
  writeFile(wb, `plantilla_${config.id}.xlsx`);
}

async function importRows(
  config: CollectionConfig,
  rows: Row[],
  context: ImportContext,
): Promise<{ ok: number; errors: string[] }> {
  const errors: string[] = [];
  const validRows: { data: Row; docId: string | null; source: Row }[] = [];

  rows.forEach((row, i) => {
    const err = config.importValidate(row);
    if (err) {
      errors.push(`Fila ${i + 2}: ${err}`);
    } else {
      const docId = config.importDocId ? config.importDocId(row) : null;
      validRows.push({ data: config.importTransform(row, context), docId, source: row });
    }
  });

  const CHUNK = 500;
  for (let i = 0; i < validRows.length; i += CHUNK) {
    const chunk = validRows.slice(i, i + CHUNK);
    const rowsToInsert = chunk.map(({ data, docId }) =>
      docId ? { ...data, id: docId } : data
    );
    const { error } = await supabase.from(config.id).upsert(rowsToInsert as object[]);
    if (error) throw error;

    if (config.id === "productos") {
      const codes = chunk
        .filter(({ source }) => String(source.codigo ?? "").trim())
        .map(({ data, docId, source }) => ({
          productoId: docId ?? (data as Record<string, unknown>).id,
          codigo: String(source.codigo ?? "").trim(),
          actualizadoEn: context.importadoEn,
        }));
      if (codes.length > 0) {
        await supabase.from("productoCodigos").upsert(codes, { onConflict: "productoId" });
      }
    }
  }

  return { ok: validRows.length, errors };
}

const IMPORTABLE_COLLECTIONS = COLLECTIONS.filter((item) => item.canImport).map((item) => item.id);

async function fetchTestDocs() {
  const results = await Promise.all(
    IMPORTABLE_COLLECTIONS.map(async (colId) => {
      const { data } = await supabase.from(colId).select("*").eq("esDePrueba", true);
      return (data ?? []).map((item) => ({ colId, data: item as Row }));
    })
  );
  return results.flat();
}

async function listTestBatches(): Promise<TestBatchSummary[]> {
  const docs = await fetchTestDocs();
  const grouped = new Map<string, TestBatchSummary>();

  docs.forEach(({ colId, data }) => {
    const loteImportacion = String(data.loteImportacion ?? "").trim();
    if (!loteImportacion) return;

    const current = grouped.get(loteImportacion) ?? {
      loteImportacion,
      escenario: (String(data.escenario ?? "general").trim() || "general") as ScenarioKey,
      importadoEn: String(data.importadoEn ?? data.creadoEn ?? ""),
      total: 0,
      counts: {},
    };

    current.total += 1;
    current.counts[colId] = (current.counts[colId] ?? 0) + 1;
    if (!current.importadoEn) current.importadoEn = String(data.importadoEn ?? data.creadoEn ?? "");
    grouped.set(loteImportacion, current);
  });

  return Array.from(grouped.values()).sort((a, b) => b.importadoEn.localeCompare(a.importadoEn));
}

async function countScenarioTestData(escenario: ScenarioKey): Promise<number> {
  const docs = await fetchTestDocs();
  return docs.filter(({ data }) => String(data.escenario ?? "general").trim() === escenario).length;
}

async function deleteScenarioTestData(escenario: ScenarioKey): Promise<number> {
  const docs = await fetchTestDocs();
  const targets = docs.filter(({ data }) => String(data.escenario ?? "general").trim() === escenario);
  await Promise.all(
    IMPORTABLE_COLLECTIONS.map((colId) =>
      supabase.from(colId).delete().eq("esDePrueba", true).eq("escenario", escenario)
    )
  );
  return targets.length;
}

async function deleteTestBatch(loteImportacion: string): Promise<number> {
  const docs = await fetchTestDocs();
  const targets = docs.filter(({ data }) => String(data.loteImportacion ?? "").trim() === loteImportacion);
  await Promise.all(
    IMPORTABLE_COLLECTIONS.map((colId) =>
      supabase.from(colId).delete().eq("esDePrueba", true).eq("loteImportacion", loteImportacion)
    )
  );
  return targets.length;
}

// ── Eliminación por fecha ─────────────────────────────────────────────────────

async function countSalesUpToDate(dateStr: string): Promise<number> {
  const { count } = await supabase
    .from("ventasDiarias")
    .select("*", { count: "exact", head: true })
    .lte("fecha", dateStr);
  return count ?? 0;
}

async function deleteSalesUpToDate(dateStr: string): Promise<number> {
  const total = await countSalesUpToDate(dateStr);
  const { error } = await supabase.from("ventasDiarias").delete().lte("fecha", dateStr);
  if (error) throw error;
  return total;
}

// ── Escenarios de prueba (≈ 500 filas c/u) ───────────────────────────────────

const BASE_PRODUCTS = [
  { id: "PRUEBA_CV001", nombre: "Zapatilla Running Pro",  precio: 119.90, costo: 75.00,  cat: "Deportivo", marca: "Adidas",     color: "Azul",   talla: "40", baseProb: 0.65, minQ: 1, maxQ: 3 },
  { id: "PRUEBA_CV002", nombre: "Bota de Cuero Casual",   precio: 159.90, costo: 95.00,  cat: "Casual",    marca: "Clarks",     color: "Marrón", talla: "42", baseProb: 0.50, minQ: 1, maxQ: 2 },
  { id: "PRUEBA_CV003", nombre: "Sandalia Verano",        precio:  49.90, costo: 28.00,  cat: "Casual",    marca: "Crocs",      color: "Beige",  talla: "38", baseProb: 0.45, minQ: 1, maxQ: 4 },
  { id: "PRUEBA_CV004", nombre: "Mocasín Ejecutivo",      precio: 129.90, costo: 80.00,  cat: "Formal",    marca: "Bata",       color: "Negro",  talla: "41", baseProb: 0.55, minQ: 1, maxQ: 2 },
  { id: "PRUEBA_CV005", nombre: "Zapatilla Escolar",      precio:  79.90, costo: 50.00,  cat: "Escolar",   marca: "Kolosh",     color: "Blanco", talla: "36", baseProb: 0.60, minQ: 1, maxQ: 3 },
  { id: "PRUEBA_CV006", nombre: "Bota Urbana Negra",      precio: 189.90, costo: 120.00, cat: "Urbano",    marca: "Timberland", color: "Negro",  talla: "43", baseProb: 0.40, minQ: 1, maxQ: 2 },
  { id: "PRUEBA_CV007", nombre: "Zapato Formal Clásico",  precio: 149.90, costo: 90.00,  cat: "Formal",    marca: "Bata",       color: "Café",   talla: "40", baseProb: 0.45, minQ: 1, maxQ: 2 },
  { id: "PRUEBA_CV008", nombre: "Chancleta Playera",      precio:  29.90, costo: 15.00,  cat: "Playa",     marca: "Rider",      color: "Verde",  talla: "39", baseProb: 0.55, minQ: 1, maxQ: 5 },
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
  stocks: readonly number[];
}

// Stock por producto: CV001..CV008
// Crisis → mucho stock acumulado (no se vende)
// Normal → stock moderado
// Buenas ventas → stock casi agotado (alta demanda)
const SCENARIOS: ScenarioCfg[] = [
  {
    key: "crisis",
    label: "Crisis",
    color: "#ef4444",
    detail: "180 días · ventas bajas · precios con 10% descuento · ~500 filas",
    days: 180,
    probMult: 0.70,
    qtyMult: 0.7,
    priceDiscount: 0.10,
    stocks: [85, 62, 94, 47, 71, 53, 39, 110],
  },
  {
    key: "normal",
    label: "Normal",
    color: "#f59e0b",
    detail: "90 días · ventas regulares · precios normales · ~500 filas",
    days: 90,
    probMult: 1.35,
    qtyMult: 1.0,
    priceDiscount: 0,
    stocks: [22, 15, 30, 18, 28, 25, 16, 40],
  },
  {
    key: "buenas",
    label: "Buenas Ventas",
    color: "#10b981",
    detail: "70 días · temporada alta · alta demanda · stock en riesgo · ~500 filas",
    days: 70,
    probMult: 2.0,
    qtyMult: 1.5,
    priceDiscount: 0,
    stocks: [4, 2, 8, 5, 3, 7, 1, 12],
  },
];

function detRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function downloadScenario(sc: ScenarioCfg): void {
  // ① Productos con stock según escenario
  const productRows = BASE_PRODUCTS.map((p, i) => {
    const precio = sc.priceDiscount > 0
      ? Math.round(p.precio * (1 - sc.priceDiscount) * 100) / 100
      : p.precio;
    return {
      id: p.id,
      codigo: p.id.replace("PRUEBA_", ""),
      nombre: p.nombre,
      precio,
      stock: sc.stocks[i],
      categoria: p.cat,
      descripcion: `Producto de prueba — escenario ${sc.label}`,
      marca: p.marca,
      color: p.color,
      destacado: false,
    };
  });
  const wbP = utils.book_new();
  utils.book_append_sheet(wbP, utils.json_to_sheet(productRows), "Productos");
  writeFile(wbP, `productos_${sc.key}.xlsx`);

  // ② Ventas diarias (~500 filas)
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
        const prob = Math.min(0.97, p.baseProb * sc.probMult);
        if (detRand(seed) < prob) {
          const rawQty = p.minQ + detRand(seed + 50) * (p.maxQ - p.minQ);
          const qty = Math.max(1, Math.round(rawQty * sc.qtyMult));
          const precio = sc.priceDiscount > 0
            ? Math.round(p.precio * (1 - sc.priceDiscount) * 100) / 100
            : p.precio;
          const total  = Math.round(qty * precio   * 100) / 100;
          const costoT = Math.round(qty * p.costo  * 100) / 100;
          salesRows.push({
            productId: p.id,
            codigo: p.id.replace("PRUEBA_", ""),
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

    const wbV = utils.book_new();
    utils.book_append_sheet(wbV, utils.json_to_sheet(salesRows), "Ventas Diarias");
    writeFile(wbV, `ventas_${sc.key}.xlsx`);
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
    if (!window.confirm(`¿Eliminar TODOS los registros de Ventas Diarias con fecha hasta el ${deleteDate}? Esta acción no se puede deshacer.`)) return;
    setDeleteLoading(true);
    try {
      const deleted = await deleteSalesUpToDate(deleteDate);
      setDeleteCount(0);
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
      const wb = read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json<Row>(ws);

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
    if (!window.confirm(`Â¿Eliminar todos los datos de prueba del escenario ${scenarioLabel(scenarioKey)}?`)) return;
    setScenarioDeleteLoading(true);
    try {
      const deleted = await deleteScenarioTestData(scenarioKey);
      setScenarioCount(0);
      await invalidateAICache();
      await refreshTestBatches();
      toast.success(`${deleted} registros del escenario ${scenarioLabel(scenarioKey)} eliminados`);
    } catch {
      toast.error("No se pudo eliminar el escenario seleccionado");
    } finally {
      setScenarioDeleteLoading(false);
    }
  };

  const handleDeleteBatch = async (loteImportacion: string) => {
    if (!window.confirm(`Â¿Eliminar el lote ${loteImportacion}? Solo se borrarÃ¡n datos marcados como prueba.`)) return;
    setDeletingBatch(loteImportacion);
    try {
      const deleted = await deleteTestBatch(loteImportacion);
      await invalidateAICache();
      await refreshTestBatches();
      toast.success(`${deleted} registros eliminados del lote seleccionado`);
    } catch {
      toast.error("No se pudo eliminar el lote seleccionado");
    } finally {
      setDeletingBatch(null);
    }
  };

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
                  {eStatus === "loading" ? (
                    <Loader size={15} className="data-spin" />
                  ) : eStatus === "success" ? (
                    <CheckCircle size={15} />
                  ) : (
                    <Download size={15} />
                  )}
                  {eStatus === "loading"
                    ? "Exportando..."
                    : eStatus === "success"
                    ? "Descargado"
                    : `Exportar ${config.label}`}
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
                        {iStatus === "loading" ? (
                          <Loader size={13} className="data-spin" />
                        ) : iStatus === "success" ? (
                          <CheckCircle size={13} style={{ color: "#10b981" }} />
                        ) : iStatus === "error" ? (
                          <AlertTriangle size={13} style={{ color: "#f59e0b" }} />
                        ) : (
                          <Upload size={13} />
                        )}
                        {iStatus === "loading" ? "Importando..." : "Importar Excel"}
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
                        Lote: <code>{result.loteImportacion}</code> â€” escenario <strong>{scenarioLabel(result.escenario)}</strong>
                      </p>
                    )}

                    {errors.length > 0 && (
                      <div className="data-errors">
                        {errors.slice(0, 8).map((err, i) => (
                          <p key={i} className="data-error-line">• {err}</p>
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
              Cada importaciÃ³n nueva queda marcada con un lote. Elimina desde aquÃ­ solo lo que subiste para pruebas,
              sin tocar ventas reales.
            </p>
          </div>
        </div>

        {batchLoading ? (
          <p className="data-clean-note">Cargando lotes recientes...</p>
        ) : testBatches.length === 0 ? (
          <p className="data-clean-note">TodavÃ­a no hay lotes de prueba marcados para eliminar.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.85rem" }}>
            {testBatches.slice(0, 8).map((batch) => (
              <div key={batch.loteImportacion} className="data-clean-actions" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="data-card-title" style={{ fontSize: "14px", marginBottom: "0.15rem" }}>
                    {scenarioLabel(batch.escenario)} â€” {batch.total} registros
                  </p>
                  <p className="data-clean-note" style={{ marginBottom: "0.3rem" }}>
                    <code>{batch.loteImportacion}</code>
                  </p>
                  <p className="data-clean-note">
                    {Object.entries(batch.counts)
                      .map(([colId, count]) => `${colId}: ${count}`)
                      .join(" Â· ")}
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
        )}
      </div>

      <div className="dash-card data-clean-card" style={{ marginTop: "1.5rem" }}>
        <div className="data-clean-header">
          <Trash2 size={20} className="data-clean-icon" />
          <div>
            <h3 className="data-card-title">Eliminar por escenario</h3>
            <p className="data-card-desc">
              Ãštil cuando probaste un escenario completo como Crisis, Normal o Buenas Ventas y quieres limpiar todo ese conjunto.
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

      {/* Eliminar ventas por fecha */}
      <div className="dash-card data-clean-card">
        <div className="data-clean-header">
          <Trash2 size={20} className="data-clean-icon" />
          <div>
            <h3 className="data-card-title">Eliminar ventas hasta una fecha</h3>
            <p className="data-card-desc">
              Elimina todos los registros de Ventas Diarias con fecha igual o anterior a la seleccionada.
              Se borran permanentemente de Firebase.
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

      {/* Escenarios de prueba descargables */}
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "0.35rem" }}>
          Escenarios de prueba
        </h2>
        <p className="data-clean-note" style={{ marginBottom: "1.25rem" }}>
          Cada escenario descarga <strong>2 archivos</strong>: productos con el stock correspondiente y
          ventas diarias con ~500 registros. Importa primero los productos y luego las ventas.
          Los IDs ya están enlazados.
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
    </div>
  );
}
