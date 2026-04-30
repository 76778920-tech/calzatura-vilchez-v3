import { supabase } from "@/supabase/client";

const COL = "favoritos";

export async function fetchFavoriteProductIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from(COL).select("productId").eq("userId", userId);
  if (error) throw error;
  return (data ?? []).map((d) => d.productId);
}

export async function isProductFavorite(userId: string, productId: string): Promise<boolean> {
  const { data } = await supabase.from(COL).select("id").eq("userId", userId).eq("productId", productId).single();
  return Boolean(data);
}

export async function addFavoriteProduct(userId: string, productId: string): Promise<void> {
  const { error } = await supabase.from(COL).insert({
    userId,
    productId,
    creadoEn: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function removeFavoriteProduct(userId: string, productId: string): Promise<void> {
  const { error } = await supabase.from(COL).delete().eq("userId", userId).eq("productId", productId);
  if (error) throw error;
}

export async function toggleFavoriteProduct(
  userId: string,
  productId: string,
  nextValue: boolean
): Promise<void> {
  if (nextValue) {
    await addFavoriteProduct(userId, productId);
    return;
  }
  await removeFavoriteProduct(userId, productId);
}

export async function clearFavoriteProductsByUser(userId: string): Promise<void> {
  const { error } = await supabase.from(COL).delete().eq("userId", userId);
  if (error) throw error;
}
