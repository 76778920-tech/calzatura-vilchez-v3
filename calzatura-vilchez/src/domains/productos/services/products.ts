import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Product } from "@/types";

const COL = "productos";
const CODE_COL = "productoCodigos";

export async function fetchProducts(): Promise<Product[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, "id">) }));
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Product, "id">) };
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  const products = await Promise.all(uniqueIds.map((id) => fetchProductById(id)));
  return products.filter((product): product is Product => Boolean(product));
}

export async function fetchProductsByCategory(categoria: string): Promise<Product[]> {
  const q = query(collection(db, COL), where("categoria", "==", categoria));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, "id">) }));
}

export async function fetchFeaturedProducts(): Promise<Product[]> {
  const q = query(collection(db, COL), where("destacado", "==", true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, "id">) }));
}

export async function addProduct(data: Omit<Product, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, COL), data);
  return docRef.id;
}

export async function updateProduct(
  id: string,
  data: Partial<Omit<Product, "id">>
): Promise<void> {
  await updateDoc(doc(db, COL, id), data);
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

export async function fetchProductCodes(): Promise<Record<string, string>> {
  const snap = await getDocs(collection(db, CODE_COL));
  return snap.docs.reduce<Record<string, string>>((acc, item) => {
    const data = item.data() as { codigo?: string };
    if (data.codigo) acc[item.id] = data.codigo;
    return acc;
  }, {});
}

export async function upsertProductCode(productId: string, codigo: string): Promise<void> {
  await setDoc(doc(db, CODE_COL, productId), {
    productoId: productId,
    codigo,
    actualizadoEn: new Date().toISOString(),
  });
}

export async function deleteProductCode(productId: string): Promise<void> {
  await deleteDoc(doc(db, CODE_COL, productId));
}

export async function fetchCategories(): Promise<string[]> {
  const snap = await getDocs(collection(db, COL));
  const cats = new Set<string>();
  snap.docs.forEach((d) => {
    const cat = (d.data() as Product).categoria;
    if (cat) cats.add(cat);
  });
  return Array.from(cats).sort();
}
