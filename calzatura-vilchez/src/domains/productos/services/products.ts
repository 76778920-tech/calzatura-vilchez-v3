import { supabase } from "@/supabase/client";
import type { Product } from "@/types";

const COL = "productos";
const CODE_COL = "productoCodigos";

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from(COL).select("*");
  if (error) throw error;
  return data as Product[];
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from(COL).select("*").eq("id", id).single();
  if (error) return null;
  return data as Product;
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  if (!uniqueIds.length) return [];
  const { data, error } = await supabase.from(COL).select("*").in("id", uniqueIds);
  if (error) throw error;
  return data as Product[];
}

export async function fetchProductsByCategory(categoria: string): Promise<Product[]> {
  const { data, error } = await supabase.from(COL).select("*").eq("categoria", categoria);
  if (error) throw error;
  return data as Product[];
}

export async function fetchFeaturedProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from(COL).select("*").eq("destacado", true);
  if (error) throw error;
  return data as Product[];
}

export async function addProduct(data: Omit<Product, "id">): Promise<string> {
  const { data: row, error } = await supabase.from(COL).insert(data).select("id").single();
  if (error) throw error;
  return row.id;
}

export async function updateProduct(id: string, data: Partial<Omit<Product, "id">>): Promise<void> {
  const { error } = await supabase.from(COL).update(data).eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from(COL).delete().eq("id", id);
  if (error) throw error;
}

export async function fetchProductCodes(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from(CODE_COL).select("*");
  if (error) throw error;
  return (data ?? []).reduce<Record<string, string>>((acc, item) => {
    if (item.codigo) acc[item.productoId] = item.codigo;
    return acc;
  }, {});
}

export async function upsertProductCode(productId: string, codigo: string): Promise<void> {
  const { error } = await supabase.from(CODE_COL).upsert({
    productoId: productId,
    codigo,
    actualizadoEn: new Date().toISOString(),
  }, { onConflict: "productoId" });
  if (error) throw error;
}

export async function deleteProductCode(productId: string): Promise<void> {
  const { error } = await supabase.from(CODE_COL).delete().eq("productoId", productId);
  if (error) throw error;
}

export async function fetchCategories(): Promise<string[]> {
  const { data, error } = await supabase.from(COL).select("categoria");
  if (error) throw error;
  const cats = new Set<string>();
  (data ?? []).forEach((d) => { if (d.categoria) cats.add(d.categoria); });
  return Array.from(cats).sort();
}
