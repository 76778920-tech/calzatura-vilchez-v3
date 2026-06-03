import { lazy, Suspense } from "react";
import type { CartItem, Order } from "@/types";
import { maskPersonName, maskPhone } from "@/security/orderPrivacy";

const OrderDeliveryMapReadOnly = lazy(
  () => import("@/domains/pedidos/components/OrderDeliveryMapReadOnly"),
);

export function OrderAddressBlock({
  order,
  redactPii = false,
  showMap = false,
}: Readonly<{ order: Order; redactPii?: boolean; showMap?: boolean }>) {
  const dir = order.direccion;

  const customerName = redactPii
    ? `${maskPersonName(dir?.nombre ?? "") || "Cliente"} ${maskPersonName(dir?.apellido ?? "")}`.trim()
    : `${dir?.nombre ?? ""} ${dir?.apellido ?? ""}`.trim();

  const addressLine = redactPii
    ? [dir?.distrito, dir?.ciudad].filter(Boolean).join(", ")
    : [dir?.direccion, dir?.distrito, dir?.ciudad].filter(Boolean).join(", ");

  const phone = redactPii
    ? maskPhone(dir?.telefono ?? "")
    : dir?.telefono;

  const hasCoords =
    typeof dir?.lat === "number" &&
    typeof dir?.lng === "number" &&
    Number.isFinite(dir.lat) &&
    Number.isFinite(dir.lng);

  return (
    <div className="order-address-block">
      <p className="order-address-block__title">Dirección de entrega</p>

      <div className="order-address-block__grid">
        {/* Cliente */}
        <div className="order-address-block__field">
          <span className="order-address-block__label">Cliente</span>
          <span className="order-address-block__value">{customerName || "—"}</span>
        </div>

        {/* Email (solo admin) */}
        {!redactPii && order.userEmail && (
          <div className="order-address-block__field">
            <span className="order-address-block__label">Correo</span>
            <span className="order-address-block__value">{order.userEmail}</span>
          </div>
        )}

        {/* Dirección completa */}
        {!redactPii && dir?.direccion && (
          <div className="order-address-block__field">
            <span className="order-address-block__label">Dirección</span>
            <span className="order-address-block__value">{dir.direccion}</span>
          </div>
        )}

        {/* Distrito */}
        <div className="order-address-block__field">
          <span className="order-address-block__label">Distrito</span>
          <span className="order-address-block__value">{dir?.distrito || "—"}</span>
        </div>

        {/* Ciudad */}
        <div className="order-address-block__field">
          <span className="order-address-block__label">Ciudad</span>
          <span className="order-address-block__value">{dir?.ciudad || "—"}</span>
        </div>

        {/* Teléfono */}
        <div className="order-address-block__field">
          <span className="order-address-block__label">Teléfono</span>
          <span className="order-address-block__value">{phone || "—"}</span>
        </div>

        {/* Referencia (solo admin) */}
        {!redactPii && dir?.referencia && (
          <div className="order-address-block__field order-address-block__field--full">
            <span className="order-address-block__label">Referencia</span>
            <span className="order-address-block__value">{dir.referencia}</span>
          </div>
        )}

        {/* Coordenadas (solo admin) */}
        {!redactPii && hasCoords && (
          <div className="order-address-block__field">
            <span className="order-address-block__label">Coordenadas</span>
            <span className="order-address-block__value order-address-block__coords">
              {(dir?.lat as number).toFixed(6)}, {(dir?.lng as number).toFixed(6)}
            </span>
          </div>
        )}
      </div>

      {/* Mapa (solo admin con coords) */}
      {showMap && hasCoords && (
        <Suspense fallback={<div className="order-delivery-map-loading">Cargando mapa…</div>}>
          <OrderDeliveryMapReadOnly
            customerLat={dir?.lat as number}
            customerLng={dir?.lng as number}
            direccion={addressLine || undefined}
          />
        </Suspense>
      )}
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
