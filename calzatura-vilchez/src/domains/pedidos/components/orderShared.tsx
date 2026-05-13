import type { SyntheticEvent } from "react";
import type { CartItem, Order } from "@/types";

export function handleProductImageError(e: SyntheticEvent<HTMLImageElement>) {
  const image = e.target as HTMLImageElement;
  image.onerror = null;
  image.src = "/placeholder-product.svg";
}

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

export function OrderAddressBlock({ order }: Readonly<{ order: Order }>) {
  return (
    <div className="order-address">
      <strong>Dirección de entrega:</strong>
      <p>{order.direccion?.nombre} {order.direccion?.apellido}</p>
      <p>{order.direccion?.direccion}, {order.direccion?.distrito}, {order.direccion?.ciudad}</p>
      <p>Tel: {order.direccion?.telefono}</p>
    </div>
  );
}

export function OrderItemDetails({ item }: Readonly<{ item: CartItem }>) {
  return (
    <div>
      <p>{item.product?.nombre}</p>
      {item.color && <p className="order-item-talla">Color: {item.color}</p>}
      {item.talla && <p className="order-item-talla">Talla: {item.talla}</p>}
      <p>x{item.quantity} — S/ {((item.product?.precio ?? 0) * item.quantity).toFixed(2)}</p>
    </div>
  );
}
