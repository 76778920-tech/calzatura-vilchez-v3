import { useEffect, useState } from "react";
import { DELIVERY_CONFIG } from "@/config/delivery";
import CheckoutDeliveryMap from "@/domains/carrito/components/CheckoutDeliveryMap";
import {
  fetchDrivingRoutePositions,
  type MapRoutePosition,
} from "@/services/deliveryOpenRoute";

type Props = Readonly<{
  customerLat: number;
  customerLng: number;
  direccion?: string;
}>;

export default function OrderDeliveryMapReadOnly({ customerLat, customerLng, direccion }: Props) {
  const { storeLat, storeLng } = DELIVERY_CONFIG;
  const [routePositions, setRoutePositions] = useState<MapRoutePosition[] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = globalThis.setTimeout(() => {
      if (cancelled) return;
      setRouteLoading(true);
      setRoutePositions(null);

      void fetchDrivingRoutePositions(storeLat, storeLng, customerLat, customerLng)
        .then((positions) => {
          if (!cancelled) setRoutePositions(positions.length >= 3 ? positions : null);
        })
        .catch(() => {
          if (!cancelled) setRoutePositions(null);
        })
        .finally(() => {
          if (!cancelled) setRouteLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      globalThis.clearTimeout(timer);
    };
  }, [storeLat, storeLng, customerLat, customerLng]);

  return (
    <div className="order-delivery-map-admin">
      {direccion && (
        <p className="order-delivery-map-label">
          Ubicación de entrega: {direccion}
        </p>
      )}
      <div className="order-delivery-map-container">
        <CheckoutDeliveryMap
          storeLat={storeLat}
          storeLng={storeLng}
          customerLat={customerLat}
          customerLng={customerLng}
          locationConfirmed
          fitBoundsNonce={1}
          routePositions={routePositions}
          routeLoading={routeLoading}
          interactive={false}
        />
      </div>
    </div>
  );
}
