import {
  addDoc,
  collection,
  doc,
  deleteDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { DailySale, ProductFinancial } from "@/types";

const FINANCIAL_COL = "productoFinanzas";
const SALES_COL = "ventasDiarias";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculatePriceRange(
  costoCompra: number,
  margenMinimo = 25,
  margenObjetivo = 45,
  margenMaximo = 75
) {
  const cost = Math.max(0, Number(costoCompra) || 0);
  const min = Math.max(0, Number(margenMinimo) || 0);
  const target = Math.max(min, Number(margenObjetivo) || min);
  const max = Math.max(target, Number(margenMaximo) || target);

  return {
    margenMinimo: min,
    margenObjetivo: target,
    margenMaximo: max,
    precioMinimo: roundMoney(cost * (1 + min / 100)),
    precioSugerido: roundMoney(cost * (1 + target / 100)),
    precioMaximo: roundMoney(cost * (1 + max / 100)),
  };
}

export async function fetchProductFinancials(): Promise<Record<string, ProductFinancial>> {
  const snap = await getDocs(collection(db, FINANCIAL_COL));
  return snap.docs.reduce<Record<string, ProductFinancial>>((acc, item) => {
    acc[item.id] = { productId: item.id, ...(item.data() as Omit<ProductFinancial, "productId">) };
    return acc;
  }, {});
}

export async function upsertProductFinancial(
  productId: string,
  data: Omit<ProductFinancial, "productId" | "actualizadoEn">
): Promise<void> {
  await setDoc(doc(db, FINANCIAL_COL, productId), {
    productId,
    ...data,
    actualizadoEn: new Date().toISOString(),
  });
}

export async function deleteProductFinancial(productId: string): Promise<void> {
  await deleteDoc(doc(db, FINANCIAL_COL, productId));
}

function sinceISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function fetchDailySales(date?: string): Promise<DailySale[]> {
  const base = collection(db, SALES_COL);
  const q = date
    ? query(base, where("fecha", "==", date))
    : query(base, where("fecha", ">=", sinceISO(90)), orderBy("fecha", "desc"), limit(500));
  const snap = await getDocs(q);
  return snap.docs
    .map((item) => ({ id: item.id, ...(item.data() as Omit<DailySale, "id">) }))
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

export async function addDailySale(data: Omit<DailySale, "id" | "creadoEn">): Promise<string> {
  const docRef = await addDoc(collection(db, SALES_COL), {
    ...data,
    creadoEn: new Date().toISOString(),
  });
  return docRef.id;
}

export async function markSaleReturned(saleId: string, motivo: string): Promise<void> {
  await updateDoc(doc(db, SALES_COL, saleId), {
    devuelto: true,
    motivoDevolucion: motivo,
    devueltoEn: new Date().toISOString(),
  });
}
