import type { CartItem } from "@/types";

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function orderItemLineKey(item: CartItem, lineIndex: number) {
  const pid = item.product?.id ?? "unknown";
  return `${pid}-${item.color ?? ""}-${item.talla ?? ""}-q${item.quantity}-i${lineIndex}`;
}
