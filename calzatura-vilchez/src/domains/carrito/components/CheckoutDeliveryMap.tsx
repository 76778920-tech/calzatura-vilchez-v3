import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  useMap,
  Marker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  storeLat: number;
  storeLng: number;
  customerLat: number;
  customerLng: number;
  /** Incrementar al elegir una sugerencia para volver a encuadrar tienda + entrega. */
  fitBoundsNonce: number;
  interactive?: boolean;
  onCustomerPositionChange?: (lat: number, lng: number) => void;
};

function FitBoundsToSignal({
  storeLat,
  storeLng,
  fitBoundsNonce,
  customerLat,
  customerLng,
}: {
  storeLat: number;
  storeLng: number;
  fitBoundsNonce: number;
  customerLat: number;
  customerLng: number;
}) {
  const map = useMap();
  const customerRef = useRef({ customerLat, customerLng });
  customerRef.current = { customerLat, customerLng };

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      map.invalidateSize();
      const { customerLat: clat, customerLng: clng } = customerRef.current;
      map.fitBounds(L.latLngBounds([storeLat, storeLng], [clat, clng]), {
        padding: [48, 48],
        maxZoom: 17,
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [map, storeLat, storeLng, fitBoundsNonce]);
  return null;
}

function MapPickHandler({
  enabled,
  onPick,
}: {
  enabled: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      if (!enabled) return;
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function CheckoutDeliveryMap({
  storeLat,
  storeLng,
  customerLat,
  customerLng,
  fitBoundsNonce,
  interactive = false,
  onCustomerPositionChange,
}: Props) {
  const store: L.LatLngTuple = [storeLat, storeLng];
  const customer: L.LatLngTuple = [customerLat, customerLng];

  /** Icono explícito (evita el pin por defecto de Leaflet si falla el divIcon). */
  const customerIcon = useMemo(() => {
    const svg = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">` +
        `<path fill="#3b82f6" stroke="#1e3a8a" stroke-width="1.25" d="M18 2C10.3 2 4 8.1 4 15.4c0 7.4 14 25.6 14 25.6S32 22.8 32 15.4C32 8.1 25.7 2 18 2z"/>` +
        `<circle cx="18" cy="15" r="4.2" fill="#fff"/>` +
        `</svg>`,
    );
    return L.icon({
      iconUrl: `data:image/svg+xml;charset=utf-8,${svg}`,
      iconSize: [36, 44],
      iconAnchor: [18, 44],
    });
  }, []);

  return (
    <div className={`checkout-delivery-map ${interactive ? "checkout-delivery-map--interactive" : ""}`}>
      <MapContainer
        center={store}
        zoom={13}
        className="checkout-delivery-map-inner"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBoundsToSignal
          storeLat={storeLat}
          storeLng={storeLng}
          fitBoundsNonce={fitBoundsNonce}
          customerLat={customerLat}
          customerLng={customerLng}
        />
        {interactive && onCustomerPositionChange ? (
          <MapPickHandler enabled={interactive} onPick={onCustomerPositionChange} />
        ) : null}
        <Polyline
          interactive={false}
          positions={[store, customer]}
          pathOptions={{
            color: "#64748b",
            weight: 2,
            dashArray: "6 6",
            opacity: 0.9,
          }}
        />
        <CircleMarker
          center={store}
          radius={9}
          pathOptions={{
            color: "#92400e",
            fillColor: "#d97706",
            fillOpacity: 0.95,
            weight: 2,
          }}
        />
        {interactive && onCustomerPositionChange ? (
          <Marker
            position={customer}
            icon={customerIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const ll = e.target.getLatLng();
                onCustomerPositionChange(ll.lat, ll.lng);
              },
            }}
          />
        ) : (
          <CircleMarker
            center={customer}
            radius={9}
            pathOptions={{
              color: "#1e40af",
              fillColor: "#3b82f6",
              fillOpacity: 0.95,
              weight: 2,
            }}
          />
        )}
      </MapContainer>
      <div className="checkout-delivery-map-legend">
        <span className="checkout-delivery-map-legend-item">
          <span className="checkout-delivery-map-dot checkout-delivery-map-dot--store" /> Tienda
        </span>
        <span className="checkout-delivery-map-legend-item">
          <span className="checkout-delivery-map-dot checkout-delivery-map-dot--delivery" /> Entrega
        </span>
      </div>
      {interactive ? (
        <p className="checkout-delivery-map-hint">
          Tocá el mapa o arrastrá el pin azul para ubicar la entrega.
        </p>
      ) : null}
    </div>
  );
}
