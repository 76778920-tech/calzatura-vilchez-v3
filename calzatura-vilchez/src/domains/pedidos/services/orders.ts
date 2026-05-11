import { auth } from "@/firebase/config";
import { supabase } from "@/supabase/client";
import { logAudit } from "@/services/audit";
import { getBackendApiBaseUrl } from "@/config/apiBackend";
import type { Order, OrderStatus, CartItem, Address } from "@/types";

const COL = "pedidos";

export async function createOrder(data: {
  items: CartItem[];
  direccion: Address;
  metodoPago: "stripe" | "contraentrega";
  notas?: string;
  /** Envío en soles; el servidor valida y limita el máximo. */
  envio?: number;
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Debes iniciar sesion para crear un pedido");
  }

  const base = getBackendApiBaseUrl();
  if (!base) {
    throw new Error("VITE_BACKEND_API_URL no configurada (BFF pedidos)");
  }

  const idToken = await user.getIdToken();
  const response = await fetch(`${base}/createOrder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(data),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "No se pudo crear el pedido");
  }

  if (!payload.orderId || typeof payload.orderId !== "string") {
    throw new Error("La respuesta del servidor no incluyo un pedido valido");
  }

  return payload.orderId;
}

export async function fetchOrdersByUser(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from(COL)
    .select("*")
    .eq("userId", userId)
    .order("creadoEn", { ascending: false });
  if (error) throw error;
  return data as Order[];
}

export async function fetchAllOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from(COL)
    .select("*")
    .order("creadoEn", { ascending: false });
  if (error) throw error;
  return data as Order[];
}

export async function fetchOrderById(id: string): Promise<Order | null> {
  const { data, error } = await supabase.from(COL).select("*").eq("id", id).single();
  if (error) return null;
  return data as Order;
}

export async function updateOrderStatus(id: string, estado: OrderStatus): Promise<void> {
  const { error } = await supabase.from(COL).update({ estado }).eq("id", id);
  if (error) throw error;
  void logAudit("cambiar_estado", "pedido", id, `#${id.slice(-8).toUpperCase()}`, { estado });
}

export async function updateOrderStripeSession(
  id: string,
  stripeSessionId: string,
  estado: OrderStatus = "pagado"
): Promise<void> {
  const { error } = await supabase.from(COL).update({ stripeSessionId, estado }).eq("id", id);
  if (error) throw error;
}
