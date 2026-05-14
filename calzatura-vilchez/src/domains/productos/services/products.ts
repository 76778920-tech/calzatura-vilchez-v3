import { supabase } from "@/supabase/client";
import { logAudit } from "@/services/audit";
import type { Product } from "@/types";
import { effectiveFamiliaKey, tallyFamilyGroupSizes } from "@/utils/productFamily";

const COL = "productos";
const CODE_COL = "productoCodigos";

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from(COL).select("*");
  if (error) throw error;
  return data as Product[];
}

/** Solo productos visibles en tienda (activo = true). Usar en catálogo público. */
export async function fetchPublicProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from(COL).select("*").eq("activo", true);
  if (error) throw error;
  return data as Product[];
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from(COL).select("*").eq("id", id).single();
  if (error) return null;
  return data as Product;
}

/** Ficha en tienda pública: solo existe si el producto está visible (`activo`). */
export async function fetchPublicProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from(COL).select("*").eq("id", id).eq("activo", true).maybeSingle();
  if (error) return null;
  return (data as Product) ?? null;
}

/** Otros productos de la misma familia (otros colores), excluyendo el actual. */
export async function fetchRelatedProductsInFamily(product: Pick<Product, "id" | "familiaId">): Promise<Product[]> {
  const key = effectiveFamiliaKey(product);
  if (!key) return [];
  const { data, error } = await supabase.from(COL).select("*").eq("activo", true).or(`id.eq.${key},familiaId.eq.${key}`);
  if (error) throw error;
  return ((data ?? []) as Product[]).filter((row) => row.id !== product.id);
}

/** Recuento por clave de familia solo entre productos visibles en tienda (badges en catálogo público). */
export async function fetchProductFamilyGroupCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from(COL).select("id, familiaId").eq("activo", true);
  if (error) throw error;
  return tallyFamilyGroupSizes(data ?? []);
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  if (!uniqueIds.length) return [];
  const { data, error } = await supabase.from(COL).select("*").in("id", uniqueIds);
  if (error) throw error;
  return data as Product[];
}

/** Misma idea que `fetchProductsByIds`, pero solo variantes visibles en tienda (p. ej. favoritos). */
export async function fetchPublicProductsByIds(ids: string[]): Promise<Product[]> {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  if (!uniqueIds.length) return [];
  const { data, error } = await supabase.from(COL).select("*").in("id", uniqueIds).eq("activo", true);
  if (error) throw error;
  const rows = (data ?? []) as Product[];
  const byId = new Map(rows.map((p) => [p.id, p]));
  return uniqueIds.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
}

export async function fetchProductsByCategory(categoria: string): Promise<Product[]> {
  const { data, error } = await supabase.from(COL).select("*").eq("categoria", categoria).eq("activo", true);
  if (error) throw error;
  return data as Product[];
}

export async function fetchFeaturedProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from(COL).select("*").eq("destacado", true).eq("activo", true);
  if (error) throw error;
  return data as Product[];
}

export async function addProduct(data: Omit<Product, "id">): Promise<string> {
  const { data: row, error } = await supabase.from(COL).insert(data).select("id").single();
  if (error) throw error;
  void logAudit("crear", "producto", row.id, data.nombre);
  return row.id;
}

type VariantAtomicInput = {
  product: Omit<Product, "id">;
  codigo: string;
  finanzas: {
    costoCompra: number;
    margenMinimo: number;
    margenObjetivo: number;
    margenMaximo: number;
    precioMinimo: number;
    precioSugerido: number;
    precioMaximo: number;
  };
};

/**
 * Crea N variantes de color en una sola transacción de BD vía RPC.
 * Si cualquier variante falla (constraint, trigger, unicidad),
 * toda la operación se revierte sin dejar registros huérfanos.
 */
export async function createProductVariantsAtomic(
  variants: VariantAtomicInput[]
): Promise<string[]> {
  const payload = variants.map(({ product, codigo, finanzas }) => ({
    ...product,
    codigo,
    finanzas,
  }));
  const { data, error } = await supabase.rpc("create_product_variants_atomic", {
    variants: payload,
  });
  if (error) throw error;
  const ids = (data as { ids: string[] }).ids;
  ids.forEach((id, i) => {
    void logAudit("crear", "producto", id, variants[i].product.nombre);
  });
  return ids;
}

export async function updateProduct(id: string, data: Partial<Omit<Product, "id">>): Promise<void> {
  const { error } = await supabase.from(COL).update(data).eq("id", id);
  if (error) throw error;
  void logAudit("editar", "producto", id, data.nombre ?? id, { campos: Object.keys(data) });
}

type ProductEditFinancials = {
  costoCompra: number;
  margenMinimo: number;
  margenObjetivo: number;
  margenMaximo: number;
  precioMinimo: number;
  precioSugerido: number;
  precioMaximo: number;
};

/**
 * Edita producto, código y finanzas en una sola transacción de BD vía RPC.
 * La RPC revierte la transaccion completa ante fallos de constraint o trigger.
 */
export async function updateProductAtomic(
  id: string,
  product: Omit<Product, "id">,
  codigo: string,
  finanzas: ProductEditFinancials
): Promise<void> {
  const { error } = await supabase.rpc("update_product_atomic", {
    p_id: id,
    product,
    codigo,
    finanzas,
  });
  if (error) throw error;
  void logAudit("editar", "producto", id, product.nombre, { campos: Object.keys(product) });
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from(COL).delete().eq("id", id);
  if (error) throw error;
  void logAudit("eliminar", "producto", id, id);
}

export async function registrarIngresoStock(
  productId: string,
  productNombre: string,
  tallaStock: Record<string, number>,
  costoUnitario?: number,
  proveedor?: string,
  observaciones?: string,
  registradoPor?: string,
): Promise<{ cantidad: number; tallaStock: Record<string, number> }> {
  const { data, error } = await supabase.rpc("registrar_ingreso_stock", {
    p_product_id:     productId,
    p_talla_stock:    tallaStock,
    p_costo_unitario: costoUnitario ?? null,
    p_proveedor:      proveedor     || null,
    p_observaciones:  observaciones || null,
    p_registrado_por: registradoPor || null,
  });
  if (error) throw error;
  const result = data as { ok: boolean; cantidad: number; tallaStock: Record<string, number> };
  void logAudit("editar", "producto", productId, productNombre, {
    accion: "ingreso_stock",
    cantidad: result.cantidad,
    proveedor: proveedor || null,
  });
  return result;
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
  return Array.from(cats).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}
