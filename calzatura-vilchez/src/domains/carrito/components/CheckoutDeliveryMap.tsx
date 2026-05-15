import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  useMap,
  Marker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { isDrivingRouteGeometry, type MapRoutePosition } from "@/services/deliveryOpenRoute";

type Props = Readonly<{
  storeLat: number;
  storeLng: number;
  customerLat: number;
  customerLng: number;
  fitBoundsNonce: number;
  routePositions?: MapRoutePosition[] | null;
  routeLoading?: boolean;
  locationPending?: boolean;
  interactive?: boolean;
  onCustomerPositionChange?: (lat: number, lng: number) => void;
}>;

/** Encuadra tienda + entrega solo al elegir ubicación (no al cargar la ruta; evita tiles cancelados). */
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
  const didInvalidateRef = useRef(false);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      if (!didInvalidateRef.current) {
        map.invalidateSize();
        didInvalidateRef.current = true;
      }
      map.fitBounds(
        L.latLngBounds([
          [storeLat, storeLng],
          [customerLat, customerLng],
        ]),
        {
          padding: [52, 52],
          maxZoom: 17,
          animate: false,
        },
      );
    }, 200);
    return () => globalThis.clearTimeout(timer);
  }, [map, storeLat, storeLng, customerLat, customerLng, fitBoundsNonce]);
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

function makePinIcon(fill: string, stroke: string) {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">` +
      `<path fill="${fill}" stroke="${stroke}" stroke-width="1.2" d="M16 1C9.4 1 4 6.2 4 12.5c0 6.8 12 25.5 12 25.5S28 19.3 28 12.5C28 6.2 22.6 1 16 1z"/>` +
      `<circle cx="16" cy="12.5" r="3.5" fill="#fff"/>` +
      `</svg>`,
  );
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${svg}`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
  });
}

export default function CheckoutDeliveryMap({
  storeLat,
  storeLng,
  customerLat,
  customerLng,
  fitBoundsNonce,
  routePositions = null,
  routeLoading = false,
  locationPending = false,
  interactive = false,
  onCustomerPositionChange,
}: Props) {
  const store: L.LatLngTuple = [storeLat, storeLng];
  const customer: L.LatLngTuple = [customerLat, customerLng];
  const hasDrivingRoute = isDrivingRouteGeometry(routePositions);

  const storeIcon = useMemo(() => makePinIcon("#d97706", "#92400e"), []);
  const customerIcon = useMemo(() => makePinIcon("#3b82f6", "#1e40af"), []);

  return (
    <div
      className={`checkout-delivery-map ${interactive ? "checkout-delivery-map--interactive" : ""}${locationPending ? " checkout-delivery-map--pending" : ""}`}
      aria-busy={routeLoading}
    >
      {routeLoading ? <div className="checkout-delivery-map-loading" aria-hidden="true" /> : null}
      <MapContainer
        key="checkout-delivery-map"
        center={store}
        zoom={14}
        className="checkout-delivery-map-inner"
        scrollWheelZoom={interactive}
        preferCanvas
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
          updateWhenZooming={false}
          updateWhenIdle
          keepBuffer={3}
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
        {hasDrivingRoute ? (
          <>
            <Polyline
              interactive={false}
              positions={routePositions!}
              pathOptions={{
                color: "#ffffff",
                weight: 7,
                opacity: 0.85,
                lineJoin: "round",
                lineCap: "round",
              }}
            />
            <Polyline
              interactive={false}
              positions={routePositions!}
              pathOptions={{
                color: "#2563eb",
                weight: 4,
                opacity: 0.92,
                lineJoin: "round",
                lineCap: "round",
              }}
            />
          </>
        ) : (
          <Polyline
            interactive={false}
            positions={[store, customer]}
            pathOptions={{
              color: "#94a3b8",
              weight: 2,
              dashArray: "7 7",
              opacity: routeLoading ? 0.35 : 0.7,
            }}
          />
        )}
        <Marker position={store} icon={storeIcon} interactive={false} />
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
          <Marker position={customer} icon={customerIcon} interactive={false} />
        )}
      </MapContainer>
      <div className="checkout-delivery-map-legend">
        <span className="checkout-delivery-map-legend-item">
          <span className="checkout-delivery-map-dot checkout-delivery-map-dot--store" /> Tienda
        </span>
        <span className="checkout-delivery-map-legend-item">
          <span className="checkout-delivery-map-dot checkout-delivery-map-dot--delivery" /> Entrega
        </span>
        {hasDrivingRoute ? (
          <span className="checkout-delivery-map-legend-item">
            <span className="checkout-delivery-map-route-line" /> Ruta en auto
          </span>
        ) : null}
      </div>
      {locationPending ? (
        <p className="checkout-delivery-map-hint checkout-delivery-map-hint--warn">
          Elegí una sugerencia o mové el pin azul para confirmar la entrega.
        </p>
      ) : routeLoading ? (
        <p className="checkout-delivery-map-hint">Calculando ruta por calles…</p>
      ) : interactive ? (
        <p className="checkout-delivery-map-hint">
          {hasDrivingRoute
            ? "La línea azul es la ruta estimada. Podés afinar la ubicación arrastrando el pin."
            : "Tocá el mapa o arrastrá el pin azul hasta tu puerta."}
        </p>
      ) : null}
    </div>
  );
}
