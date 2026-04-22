import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Order, OrderStatus, CartItem, Address } from "@/types";

const COL = "pedidos";

export async function createOrder(data: {
  userId: string;
  userEmail: string;
  items: CartItem[];
  subtotal: number;
  envio: number;
  total: number;
  direccion: Address;
  metodoPago: string;
  notas?: string;
}): Promise<string> {
  const docRef = await addDoc(collection(db, COL), {
    ...data,
    estado: "pendiente",
    creadoEn: serverTimestamp(),
  });
  return docRef.id;
}

export async function fetchOrdersByUser(userId: string): Promise<Order[]> {
  const q = query(
    collection(db, COL),
    where("userId", "==", userId),
    orderBy("creadoEn", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, "id">) }));
}

export async function fetchAllOrders(): Promise<Order[]> {
  const q = query(collection(db, COL), orderBy("creadoEn", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, "id">) }));
}

export async function fetchOrderById(id: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Order, "id">) };
}

export async function updateOrderStatus(id: string, estado: OrderStatus): Promise<void> {
  await updateDoc(doc(db, COL, id), { estado });
}

export async function updateOrderStripeSession(
  id: string,
  stripeSessionId: string,
  estado: OrderStatus = "pagado"
): Promise<void> {
  await updateDoc(doc(db, COL, id), { stripeSessionId, estado });
}
