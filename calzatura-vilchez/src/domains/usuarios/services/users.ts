import { supabase } from "@/supabase/client";
import type { UserProfile, UserRole } from "@/types";

export async function saveUserProfile(user: UserProfile): Promise<void> {
  const { error } = await supabase.from("usuarios").upsert(user, { onConflict: "uid" });
  if (error) throw error;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from("usuarios").select("*").eq("uid", uid).single();
  if (error) return null;
  return data as UserProfile;
}

export async function fetchAllUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase.from("usuarios").select("*");
  if (error) throw error;
  return data as UserProfile[];
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, "telefono" | "direcciones">>
): Promise<void> {
  const { error } = await supabase.from("usuarios").update(data).eq("uid", uid);
  if (error) throw error;
}

export async function updateUserRole(uid: string, rol: UserRole): Promise<void> {
  const { error } = await supabase.from("usuarios").update({ rol }).eq("uid", uid);
  if (error) throw error;
}
