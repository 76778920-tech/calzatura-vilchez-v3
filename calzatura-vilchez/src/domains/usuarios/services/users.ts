import { auth } from "@/firebase/config";
import { bffFetch } from "@/utils/bffClient";
import { logAudit } from "@/services/audit";
import type { UserProfile, UserRole } from "@/types";

export async function saveUserProfile(user: UserProfile): Promise<void> {
  const current = auth.currentUser;
  if (current?.uid !== user.uid) {
    throw new Error("No autorizado para guardar este perfil");
  }
  await bffFetch("/users/me", {
    method: "PUT",
    body: JSON.stringify({ profile: user }),
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const current = auth.currentUser;
  if (current?.uid !== uid) {
    return null;
  }
  try {
    const { profile } = await bffFetch<{ profile: UserProfile | null }>("/users/me");
    return profile;
  } catch {
    return null;
  }
}

export async function fetchAllUsers(): Promise<UserProfile[]> {
  const { users } = await bffFetch<{ users: UserProfile[] }>("/admin/users");
  return users;
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, "telefono" | "direcciones">>,
): Promise<void> {
  const current = auth.currentUser;
  if (current?.uid !== uid) {
    throw new Error("No autorizado");
  }
  await bffFetch("/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function updateUserRole(uid: string, rol: UserRole): Promise<void> {
  await bffFetch(`/admin/users/${encodeURIComponent(uid)}/role`, {
    method: "PATCH",
    body: JSON.stringify({ rol }),
  });
  void logAudit("cambiar_estado", "usuario", uid, uid, { rol });
}

export async function deleteUserProfile(uid: string): Promise<void> {
  await bffFetch(`/admin/users/${encodeURIComponent(uid)}`, { method: "DELETE" });
}
