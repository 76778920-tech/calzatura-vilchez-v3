/// <reference types="@types/google.maps" />
/**
 * Mapa de entrega — Google Maps JavaScript API
 * Sustituye la implementación Leaflet + CartoDB.
 *
 * Polyline: viene del BFF /delivery/route (Google Directions → ORS → OSRM).
 * Key: VITE_GOOGLE_MAPS_API_KEY (solo Maps JS, restringida por dominio en GCloud).
 */
import { useEffect, useMemo, useRef } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  Pin,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { isDrivingRouteGeometry, type MapRoutePosition } from "@/services/deliveryOpenRoute";

const GMAPS_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? "";
const GMAPS_MAP_ID =
  (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined)?.trim() || "DEMO_MAP_ID";

type LatLng = { lat: number; lng: number };

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

// ─── CameraController ─────────────────────────────────────────────────────────

type CameraProps = {
  storeLat: number;
  storeLng: number;
  customerLat: number;
  customerLng: number;
  hasCustomer: boolean;
  fitBoundsNonce: number;
};

function CameraController({
  storeLat,
  storeLng,
  customerLat,
  customerLng,
  hasCustomer,
  fitBoundsNonce,
}: CameraProps) {
  const map = useMap();
  const coreLib = useMapsLibrary("core");
  const appliedNonce = useRef(-1);

  useEffect(() => {
    if (!map || !coreLib || appliedNonce.current === fitBoundsNonce) return;
    appliedNonce.current = fitBoundsNonce;
    if (hasCustomer) {
      const bounds = new coreLib.LatLngBounds(
        { lat: Math.min(storeLat, customerLat), lng: Math.min(storeLng, customerLng) },
        { lat: Math.max(storeLat, customerLat), lng: Math.max(storeLng, customerLng) },
      );
      map.fitBounds(bounds, 52);
    } else {
      map.panTo({ lat: storeLat, lng: storeLng });
      map.setZoom(14);
    }
  }, [map, coreLib, storeLat, storeLng, customerLat, customerLng, hasCustomer, fitBoundsNonce]);

  return null;
}

// ─── RoutePolyline ────────────────────────────────────────────────────────────

function RoutePolyline({ path, loading }: { path: LatLng[]; loading: boolean }) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const linesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    linesRef.current.forEach((l) => l.setMap(null));
    linesRef.current = [];
    if (!map || !mapsLib || path.length < 2) return;

    const outer = new mapsLib.Polyline({
      path,
      strokeColor: "#ffffff",
      strokeWeight: 7,
      strokeOpacity: 0.85,
      clickable: false,
      map,
    });
    const inner = new mapsLib.Polyline({
      path,
      strokeColor: "#2563eb",
      strokeWeight: 4,
      strokeOpacity: loading ? 0.4 : 0.92,
      clickable: false,
      map,
    });
    linesRef.current = [outer, inner];

    return () => {
      outer.setMap(null);
      inner.setMap(null);
      linesRef.current = [];
    };
  }, [map, mapsLib, path, loading]);

  return null;
}

// ─── FallbackLine (línea punteada tienda → entrega sin ruta real) ─────────────

function FallbackLine({
  store,
  customer,
  loading,
}: {
  store: LatLng;
  customer: LatLng;
  loading: boolean;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const lineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    lineRef.current?.setMap(null);
    lineRef.current = null;
    if (!map || !mapsLib) return;

    lineRef.current = new mapsLib.Polyline({
      path: [store, customer],
      strokeColor: "#94a3b8",
      strokeWeight: 2,
      strokeOpacity: 0,
      icons: [
        {
          icon: {
            path: "M 0,-1 0,1",
            strokeOpacity: loading ? 0.35 : 0.65,
            strokeColor: "#94a3b8",
            scale: 3,
          },
          offset: "0",
          repeat: "12px",
        },
      ],
      clickable: false,
      map,
    });

    return () => {
      lineRef.current?.setMap(null);
      lineRef.current = null;
    };
  }, [map, mapsLib, store, customer, loading]);

  return null;
}

// ─── MapHint ──────────────────────────────────────────────────────────────────

function MapHint({
  locationConfirmed,
  routeLoading,
  interactive,
  hasDrivingRoute,
}: Readonly<{
  locationConfirmed: boolean;
  routeLoading: boolean;
  interactive: boolean;
  hasDrivingRoute: boolean;
}>) {
  if (!locationConfirmed) {
    return (
      <p className="checkout-delivery-map-hint checkout-delivery-map-hint--warn">
        Elige una sugerencia de la lista o toca el mapa para marcar tu entrega.
      </p>
    );
  }
  if (routeLoading) return <p className="checkout-delivery-map-hint">Calculando ruta por calles...</p>;
  if (!interactive) return null;
  return (
    <p className="checkout-delivery-map-hint">
      {hasDrivingRoute
        ? "La línea azul es la ruta estimada. Puedes afinar la ubicación arrastrando el pin."
        : "Puedes afinar la ubicación arrastrando el pin azul."}
    </p>
  );
}

// ─── CheckoutDeliveryMap ──────────────────────────────────────────────────────

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
  const hasCustomer =
    locationConfirmed &&
    customerLat != null &&
    customerLng != null &&
    Number.isFinite(customerLat) &&
    Number.isFinite(customerLng);

  const storePos: LatLng = { lat: storeLat, lng: storeLng };
  const customerPos: LatLng = {
    lat: customerLat ?? storeLat,
    lng: customerLng ?? storeLng,
  };

  const hasDrivingRoute = hasCustomer && isDrivingRouteGeometry(routePositions);

  const routePath = useMemo(
    () =>
      hasDrivingRoute && routePositions
        ? routePositions.map(([lat, lng]) => ({ lat, lng }))
        : [],
    [hasDrivingRoute, routePositions],
  );

  const showFallbackLine = hasCustomer && !hasDrivingRoute;

  const containerClass = [
    "checkout-delivery-map",
    interactive ? "checkout-delivery-map--interactive" : "",
    locationConfirmed ? "" : "checkout-delivery-map--pending",
  ]
    .filter(Boolean)
    .join(" ");

  if (!GMAPS_KEY) {
    return (
      <div className={containerClass}>
        <div className="checkout-delivery-map-inner" />
      </div>
    );
  }

  return (
    <div className={containerClass} aria-busy={routeLoading ? true : undefined}>
      {routeLoading && <div className="checkout-delivery-map-loading" aria-hidden="true" />}

      <APIProvider apiKey={GMAPS_KEY}>
        <Map
          mapId={GMAPS_MAP_ID}
          className="checkout-delivery-map-inner"
          defaultCenter={storePos}
          defaultZoom={14}
          gestureHandling={interactive ? "cooperative" : "none"}
          disableDefaultUI
          clickableIcons={false}
          onClick={
            interactive && onCustomerPositionChange
              ? (e) => {
                  if (e.detail.latLng) {
                    onCustomerPositionChange(e.detail.latLng.lat, e.detail.latLng.lng);
                  }
                }
              : undefined
          }
        >
          <CameraController
            storeLat={storeLat}
            storeLng={storeLng}
            customerLat={customerPos.lat}
            customerLng={customerPos.lng}
            hasCustomer={hasCustomer}
            fitBoundsNonce={fitBoundsNonce}
          />

          {routePath.length >= 2 && <RoutePolyline path={routePath} loading={routeLoading} />}
          {showFallbackLine && (
            <FallbackLine store={storePos} customer={customerPos} loading={routeLoading} />
          )}

          <AdvancedMarker position={storePos} title="Tienda Calzatura Vílchez" zIndex={1}>
            <Pin background="#d97706" borderColor="#92400e" glyphColor="#fff" />
          </AdvancedMarker>

          {hasCustomer && (
            <AdvancedMarker
              position={customerPos}
              title="Punto de entrega"
              draggable={interactive && Boolean(onCustomerPositionChange)}
              onDragEnd={
                interactive && onCustomerPositionChange
                  ? (e) => {
                      if (e.latLng) {
                        onCustomerPositionChange(e.latLng.lat(), e.latLng.lng());
                      }
                    }
                  : undefined
              }
              zIndex={2}
            >
              <Pin background="#3b82f6" borderColor="#1e40af" glyphColor="#fff" />
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>

      <div className="checkout-delivery-map-legend">
        <span className="checkout-delivery-map-legend-item">
          <span className="checkout-delivery-map-dot checkout-delivery-map-dot--store" /> Tienda
        </span>
        {hasCustomer && (
          <span className="checkout-delivery-map-legend-item">
            <span className="checkout-delivery-map-dot checkout-delivery-map-dot--delivery" /> Entrega
          </span>
        )}
        {hasDrivingRoute && (
          <span className="checkout-delivery-map-legend-item">
            <span className="checkout-delivery-map-route-line" /> Ruta en auto
          </span>
        )}
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
