import { auth } from "@/firebase/config";
import type { User } from "firebase/auth";
import { getBackendApiBaseUrl } from "@/config/apiBackend";

const E2E_FAVORITES_PREFIX = "e2e_favorites:";

function assertCurrentUser(userId: string) {
  const currentUid = auth.currentUser?.uid;
  if (import.meta.env.VITE_E2E === "true") {
    if (currentUid && currentUid !== userId) {
      throw new Error("No puedes consultar favoritos de otra cuenta");
    }
    return;
  }
  if (currentUid !== userId) {
    throw new Error("No puedes consultar favoritos de otra cuenta");
  }
}

function e2eFavoriteKey(userId: string) {
  return `${E2E_FAVORITES_PREFIX}${userId}`;
}

function readE2EFavorites(userId: string): string[] {
  if (import.meta.env.VITE_E2E !== "true") return [];
  try {
    const raw = globalThis.localStorage.getItem(e2eFavoriteKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeE2EFavorites(userId: string, productIds: string[]) {
  globalThis.localStorage.setItem(e2eFavoriteKey(userId), JSON.stringify([...new Set(productIds)]));
}

async function resolveAuthUser(): Promise<User> {
  if (auth.currentUser) return auth.currentUser;
  if (import.meta.env.VITE_E2E !== "true") {
    throw new Error("Debes iniciar sesion");
  }
  const deadline = Date.now() + 5_000;
  while (!auth.currentUser && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  if (!auth.currentUser) {
    throw new Error("Debes iniciar sesion");
  }
  return auth.currentUser;
}

async function favoritesRequest(
  method: "GET" | "POST" | "DELETE",
  productId?: string
): Promise<Response> {
  const user = await resolveAuthUser();

  const base = getBackendApiBaseUrl();
  if (!base) {
    throw new Error("VITE_BACKEND_API_URL no configurada (favoritos)");
  }

  const idToken = await user.getIdToken();
  const url =
    method === "GET" && productId
      ? `${base}/favorites?productId=${encodeURIComponent(productId)}`
      : `${base}/favorites`;

  return fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${idToken}`,
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    ...(method === "POST" && productId ? { body: JSON.stringify({ productId }) } : {}),
  });
}

export async function fetchFavoriteProductIds(userId: string): Promise<string[]> {
  assertCurrentUser(userId);
  if (import.meta.env.VITE_E2E === "true") {
    return readE2EFavorites(userId);
  }

  const response = await favoritesRequest("GET");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "No se pudieron cargar favoritos");
  }
  return Array.isArray(payload.productIds)
    ? payload.productIds.filter((id: unknown): id is string => typeof id === "string")
    : [];
}

export async function isProductFavorite(userId: string, productId: string): Promise<boolean> {
  assertCurrentUser(userId);
  if (import.meta.env.VITE_E2E === "true") {
    return readE2EFavorites(userId).includes(productId);
  }

  const response = await favoritesRequest("GET", productId);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "No se pudo consultar favorito");
  }
  return Boolean(payload.isFavorite);
}

export async function addFavoriteProduct(userId: string, productId: string): Promise<void> {
  assertCurrentUser(userId);
  if (import.meta.env.VITE_E2E === "true") {
    writeE2EFavorites(userId, [...readE2EFavorites(userId), productId]);
    return;
  }

  const response = await favoritesRequest("POST", productId);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "No se pudo guardar favorito");
  }
}

export async function removeFavoriteProduct(userId: string, productId: string): Promise<void> {
  assertCurrentUser(userId);
  if (import.meta.env.VITE_E2E === "true") {
    writeE2EFavorites(userId, readE2EFavorites(userId).filter((id) => id !== productId));
    return;
  }

  const base = getBackendApiBaseUrl();
  if (!base) {
    throw new Error("VITE_BACKEND_API_URL no configurada (favoritos)");
  }
  const user = await resolveAuthUser();
  const idToken = await user.getIdToken();
  const response = await fetch(`${base}/favorites`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ productId, action: "remove" }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "No se pudo eliminar favorito");
  }
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
  assertCurrentUser(userId);
  if (import.meta.env.VITE_E2E === "true") {
    writeE2EFavorites(userId, []);
    return;
  }

  const base = getBackendApiBaseUrl();
  if (!base) {
    throw new Error("VITE_BACKEND_API_URL no configurada (favoritos)");
  }
  const user = await resolveAuthUser();
  const idToken = await user.getIdToken();
  const response = await fetch(`${base}/favorites`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "No se pudieron eliminar favoritos");
  }
}
