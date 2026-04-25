import { supabase } from "@/supabase/client";
import { logAudit } from "@/services/audit";
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
  const { data: row, error } = await supabase.from(COL).insert({
    ...data,
    estado: "pendiente",
    creadoEn: new Date().toISOString(),
  }).select("id").single();
  if (error) throw error;
  return row.id;
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
