import type { CartItem, Order } from "@/types";

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
