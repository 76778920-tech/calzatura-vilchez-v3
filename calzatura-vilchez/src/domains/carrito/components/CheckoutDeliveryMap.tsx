import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { isDrivingRouteGeometry, type MapRoutePosition } from "@/services/deliveryOpenRoute";

type Props = Readonly<{
  storeLat: number;
  storeLng: number;
  customerLat?: number | null;
  customerLng?: number | null;
  locationConfirmed: boolean;
  fitBoundsNonce: number;
  routePositions?: MapRoutePosition[] | null;
  routeLoading?: boolean;
  interactive?: boolean;
  onCustomerPositionChange?: (lat: number, lng: number) => void;
}>;

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
      if (didInvalidateRef.current === false) {
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

function CenterStoreOnMount({ storeLat, storeLng }: { storeLat: number; storeLng: number }) {
  const map = useMap();
  const didCenterRef = useRef(false);

  useEffect(() => {
    if (didCenterRef.current) return;
    didCenterRef.current = true;
    const timer = globalThis.setTimeout(() => {
      map.invalidateSize();
      map.setView([storeLat, storeLng], 14, { animate: false });
    }, 100);
    return () => globalThis.clearTimeout(timer);
  }, [map, storeLat, storeLng]);

  return null;
}

function MapPickHandler({ enabled, onPick }: { enabled: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (enabled === false) return;
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

function mapClassName(interactive: boolean, locationConfirmed: boolean) {
  const classes = ["checkout-delivery-map"];
  if (interactive) classes.push("checkout-delivery-map--interactive");
  if (locationConfirmed === false) classes.push("checkout-delivery-map--pending");
  return classes.join(" ");
}

function RouteLayer({
  routePositions,
  showFallbackLine,
  store,
  customer,
  routeLoading,
}: {
  routePositions: MapRoutePosition[] | null;
  showFallbackLine: boolean;
  store: L.LatLngTuple;
  customer: L.LatLngTuple;
  routeLoading: boolean;
}) {
  if (routePositions) {
    return (
      <>
        <Polyline
          interactive={false}
          positions={routePositions}
          pathOptions={{ color: "#ffffff", weight: 7, opacity: 0.85, lineJoin: "round", lineCap: "round" }}
        />
        <Polyline
          interactive={false}
          positions={routePositions}
          pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.92, lineJoin: "round", lineCap: "round" }}
        />
      </>
    );
  }

  if (showFallbackLine === false) return null;
  return (
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
  );
}

function CustomerMarker({
  hasCustomer,
  interactive,
  onCustomerPositionChange,
  customer,
  customerIcon,
}: {
  hasCustomer: boolean;
  interactive: boolean;
  onCustomerPositionChange?: (lat: number, lng: number) => void;
  customer: L.LatLngTuple;
  customerIcon: L.Icon;
}) {
  if (hasCustomer === false) return null;
  if (interactive === false || !onCustomerPositionChange) {
    return <Marker position={customer} icon={customerIcon} interactive={false} />;
  }
  return (
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
  );
}

function MapHint({
  locationConfirmed,
  routeLoading,
  interactive,
  hasDrivingRoute,
}: {
  locationConfirmed: boolean;
  routeLoading: boolean;
  interactive: boolean;
  hasDrivingRoute: boolean;
}) {
  if (locationConfirmed === false) {
    return (
      <p className="checkout-delivery-map-hint checkout-delivery-map-hint--warn">
        Elige una sugerencia de la lista o toca el mapa para marcar tu entrega.
      </p>
    );
  }
  if (routeLoading) return <p className="checkout-delivery-map-hint">Calculando ruta por calles...</p>;
  if (interactive === false) return null;

  const hint = hasDrivingRoute
    ? "La linea azul es la ruta estimada. Puedes afinar la ubicacion arrastrando el pin."
    : "Puedes afinar la ubicacion arrastrando el pin azul.";
  return <p className="checkout-delivery-map-hint">{hint}</p>;
}

export default function CheckoutDeliveryMap({
  storeLat,
  storeLng,
  customerLat = null,
  customerLng = null,
  locationConfirmed,
  fitBoundsNonce,
  routePositions = null,
  routeLoading = false,
  interactive = false,
  onCustomerPositionChange,
}: Props) {
  const store: L.LatLngTuple = [storeLat, storeLng];
  const hasCustomer =
    locationConfirmed &&
    customerLat != null &&
    customerLng != null &&
    Number.isFinite(customerLat) &&
    Number.isFinite(customerLng);
  const customer: L.LatLngTuple = [customerLat ?? storeLat, customerLng ?? storeLng];
  const hasDrivingRoute = hasCustomer && isDrivingRouteGeometry(routePositions);
  const drivingRoutePositions = hasDrivingRoute ? routePositions : null;
  const showFallbackLine = hasCustomer && hasDrivingRoute === false;

  const storeIcon = useMemo(() => makePinIcon("#d97706", "#92400e"), []);
  const customerIcon = useMemo(() => makePinIcon("#3b82f6", "#1e40af"), []);

  return (
    <div className={mapClassName(interactive, locationConfirmed)} aria-busy={routeLoading}>
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
        {hasCustomer ? (
          <FitBoundsToSignal
            storeLat={storeLat}
            storeLng={storeLng}
            fitBoundsNonce={fitBoundsNonce}
            customerLat={customer[0]}
            customerLng={customer[1]}
          />
        ) : (
          <CenterStoreOnMount storeLat={storeLat} storeLng={storeLng} />
        )}
        {interactive && onCustomerPositionChange ? (
          <MapPickHandler enabled={interactive} onPick={onCustomerPositionChange} />
        ) : null}
        <RouteLayer
          routePositions={drivingRoutePositions}
          showFallbackLine={showFallbackLine}
          store={store}
          customer={customer}
          routeLoading={routeLoading}
        />
        <Marker position={store} icon={storeIcon} interactive={false} />
        <CustomerMarker
          hasCustomer={hasCustomer}
          interactive={interactive}
          onCustomerPositionChange={onCustomerPositionChange}
          customer={customer}
          customerIcon={customerIcon}
        />
      </MapContainer>
      <div className="checkout-delivery-map-legend">
        <span className="checkout-delivery-map-legend-item">
          <span className="checkout-delivery-map-dot checkout-delivery-map-dot--store" /> Tienda
        </span>
        {hasCustomer ? (
          <span className="checkout-delivery-map-legend-item">
            <span className="checkout-delivery-map-dot checkout-delivery-map-dot--delivery" /> Entrega
          </span>
        ) : null}
        {hasDrivingRoute ? (
          <span className="checkout-delivery-map-legend-item">
            <span className="checkout-delivery-map-route-line" /> Ruta en auto
          </span>
        ) : null}
      </div>
      <MapHint
        locationConfirmed={locationConfirmed}
        routeLoading={routeLoading}
        interactive={interactive}
        hasDrivingRoute={hasDrivingRoute}
      />
    </div>
  );
}
