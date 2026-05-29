// Lógica pura de validación y transformación para importación de Excel.
// Sin dependencias de Firebase ni React — 100% testeable.

import {
  CATEGORIAS,
  MATERIAL_PRESETS,
  STYLE_OPTIONS,
  footwearTypesForCategory,
  materialIsAllowed,
  styleIsAllowedForType,
} from "@/domains/productos/utils/commercialRules";

export type Row = Record<string, unknown>;
export type ScenarioKey = "crisis" | "normal" | "buenas" | "general";

export interface ImportContext {
  fileName: string;
  importadoEn: string;
  loteImportacion: string;
  escenario: ScenarioKey;
}

function cellText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  if (value instanceof Date) return value.toISOString();
  return fallback;
}

function normalizeImportId(value: unknown): string {
  return cellText(value)
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

function parseJsonCell<T>(value: unknown, fallback: T): T {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(cellText(value)) as T;
  } catch {
    return fallback;
  }
}

function parseStringArrayCell(value: unknown): string[] {
  const parsed = parseJsonCell<unknown>(value, []);
  if (Array.isArray(parsed)) {
    return parsed.map((item) => cellText(item).trim()).filter(Boolean);
  }
  return cellText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumberMapCell(value: unknown): Record<string, number> {
  const parsed = parseJsonCell<Record<string, unknown>>(value, {});
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return Object.fromEntries(
    Object.entries(parsed).map(([key, amount]) => [cellText(key).trim(), Number(cellText(amount) || 0)])
  );
}

function parseColorStockCell(row: Row): Record<string, Record<string, number>> {
  const parsed = parseJsonCell<Record<string, Record<string, number>>>(row.colorStock, {});
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
    return parsed;
  }
  const color = cellText(row.color).trim();
  const tallaStock = parseNumberMapCell(row.tallaStock);
  return color && Object.keys(tallaStock).length > 0 ? { [color]: tallaStock } : {};
}

function parseBooleanCell(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  const normalized = cellText(value).trim().toLowerCase();
  if (!normalized) return fallback;
  if (["true", "1", "si", "sÃ­", "yes", "activo"].includes(normalized)) return true;
  if (["false", "0", "no", "inactivo"].includes(normalized)) return false;
  return fallback;
}

function parseDiscountCell(value: unknown): 10 | 20 | 30 | undefined {
  const discount = Number(cellText(value).trim());
  return discount === 10 || discount === 20 || discount === 30 ? discount : undefined;
}

function validateCommercialImportRow(row: Row): string | null {
  const categoria = cellText(row.categoria).trim();
  const tipoCalzado = cellText(row.tipoCalzado).trim();
  const material = cellText(row.material).trim();
  const estilos = cellText(row.estilo)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!CATEGORIAS.includes(categoria)) return `La categoria debe ser una de: ${CATEGORIAS.join(", ")}`;
  if (!tipoCalzado) return "Falta el campo 'tipoCalzado'";
  if (!footwearTypesForCategory(categoria).includes(tipoCalzado)) {
    return `El tipoCalzado '${tipoCalzado}' no corresponde a la categoria '${categoria}'`;
  }
  if (material && !materialIsAllowed(material)) return `El material debe ser uno de: ${MATERIAL_PRESETS.join(", ")}`;
  for (const estilo of estilos) {
    if (!STYLE_OPTIONS.includes(estilo as (typeof STYLE_OPTIONS)[number])) {
      return `El estilo debe ser uno de: ${STYLE_OPTIONS.join(", ")}`;
    }
    if (!styleIsAllowedForType(tipoCalzado, estilo)) {
      return `El estilo '${estilo}' no corresponde al tipoCalzado '${tipoCalzado}'`;
    }
  }
  return null;
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
  if (row.precio === undefined || Number.isNaN(Number(row.precio)))
    return "El campo 'precio' debe ser un número";
  if (row.stock === undefined || Number.isNaN(Number(row.stock)))
    return "El campo 'stock' debe ser un número";
  if (!row.categoria) return "Falta el campo 'categoria'";
  if (Number(row.precio) <= 0) return "El campo 'precio' debe ser mayor que cero";
  if (Number(row.stock) < 0) return "El campo 'stock' no puede ser negativo";
  return validateCommercialImportRow(row);
}

export function transformProducto(row: Row, ctx: ImportContext): Row {
  return {
    codigo: cellText(row.codigo).trim(),
    nombre: cellText(row.nombre).trim(),
    precio: Number(row.precio ?? 0),
    stock: Number(row.stock ?? 0),
    categoria: cellText(row.categoria).trim(),
    tipoCalzado: cellText(row.tipoCalzado).trim(),
    descripcion: cellText(row.descripcion).trim(),
    marca: cellText(row.marca).trim(),
    material: cellText(row.material).trim() || undefined,
    estilo: cellText(row.estilo).trim() || undefined,
    color: cellText(row.color).trim(),
    familiaId: cellText(row.familiaId).trim() || undefined,
    tallas: parseStringArrayCell(row.tallas),
    tallaStock: parseNumberMapCell(row.tallaStock),
    colorStock: parseColorStockCell(row),
    destacado: parseBooleanCell(row.destacado),
    activo: parseBooleanCell(row.activo, true),
    descuento: parseDiscountCell(row.descuento),
    campana: cellText(row.campana).trim() || undefined,
    imagen: cellText(row.imagen).trim(),
    imagenes: parseStringArrayCell(row.imagenes),
    esDePrueba: true,
    importadoEn: ctx.importadoEn,
    loteImportacion: ctx.loteImportacion,
    escenario: ctx.escenario,
  };
}

// ── Fabricantes ───────────────────────────────────────────────────────────────

export function validateFabricante(row: Row): string | null {
  const dni = cellText(row.dni).replace(/\D/g, "");
  if (dni.length !== 8) return "El DNI debe tener exactamente 8 dígitos";
  if (!row.nombres) return "Falta el campo 'nombres'";
  if (!row.apellidos) return "Falta el campo 'apellidos'";
  if (!row.marca) return "Falta el campo 'marca'";
  return null;
}

export function transformFabricante(row: Row, ctx: ImportContext): Row {
  return {
    dni: cellText(row.dni).trim(),
    nombres: cellText(row.nombres).trim(),
    apellidos: cellText(row.apellidos).trim(),
    marca: cellText(row.marca).trim(),
    telefono: cellText(row.telefono).trim(),
    observaciones: cellText(row.observaciones).trim(),
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
  if (row.cantidad === undefined || Number.isNaN(Number(row.cantidad)))
    return "El campo 'cantidad' debe ser un número";
  if (row.precioVenta === undefined || Number.isNaN(Number(row.precioVenta)))
    return "El campo 'precioVenta' debe ser un número";
  if (row.total === undefined || Number.isNaN(Number(row.total)))
    return "El campo 'total' debe ser un número";
  return null;
}

export function transformVentaDiaria(row: Row, ctx: ImportContext): Row {
  return {
    productId: cellText(row.productId).trim(),
    codigo: cellText(row.codigo).trim(),
    nombre: cellText(row.nombre).trim(),
    color: cellText(row.color).trim(),
    talla: cellText(row.talla).trim(),
    fecha: cellText(row.fecha).trim(),
    cantidad: Number(row.cantidad ?? 0),
    precioVenta: Number(row.precioVenta ?? 0),
    total: Number(row.total ?? 0),
    costoUnitario: Number(row.costoUnitario ?? 0),
    costoTotal: Number(row.costoTotal ?? 0),
    ganancia: Number(row.ganancia ?? 0),
    documentoTipo: cellText(row.documentoTipo, "ninguno").trim(),
    documentoNumero: cellText(row.documentoNumero).trim(),
    devuelto: false,
    creadoEn: ctx.importadoEn,
    esDePrueba: true,
    importadoEn: ctx.importadoEn,
    loteImportacion: ctx.loteImportacion,
    escenario: ctx.escenario,
  };
}
