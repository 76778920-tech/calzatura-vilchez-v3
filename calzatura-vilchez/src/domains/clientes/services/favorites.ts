import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/firebase/config";

function favoriteRef(userId: string, productId: string) {
  return doc(db, "usuarios", userId, "favoritos", productId);
}

function favoritesCollection(userId: string) {
  return collection(db, "usuarios", userId, "favoritos");
}

export async function fetchFavoriteProductIds(userId: string): Promise<string[]> {
  const snap = await getDocs(favoritesCollection(userId));
  return snap.docs.map((item) => item.id);
}

export async function isProductFavorite(userId: string, productId: string): Promise<boolean> {
  const snap = await getDoc(favoriteRef(userId, productId));
  return snap.exists();
}

export async function addFavoriteProduct(userId: string, productId: string): Promise<void> {
  await setDoc(favoriteRef(userId, productId), {
    productId,
    creadoEn: serverTimestamp(),
  });
}

export async function removeFavoriteProduct(userId: string, productId: string): Promise<void> {
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
