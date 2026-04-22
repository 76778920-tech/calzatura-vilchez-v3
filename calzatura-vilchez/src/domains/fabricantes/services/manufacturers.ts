import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Manufacturer } from "@/types";

const COL = "fabricantes";

export async function fetchManufacturers(): Promise<Manufacturer[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs
    .map((item) => ({ id: item.id, ...(item.data() as Omit<Manufacturer, "id">) }))
    .sort((a, b) => a.marca.localeCompare(b.marca));
}

export async function addManufacturer(data: Omit<Manufacturer, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, COL), data);
  return docRef.id;
}

export async function updateManufacturer(
  id: string,
  data: Partial<Omit<Manufacturer, "id" | "creadoEn">>
): Promise<void> {
  await updateDoc(doc(db, COL, id), data);
}

export async function deleteManufacturer(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
