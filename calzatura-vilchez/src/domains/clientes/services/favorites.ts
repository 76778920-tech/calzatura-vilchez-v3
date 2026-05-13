import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "@/firebase/config";

const E2E_FAVORITES_PREFIX = "e2e_favorites:";

function assertCurrentUser(userId: string) {
  if (auth.currentUser?.uid !== userId) {
    throw new Error("No puedes consultar favoritos de otra cuenta");
  }
}

function favoriteRef(userId: string, productId: string) {
  return doc(db, "usuarios", userId, "favoritos", productId);
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

export async function fetchFavoriteProductIds(userId: string): Promise<string[]> {
  assertCurrentUser(userId);
  if (import.meta.env.VITE_E2E === "true") {
    return readE2EFavorites(userId);
  }
  const snapshot = await getDocs(collection(db, "usuarios", userId, "favoritos"));
  return snapshot.docs.map((favorite) => favorite.id);
}

export async function isProductFavorite(userId: string, productId: string): Promise<boolean> {
  assertCurrentUser(userId);
  if (import.meta.env.VITE_E2E === "true") {
    return readE2EFavorites(userId).includes(productId);
  }
  const snapshot = await getDoc(favoriteRef(userId, productId));
  return snapshot.exists();
}

export async function addFavoriteProduct(userId: string, productId: string): Promise<void> {
  assertCurrentUser(userId);
  if (import.meta.env.VITE_E2E === "true") {
    writeE2EFavorites(userId, [...readE2EFavorites(userId), productId]);
    return;
  }
  await setDoc(favoriteRef(userId, productId), {
    productId,
    creadoEn: serverTimestamp(),
  });
}

export async function removeFavoriteProduct(userId: string, productId: string): Promise<void> {
  assertCurrentUser(userId);
  if (import.meta.env.VITE_E2E === "true") {
    writeE2EFavorites(userId, readE2EFavorites(userId).filter((id) => id !== productId));
    return;
  }
  await deleteDoc(favoriteRef(userId, productId));
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
  const snapshot = await getDocs(collection(db, "usuarios", userId, "favoritos"));
  const batch = writeBatch(db);
  snapshot.docs.forEach((favorite) => batch.delete(favorite.ref));
  await batch.commit();
}
