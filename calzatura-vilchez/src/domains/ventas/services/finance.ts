import { getBackendApiBaseUrl } from "@/config/apiBackend";
import { auth } from "@/firebase/config";
import { supabase } from "@/supabase/client";
import type { DailySale, ProductFinancial } from "@/types";

const FINANCIAL_COL = "productoFinanzas";
const SALES_COL = "ventasDiarias";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculatePriceRange(
  costoCompra: number,
  margenMinimo = 25,
  margenObjetivo = 45,
  margenMaximo = 75
) {
  const cost = Math.max(0, Number(costoCompra) || 0);
  const min = Math.max(0, Number(margenMinimo) || 0);
  const target = Math.max(min, Number(margenObjetivo) || min);
  const max = Math.max(target, Number(margenMaximo) || target);

  return {
    margenMinimo: min,
    margenObjetivo: target,
    margenMaximo: max,
    precioMinimo: roundMoney(cost * (1 + min / 100)),
    precioSugerido: roundMoney(cost * (1 + target / 100)),
    precioMaximo: roundMoney(cost * (1 + max / 100)),
  };
}

export async function fetchProductFinancials(): Promise<Record<string, ProductFinancial>> {
  const { data, error } = await supabase.from(FINANCIAL_COL).select("*");
  if (error) throw error;
  return (data ?? []).reduce<Record<string, ProductFinancial>>((acc, item) => {
    acc[item.productId] = item as ProductFinancial;
    return acc;
  }, {});
}

export async function upsertProductFinancial(
  productId: string,
  data: Omit<ProductFinancial, "productId" | "actualizadoEn">
): Promise<void> {
  const { error } = await supabase.from(FINANCIAL_COL).upsert({
    productId,
    ...data,
    actualizadoEn: new Date().toISOString(),
  }, { onConflict: "productId" });
  if (error) throw error;
}

export async function deleteProductFinancial(productId: string): Promise<void> {
  const { error } = await supabase.from(FINANCIAL_COL).delete().eq("productId", productId);
  if (error) throw error;
}

function sinceISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sortDailySales(rows: DailySale[]) {
  return [...rows].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

async function fetchDailySalesViaBff(params: { fecha?: string; sinceDays?: number }): Promise<DailySale[] | null> {
  const base = getBackendApiBaseUrl();
  const user = auth.currentUser;
  if (!base || !user) return null;

  const qs = new URLSearchParams();
  if (params.fecha) qs.set("fecha", params.fecha);
  else qs.set("sinceDays", String(params.sinceDays ?? 90));

  try {
    const response = await fetch(`${base}/admin/dailySales?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
    });
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => ({}))) as { sales?: DailySale[] };
    return Array.isArray(payload.sales) ? sortDailySales(payload.sales) : null;
  } catch {
    return null;
  }
}

function isIgnorableDailySalesRpcError(message: string | undefined, rpcName: string): boolean {
  return new RegExp(`${rpcName}|PGRST202`, "i").test(message ?? "");
}

async function fetchDailySalesRpc(date?: string): Promise<DailySale[] | null> {
  if (date) {
    const { data, error } = await supabase.rpc("list_ventas_diarias_by_fecha", { p_fecha: date });
    if (!error && Array.isArray(data)) return sortDailySales(data as DailySale[]);
    if (error && !isIgnorableDailySalesRpcError(error.message, "list_ventas_diarias_by_fecha")) throw error;
    return null;
  }

  const desde = sinceISO(90);
  const { data, error } = await supabase.rpc("list_ventas_diarias_since", { p_fecha_desde: desde });
  if (!error && Array.isArray(data)) return sortDailySales(data as DailySale[]);
  if (error && !isIgnorableDailySalesRpcError(error.message, "list_ventas_diarias_since")) throw error;
  return null;
}

async function fetchDailySalesTable(date?: string): Promise<DailySale[] | null> {
  let query = supabase.from(SALES_COL).select("*");
  if (date) {
    query = query.eq("fecha", date);
  } else {
    query = query.gte("fecha", sinceISO(90)).order("fecha", { ascending: false }).limit(500);
  }
  const { data, error } = await query;
  if (error) return null;
  return sortDailySales((data ?? []) as DailySale[]);
}

async function fetchDailySalesFromSupabase(date?: string): Promise<DailySale[] | null> {
  const fromRpc = await fetchDailySalesRpc(date);
  if (fromRpc) return fromRpc;
  return fetchDailySalesTable(date);
}

/** Ventas en tienda física: BFF (service role) primero; fallback Supabase RPC / SELECT. */
export async function fetchDailySales(date?: string): Promise<DailySale[]> {
  const fromBff = await fetchDailySalesViaBff(date ? { fecha: date } : { sinceDays: 90 });
  if (fromBff) return fromBff;

  const fromSupabase = await fetchDailySalesFromSupabase(date);
  if (fromSupabase) return fromSupabase;

  throw new Error("No se pudieron cargar las ventas diarias");
}

export async function addDailySale(data: Omit<DailySale, "id" | "creadoEn">): Promise<string> {
  const { data: row, error } = await supabase.from(SALES_COL).insert({
    ...data,
    canal: "tienda",
    creadoEn: new Date().toISOString(),
  }).select("id").single();
  if (error) throw error;
  return row.id;
}

export type DailySaleAtomicInput = Omit<DailySale, "id" | "creadoEn" | "devuelto" | "motivoDevolucion" | "devueltoEn" | "canal">;

export async function registerDailySalesAtomic(sales: DailySaleAtomicInput[]): Promise<string[]> {
  const { data, error } = await supabase.rpc("register_daily_sales_atomic", {
    p_sales: sales,
  });
  if (error) throw error;
  return (data as { ids?: string[] } | null)?.ids ?? [];
}

export async function markSaleReturned(saleId: string, motivo: string): Promise<void> {
  const { error } = await supabase.from(SALES_COL).update({
    devuelto: true,
    motivoDevolucion: motivo,
    devueltoEn: new Date().toISOString(),
  }).eq("id", saleId);
  if (error) throw error;
}

export async function returnDailySaleAtomic(
  saleId: string,
  motivo: string
): Promise<Pick<DailySale, "id" | "productId" | "devuelto" | "motivoDevolucion" | "devueltoEn">> {
  const { data, error } = await supabase.rpc("return_daily_sale_atomic", {
    p_sale_id: saleId,
    p_motivo: motivo,
  });
  if (error) throw error;
  return data as Pick<DailySale, "id" | "productId" | "devuelto" | "motivoDevolucion" | "devueltoEn">;
}

export async function decrementProductStock(
  productId: string,
  lines: { talla: string | null; cantidad: number }[]
): Promise<void> {
  const { error } = await supabase.rpc("decrement_product_stock", {
    p_product_id: productId,
    p_lines: lines,
  });
  if (error) throw error;
}

export async function restoreProductStock(
  productId: string,
  talla: string | null,
  cantidad: number
): Promise<void> {
  const { error } = await supabase.rpc("restore_product_stock", {
    p_product_id: productId,
    p_talla: talla ?? null,
    p_cantidad: cantidad,
  });
  if (error) throw error;
}
