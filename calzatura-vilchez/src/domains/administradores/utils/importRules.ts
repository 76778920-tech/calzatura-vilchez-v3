// Lógica pura de validación y transformación para importación de Excel.
// Sin dependencias de Firebase ni React — 100% testeable.

export type Row = Record<string, unknown>;
export type ScenarioKey = "crisis" | "normal" | "buenas" | "general";

export interface ImportContext {
  fileName: string;
  importadoEn: string;
  loteImportacion: string;
  escenario: ScenarioKey;
}

function normalizeImportId(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/[\\/]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

export function deriveProductImportId(row: Row): string | null {
  const explicitId = normalizeImportId(row.id);
  if (explicitId) return explicitId;
  const fromProductId = normalizeImportId(row.productId);
  if (fromProductId) return fromProductId;
  const fromCode = normalizeImportId(row.codigo);
  return fromCode || null;
}

// ── Escenario ─────────────────────────────────────────────────────────────────

export function inferScenario(fileName: string): ScenarioKey {
  const n = fileName.toLowerCase();
  if (n.includes("crisis")) return "crisis";
  if (n.includes("normal")) return "normal";
  if (n.includes("buenas") || n.includes("buenas_ventas") || n.includes("alta")) return "buenas";
  return "general";
}

export const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  crisis: "Crisis",
  normal: "Normal",
  buenas: "Buenas Ventas",
  general: "General",
};

export function scenarioLabel(key: string | null | undefined): string {
  return SCENARIO_LABELS[key as ScenarioKey] ?? "General";
}

// ── Productos ─────────────────────────────────────────────────────────────────

export function validateProducto(row: Row): string | null {
  if (!deriveProductImportId(row)) return "Debes incluir 'id' o 'codigo' para identificar el producto";
  if (!row.nombre) return "Falta el campo 'nombre'";
  if (row.precio === undefined || isNaN(Number(row.precio)))
    return "El campo 'precio' debe ser un número";
  if (row.stock === undefined || isNaN(Number(row.stock)))
    return "El campo 'stock' debe ser un número";
  if (!row.categoria) return "Falta el campo 'categoria'";
  return null;
}

export function transformProducto(row: Row, ctx: ImportContext): Row {
  return {
    codigo: String(row.codigo ?? "").trim(),
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
    importadoEn: ctx.importadoEn,
    loteImportacion: ctx.loteImportacion,
    escenario: ctx.escenario,
  };
}

// ── Fabricantes ───────────────────────────────────────────────────────────────

export function validateFabricante(row: Row): string | null {
  const dni = String(row.dni ?? "").replace(/\D/g, "");
  if (dni.length !== 8) return "El DNI debe tener exactamente 8 dígitos";
  if (!row.nombres) return "Falta el campo 'nombres'";
  if (!row.apellidos) return "Falta el campo 'apellidos'";
  if (!row.marca) return "Falta el campo 'marca'";
  return null;
}

export function transformFabricante(row: Row, ctx: ImportContext): Row {
  return {
    dni: String(row.dni ?? "").trim(),
    nombres: String(row.nombres ?? "").trim(),
    apellidos: String(row.apellidos ?? "").trim(),
    marca: String(row.marca ?? "").trim(),
    telefono: String(row.telefono ?? "").trim(),
    observaciones: String(row.observaciones ?? "").trim(),
    activo: true,
    creadoEn: ctx.importadoEn,
    actualizadoEn: ctx.importadoEn,
    esDePrueba: true,
    importadoEn: ctx.importadoEn,
    loteImportacion: ctx.loteImportacion,
    escenario: ctx.escenario,
  };
}

// ── Ventas Diarias ────────────────────────────────────────────────────────────

export function validateVentaDiaria(row: Row): string | null {
  if (!row.productId) return "Falta el campo 'productId'";
  if (!row.fecha) return "Falta el campo 'fecha'";
  if (row.cantidad === undefined || isNaN(Number(row.cantidad)))
    return "El campo 'cantidad' debe ser un número";
  if (row.precioVenta === undefined || isNaN(Number(row.precioVenta)))
    return "El campo 'precioVenta' debe ser un número";
  if (row.total === undefined || isNaN(Number(row.total)))
    return "El campo 'total' debe ser un número";
  return null;
}

export function transformVentaDiaria(row: Row, ctx: ImportContext): Row {
  return {
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
    creadoEn: ctx.importadoEn,
    esDePrueba: true,
    importadoEn: ctx.importadoEn,
    loteImportacion: ctx.loteImportacion,
    escenario: ctx.escenario,
  };
}
