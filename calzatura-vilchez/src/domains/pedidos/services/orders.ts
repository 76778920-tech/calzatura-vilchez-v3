import { auth } from "@/firebase/config";
import { getBackendApiBaseUrl } from "@/config/apiBackend";
import type { PanelFetchScope } from "@/security/panelScope";
import { bffFetch } from "@/utils/bffClient";
import type { Order, OrderStatus, CartItem, Address } from "@/types";

export async function createOrder(data: {
  items: CartItem[];
  direccion: Address;
  metodoPago: "stripe" | "contraentrega";
  notas?: string;
  /** Envío en soles; el servidor valida y limita el máximo. */
  envio?: number;
  /** UUID por intento de checkout; evita pedidos duplicados en reintentos o doble clic. */
  idempotencyKey?: string;
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
  let response: Response;
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    };
    if (data.idempotencyKey) {
      headers["Idempotency-Key"] = data.idempotencyKey;
    }
    response = await fetch(`${base}/createOrder`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor de pedidos. Intenta otra vez en unos segundos.");
  }

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
  const user = auth.currentUser;
  if (user?.uid !== userId) {
    throw new Error("No autorizado para consultar estos pedidos");
  }
  const { orders } = await bffFetch<{ orders: Order[] }>("/myOrders");
  return orders;
}

export async function fetchAllOrders(scope: PanelFetchScope = "admin"): Promise<Order[]> {
  const path = scope === "staff" ? "/staff/orders" : "/admin/orders";
  const { orders } = await bffFetch<{ orders: Order[] }>(path);
  return orders;
}

export async function fetchOrderById(id: string): Promise<Order | null> {
  try {
    const { order } = await bffFetch<{ order: Order }>(`/orders/${encodeURIComponent(id)}`);
    return order;
  } catch {
    return null;
  }
}

export async function updateOrderStatus(id: string, estado: OrderStatus): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Debes iniciar sesion para actualizar pedidos");
  }

  const base = getBackendApiBaseUrl();
  if (!base) {
    throw new Error("VITE_BACKEND_API_URL no configurada (actualizacion de pedidos)");
  }

  const idToken = await user.getIdToken();
  let response: Response;
  try {
    response = await fetch(`${base}/updateOrderStatus`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ orderId: id, estado }),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor de pedidos. Intenta otra vez en unos segundos.");
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "No se pudo actualizar el estado");
  }
}
