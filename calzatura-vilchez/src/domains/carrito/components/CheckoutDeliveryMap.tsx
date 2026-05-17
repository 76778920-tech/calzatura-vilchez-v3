import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
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

type MapPickHandlerProps = Readonly<{
  enabled: boolean;
  onPick: (lat: number, lng: number) => void;
}>;

type MapViewControllerProps = Readonly<{
  storeLat: number;
  storeLng: number;
  fitBoundsNonce: number;
  hasCustomer: boolean;
  customerLat: number;
  customerLng: number;
}>;

type RouteLayersProps = Readonly<{
  routePositions: MapRoutePosition[] | null;
  showFallbackLine: boolean;
  store: L.LatLngTuple;
  customer: L.LatLngTuple;
  routeLoading: boolean;
}>;

function MapPickHandler(props: MapPickHandlerProps) {
  const { enabled, onPick } = props;
  useMapEvents({
    click: (e) => {
      if (enabled) {
        onPick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

/** Un solo efecto de cámara evita montar/desmontar hijos que rompen el DOM de Leaflet. */
function MapViewController(props: MapViewControllerProps) {
  const { storeLat, storeLng, fitBoundsNonce, hasCustomer, customerLat, customerLng } = props;
  const map = useMap();
  const didInvalidateRef = useRef(false);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      if (!didInvalidateRef.current) {
        map.invalidateSize();
        didInvalidateRef.current = true;
      }
      if (hasCustomer) {
        map.fitBounds(
          L.latLngBounds([
            [storeLat, storeLng],
            [customerLat, customerLng],
          ]),
          { padding: [52, 52], maxZoom: 17, animate: false },
        );
        return;
      }
      map.setView([storeLat, storeLng], 14, { animate: false });
    }, 200);
    return () => globalThis.clearTimeout(timer);
  }, [map, storeLat, storeLng, hasCustomer, customerLat, customerLng, fitBoundsNonce]);

  return null;
}

/** Capas de ruta vía API Leaflet (no Polyline de react-leaflet) para evitar removeChild con React 19. */
function RouteLayers(props: RouteLayersProps) {
  const { routePositions, showFallbackLine, store, customer, routeLoading } = props;
  const map = useMap();
  const groupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!groupRef.current) {
      groupRef.current = L.layerGroup().addTo(map);
    }
    const group = groupRef.current;
    group.clearLayers();

    if (routePositions && routePositions.length >= 2) {
      group.addLayer(
        L.polyline(routePositions, {
          color: "#ffffff",
          weight: 7,
          opacity: 0.85,
          lineJoin: "round",
          lineCap: "round",
          interactive: false,
        }),
      );
      group.addLayer(
        L.polyline(routePositions, {
          color: "#2563eb",
          weight: 4,
          opacity: 0.92,
          lineJoin: "round",
          lineCap: "round",
          interactive: false,
        }),
      );
    } else if (showFallbackLine) {
      group.addLayer(
        L.polyline([store, customer], {
          color: "#94a3b8",
          weight: 2,
          dashArray: "7 7",
          opacity: routeLoading ? 0.35 : 0.7,
          interactive: false,
        }),
      );
    }

    return () => {
      group.clearLayers();
    };
  }, [map, routePositions, showFallbackLine, store, customer, routeLoading]);

  useEffect(() => {
    return () => {
      if (groupRef.current) {
        groupRef.current.clearLayers();
        map.removeLayer(groupRef.current);
        groupRef.current = null;
      }
    };
  }, [map]);

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

function MapHint(props: Readonly<{
  locationConfirmed: boolean;
  routeLoading: boolean;
  interactive: boolean;
  hasDrivingRoute: boolean;
}>) {
  const { locationConfirmed, routeLoading, interactive, hasDrivingRoute } = props;
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

export default function CheckoutDeliveryMap(props: Props) {
  const {
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
  } = props;
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
    <div className={mapClassName(interactive, locationConfirmed)} aria-busy={routeLoading ? true : undefined}>
      {routeLoading ? <div className="checkout-delivery-map-loading" aria-hidden="true" /> : null}
      <MapContainer
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
        <MapViewController
          storeLat={storeLat}
          storeLng={storeLng}
          fitBoundsNonce={fitBoundsNonce}
          hasCustomer={hasCustomer}
          customerLat={customer[0]}
          customerLng={customer[1]}
        />
        {interactive && onCustomerPositionChange ? (
          <MapPickHandler enabled={interactive} onPick={onCustomerPositionChange} />
        ) : null}
        <RouteLayers
          routePositions={drivingRoutePositions}
          showFallbackLine={showFallbackLine}
          store={store}
          customer={customer}
          routeLoading={routeLoading}
        />
        <Marker position={store} icon={storeIcon} interactive={false} />
        {hasCustomer ? (
          <Marker
            key="checkout-customer-marker"
            position={customer}
            icon={customerIcon}
            draggable={interactive && Boolean(onCustomerPositionChange)}
            eventHandlers={
              interactive && onCustomerPositionChange
                ? {
                    dragend: (e) => {
                      const ll = e.target.getLatLng();
                      onCustomerPositionChange(ll.lat, ll.lng);
                    },
                  }
                : undefined
            }
          />
        ) : null}
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
