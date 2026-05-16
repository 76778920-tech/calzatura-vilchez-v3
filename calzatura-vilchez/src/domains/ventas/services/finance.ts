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

export async function fetchDailySales(date?: string): Promise<DailySale[]> {
  let query = supabase.from(SALES_COL).select("*");
  if (date) {
    query = query.eq("fecha", date);
  } else {
    query = query.gte("fecha", sinceISO(90)).order("fecha", { ascending: false }).limit(500);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as DailySale[]).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
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
