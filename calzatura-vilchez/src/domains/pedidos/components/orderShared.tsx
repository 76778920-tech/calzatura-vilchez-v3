import type { CartItem, Order } from "@/types";
import { maskPersonName, maskPhone } from "@/security/orderPrivacy";

export function OrderAddressBlock({
  order,
  redactPii = false,
}: Readonly<{ order: Order; redactPii?: boolean }>) {
  const direccion = order.direccion;
  const customerName = redactPii
    ? `${maskPersonName(direccion?.nombre ?? "") || "Cliente"} ${maskPersonName(direccion?.apellido ?? "")}`.trim()
    : `${direccion?.nombre ?? ""} ${direccion?.apellido ?? ""}`.trim();
  const addressLine = redactPii
    ? [direccion?.distrito, direccion?.ciudad].filter(Boolean).join(", ")
    : [direccion?.direccion, direccion?.distrito, direccion?.ciudad].filter(Boolean).join(", ");
  const phone = redactPii ? maskPhone(direccion?.telefono ?? "") : direccion?.telefono;

  return (
    <div className="order-address">
      <strong>Direccion de entrega:</strong>
      <p>{customerName || "Cliente"}</p>
      <p>{addressLine || "Ubicacion reservada"}</p>
      <p>Tel: {phone || "***"}</p>
    </div>
  );
}

export function OrderItemDetails({ item }: Readonly<{ item: CartItem }>) {
  return (
    <div>
      <p>{item.product?.nombre}</p>
      {item.color && <p className="order-item-talla">Color: {item.color}</p>}
      {item.talla && <p className="order-item-talla">Talla: {item.talla}</p>}
      <p>x{item.quantity} - S/ {((item.product?.precio ?? 0) * item.quantity).toFixed(2)}</p>
    </div>
  );
}
