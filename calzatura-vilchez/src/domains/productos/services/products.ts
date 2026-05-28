import { auth } from "@/firebase/config";
import { supabase } from "@/supabase/client";
import { logAudit } from "@/services/audit";
import { postAdminBff } from "@/domains/productos/services/adminProductsBff";
import type { PanelFetchScope } from "@/security/panelScope";
import { bffFetch } from "@/utils/bffClient";
import {
  hasPublicBff,
  publicBffFetch,
  type PublicCatalogBrowseResult,
  type PublicCatalogPage,
} from "@/utils/publicBffClient";
import type { Product } from "@/types";
import { effectiveFamiliaKey, tallyFamilyGroupSizes } from "@/utils/productFamily";
import { browsePublicCatalogFromUrl } from "@/domains/productos/utils/productsPageCatalogDerivations";

const COL = "productos";

async function tryPublicBff<T>(path: string): Promise<T | null> {
  if (!hasPublicBff()) return null;
  try {
    return await publicBffFetch<T>(path);
  } catch {
    return null;
  }
}

async function fetchActiveFromSupabase(): Promise<Product[]> {
  const { data, error } = await supabase.from(COL).select("*").eq("activo", true);
  if (error) throw error;
  return data as Product[];
}

/** Panel admin: todos los productos. Staff: solo activos. Público: `fetchPublicProducts`. */
export async function fetchProducts(scope: PanelFetchScope = "admin"): Promise<Product[]> {
  if (auth.currentUser) {
    const path = scope === "staff" ? "/staff/products" : "/admin/products";
    const { products } = await bffFetch<{ products: Product[] }>(path);
    return products;
  }
  return fetchPublicProducts();
}

/** Índice ligero para búsqueda/header/home (menor payload que listado completo). */
export async function fetchPublicCatalogIndex(): Promise<Product[]> {
  const fromBff = await tryPublicBff<{ products: Product[] }>("/public/catalog/index");
  if (fromBff?.products) return fromBff.products;
  return fetchActiveFromSupabase();
}

/** Solo productos visibles en tienda (activo = true). Usar en catálogo público. */
export async function fetchPublicProducts(): Promise<Product[]> {
  const fromBff = await tryPublicBff<{ products: Product[] }>("/public/catalog/active");
  if (fromBff?.products) return fromBff.products;
  return fetchActiveFromSupabase();
}

/** Catálogo paginado sin filtros de URL (k6 / listados simples). */
export async function fetchPublicProductsPage(page = 1, limit = 48): Promise<PublicCatalogPage> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const fromBff = await tryPublicBff<PublicCatalogPage>(`/public/catalog?${params}`);
  if (fromBff) return fromBff;
  const all = await fetchActiveFromSupabase();
  const total = all.length;
  const from = (page - 1) * limit;
  return {
    products: all.slice(from, from + limit),
    page,
    limit,
    total,
    totalPages: total > 0 ? Math.ceil(total / limit) : 0,
  };
}

/** Catálogo con filtros de URL y paginación server-side (ProductsPage). */
export async function fetchPublicCatalogBrowse(
  params: URLSearchParams,
  page = 1,
  limit = 24,
): Promise<PublicCatalogBrowseResult> {
  const qs = new URLSearchParams(params);
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  const fromBff = await tryPublicBff<PublicCatalogBrowseResult>(`/public/catalog/browse?${qs}`);
  if (fromBff) return fromBff;

  const all = await fetchActiveFromSupabase();
  return browsePublicCatalogFromUrl(all, qs, page, limit);
}

export async function fetchProductById(id: string, scope: PanelFetchScope = "admin"): Promise<Product | null> {
  if (auth.currentUser) {
    try {
      const base = scope === "staff" ? "/staff/products" : "/admin/products";
      const { product } = await bffFetch<{ product: Product }>(`${base}/${encodeURIComponent(id)}`);
      return product;
    } catch {
      return null;
    }
  }
  return fetchPublicProductById(id);
}

/** Ficha en tienda pública: solo existe si el producto está visible (`activo`). */
export async function fetchPublicProductById(id: string): Promise<Product | null> {
  const fromBff = await tryPublicBff<{ product: Product | null }>(
    `/public/catalog/product/${encodeURIComponent(id)}`,
  );
  if (fromBff) return fromBff.product;
  const { data, error } = await supabase.from(COL).select("*").eq("id", id).eq("activo", true).maybeSingle();
  if (error) return null;
  return (data as Product) ?? null;
}

/** Otros productos de la misma familia (otros colores), excluyendo el actual. */
export async function fetchRelatedProductsInFamily(product: Pick<Product, "id" | "familiaId">): Promise<Product[]> {
  const key = effectiveFamiliaKey(product);
  if (!key) return [];
  const qs = new URLSearchParams({
    productId: product.id,
    familyKey: key,
  });
  const fromBff = await tryPublicBff<{ products: Product[] }>(`/public/catalog/related?${qs}`);
  if (fromBff?.products) return fromBff.products;
  const { data, error } = await supabase.from(COL).select("*").eq("activo", true).or(`id.eq.${key},familiaId.eq.${key}`);
  if (error) throw error;
  return ((data ?? []) as Product[]).filter((row) => row.id !== product.id);
}

/** Recuento por clave de familia solo entre productos visibles en tienda (badges en catálogo público). */
export async function fetchProductFamilyGroupCounts(): Promise<Record<string, number>> {
  const fromBff = await tryPublicBff<{ counts: Record<string, number> }>("/public/catalog/family-counts");
  if (fromBff?.counts) return fromBff.counts;
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
  const fromBff = await tryPublicBff<{ products: Product[] }>(
    `/public/catalog/by-ids?ids=${uniqueIds.map(encodeURIComponent).join(",")}`,
  );
  if (fromBff?.products) return fromBff.products;
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

export async function fetchFeaturedProducts(limit = 24): Promise<Product[]> {
  const fromBff = await tryPublicBff<{ products: Product[] }>(`/public/catalog/featured?limit=${limit}`);
  if (fromBff?.products) return fromBff.products;
  const { data, error } = await supabase
    .from(COL)
    .select("*")
    .eq("destacado", true)
    .eq("activo", true)
    .limit(limit);
  if (error) throw error;
  return data as Product[];
}

export async function addProduct(data: Omit<Product, "id">): Promise<string> {
  const { id } = await bffFetch<{ id: string }>("/admin/products", {
    method: "POST",
    body: JSON.stringify({ product: data }),
  });
  return id;
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
  const { ids } = await postAdminBff<{ ids: string[] }>("/createProductVariantsAtomic", {
    variants: payload,
  });
  ids.forEach((id, i) => {
    void logAudit("crear", "producto", id, variants[i].product.nombre);
  });
  return ids;
}

export async function updateProduct(id: string, data: Partial<Omit<Product, "id">>): Promise<void> {
  await bffFetch(`/admin/products/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ product: data }),
  });
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
  await postAdminBff("/updateProductAtomic", {
    p_id: id,
    product,
    codigo,
    finanzas,
  });
  void logAudit("editar", "producto", id, product.nombre, { campos: Object.keys(product) });
}

export async function deleteProductAtomic(id: string, nombre?: string): Promise<void> {
  await postAdminBff("/deleteProductAtomic", { p_id: id });
  void logAudit("eliminar", "producto", id, nombre ?? id);
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
  const result = await postAdminBff<{ ok: boolean; cantidad: number; tallaStock: Record<string, number> }>(
    "/registrarIngresoStock",
    {
      p_product_id: productId,
      p_talla_stock: tallaStock,
      p_costo_unitario: costoUnitario ?? null,
      p_proveedor: proveedor || null,
      p_observaciones: observaciones || null,
      p_registrado_por: registradoPor || null,
    },
  );
  void logAudit("editar", "producto", productId, productNombre, {
    accion: "ingreso_stock",
    cantidad: result.cantidad,
    proveedor: proveedor || null,
  });
  return result;
}

/** Códigos internos: BFF admin (todos) o staff (solo productos activos). */
export async function fetchProductCodes(scope: PanelFetchScope = "admin"): Promise<Record<string, string>> {
  if (!auth.currentUser) {
    return {};
  }
  const path = scope === "staff" ? "/staff/productCodes" : "/admin/productCodes";
  const { codes } = await bffFetch<{ codes: Record<string, string> }>(path);
  return codes ?? {};
}

export async function upsertProductCode(productId: string, codigo: string): Promise<void> {
  await bffFetch(`/admin/productCodes/${encodeURIComponent(productId)}`, {
    method: "PUT",
    body: JSON.stringify({ codigo }),
  });
}

export async function fetchCategories(): Promise<string[]> {
  const { data, error } = await supabase.from(COL).select("categoria");
  if (error) throw error;
  const cats = new Set<string>();
  (data ?? []).forEach((d) => { if (d.categoria) cats.add(d.categoria); });
  return Array.from(cats).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}
