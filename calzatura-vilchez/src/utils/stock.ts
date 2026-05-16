import type { Product } from "@/types";

type ColorStockMap = Record<string, Record<string, unknown>>;

function normalizeComparable(value: string | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function cellQty(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function findTallaKey(stockBySize: Record<string, unknown> | undefined, talla: string): string | null {
  if (!stockBySize || !talla) return null;
  const want = String(talla).trim();
  if (Object.prototype.hasOwnProperty.call(stockBySize, want)) return want;
  for (const k of Object.keys(stockBySize)) {
    const ks = String(k).trim();
    if (ks === want) return k;
    if (Number(k) === Number(want) && want !== "" && Number.isFinite(Number(want))) return k;
  }
  return null;
}

function effectiveColorStock(raw: unknown): ColorStockMap | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 0) return undefined;
  for (const k of keys) {
    const row = obj[k];
    if (row && typeof row === "object" && !Array.isArray(row) && Object.keys(row as Record<string, unknown>).length > 0) {
      return obj as ColorStockMap;
    }
  }
  return undefined;
}

function effectiveTallaStock(raw: Record<string, number> | undefined): Record<string, number> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  if (Object.keys(raw).length === 0) return undefined;
  return raw;
}

function colorStockOf(p: Product): ColorStockMap | undefined {
  const raw = (p as Product & { colorStock?: ColorStockMap }).colorStock;
  return effectiveColorStock(raw);
}

function resolveColorKeyForLine(cs: ColorStockMap, requestedColor: string, product: Product): string | undefined {
  const rc = requestedColor.trim();
  if (!rc) return undefined;
  const keys = Object.keys(cs);
  const hit = keys.find((k) => normalizeComparable(k) === normalizeComparable(rc));
  if (hit) return hit;
  const hint = product.color?.trim();
  if (hint && normalizeComparable(hint) !== normalizeComparable(rc)) {
    const h2 = keys.find((k) => normalizeComparable(k) === normalizeComparable(hint));
    if (h2) return h2;
  }
  if (keys.length === 1) {
    const only = keys[0];
    if (
      normalizeComparable(only) === normalizeComparable(rc) ||
      (hint && normalizeComparable(only) === normalizeComparable(hint))
    ) {
      return only;
    }
  }
  return undefined;
}

function lineStockFromTallaOrColumn(product: Product, talla: string): number {
  const t = talla.trim();
  if (!t) return deriveTotalFromProduct(product);
  const ts = effectiveTallaStock(product.tallaStock);
  if (ts) {
    const tk = findTallaKey(ts as Record<string, unknown>, t);
    if (tk != null) return cellQty((ts as Record<string, unknown>)[tk]);
    return 0;
  }
  return Math.max(0, product.stock);
}

function deriveTotalFromProduct(product: Product): number {
  const column = Math.max(0, product.stock);
  const cs = colorStockOf(product);
  if (cs) {
    const sum = Object.values(cs).reduce((acc, row) => {
      const r = row as Record<string, unknown>;
      return acc + Object.values(r).reduce((inner: number, q: unknown) => inner + cellQty(q), 0);
    }, 0);
    return Math.max(sum, column);
  }
  if (product.tallaStock) {
    const ts = effectiveTallaStock(product.tallaStock);
    if (ts) return Math.max(sumSizeStock(ts), column);
  }
  return column;
}

export function sumSizeStock(tallaStock: Record<string, number>) {
  return Object.values(tallaStock).reduce((sum, qty) => sum + Math.max(0, Number(qty) || 0), 0);
}

/** Stock para una talla (y color si el producto usa `colorStock`). Alineado con la lógica del BFF. */
export function getSizeStock(product: Product, talla?: string, color?: string) {
  const t = talla?.trim() ?? "";
  const c = color?.trim() ?? "";
  const colorStock = colorStockOf(product);

  if (!t) {
    if (colorStock) return deriveTotalFromProduct(product);
    return Math.max(0, product.stock);
  }

  if (colorStock && t) {
    const keys = Object.keys(colorStock);
    if (c) {
      const colorKey = resolveColorKeyForLine(colorStock, c, product);
      if (!colorKey) {
        if (keys.length > 1) return 0;
        return lineStockFromTallaOrColumn(product, t);
      }
      const row = colorStock[colorKey] as Record<string, unknown>;
      const tk = findTallaKey(row, t);
      if (tk != null) return cellQty(row[tk]);
      return lineStockFromTallaOrColumn(product, t);
    }
    return keys.reduce((sum, k) => {
      const row = colorStock[k] as Record<string, unknown>;
      const tk = findTallaKey(row, t);
      return tk != null ? sum + cellQty(row[tk]) : sum;
    }, 0);
  }

  const ts = effectiveTallaStock(product.tallaStock);
  if (t && ts) {
    const tk = findTallaKey(ts as Record<string, unknown>, t);
    if (tk != null) return cellQty((ts as Record<string, unknown>)[tk]);
    return 0;
  }

  return Math.max(0, product.stock);
}

export function getAvailableSizes(product: Product) {
  const cs = colorStockOf(product);
  if (cs) {
    const agg: Record<string, number> = {};
    for (const row of Object.values(cs)) {
      const r = row as Record<string, unknown>;
      for (const [sz, q] of Object.entries(r)) {
        agg[sz] = (agg[sz] || 0) + cellQty(q);
      }
    }
    return Object.entries(agg)
      .filter(([, q]) => q > 0)
      .map(([sz]) => sz)
      .sort((a, b) => Number(a) - Number(b));
  }
  const ts = effectiveTallaStock(product.tallaStock);
  if (ts) {
    return Object.entries(ts)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([talla]) => talla)
      .sort((a, b) => Number(a) - Number(b));
  }
  return product.tallas ?? [];
}
