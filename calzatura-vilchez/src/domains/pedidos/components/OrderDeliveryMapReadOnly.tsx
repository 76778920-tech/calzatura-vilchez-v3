import { DELIVERY_CONFIG } from "@/config/delivery";
import CheckoutDeliveryMap from "@/domains/carrito/components/CheckoutDeliveryMap";

type Props = Readonly<{
  customerLat: number;
  customerLng: number;
  direccion?: string;
}>;

export default function OrderDeliveryMapReadOnly({ customerLat, customerLng, direccion }: Props) {
  const { storeLat, storeLng } = DELIVERY_CONFIG;

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
          interactive={false}
        />
      </div>
    </div>
  );
}
