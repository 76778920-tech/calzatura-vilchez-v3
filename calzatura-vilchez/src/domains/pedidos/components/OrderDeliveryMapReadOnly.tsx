/// <reference types="@types/google.maps" />
import { useEffect, useRef } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  Pin,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { DELIVERY_CONFIG } from "@/config/delivery";

const GMAPS_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? "";
const GMAPS_MAP_ID =
  (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined)?.trim() || "DEMO_MAP_ID";

type Props = Readonly<{
  customerLat: number;
  customerLng: number;
  direccion?: string;
}>;

function CameraFit({
  storeLat,
  storeLng,
  customerLat,
  customerLng,
}: {
  storeLat: number;
  storeLng: number;
  customerLat: number;
  customerLng: number;
}) {
  const map = useMap();
  const coreLib = useMapsLibrary("core");
  const fitted = useRef(false);

  useEffect(() => {
    if (!map || !coreLib || fitted.current) return;
    fitted.current = true;
    const bounds = new coreLib.LatLngBounds(
      { lat: Math.min(storeLat, customerLat), lng: Math.min(storeLng, customerLng) },
      { lat: Math.max(storeLat, customerLat), lng: Math.max(storeLng, customerLng) },
    );
    map.fitBounds(bounds, 60);
  }, [map, coreLib, storeLat, storeLng, customerLat, customerLng]);

  return null;
}

function MapInner({ customerLat, customerLng }: { customerLat: number; customerLng: number }) {
  const { storeLat, storeLng } = DELIVERY_CONFIG;

  return (
    <Map
      mapId={GMAPS_MAP_ID}
      defaultCenter={{ lat: storeLat, lng: storeLng }}
      defaultZoom={13}
      gestureHandling="cooperative"
      disableDefaultUI={false}
      style={{ width: "100%", height: "100%" }}
    >
      <CameraFit
        storeLat={storeLat}
        storeLng={storeLng}
        customerLat={customerLat}
        customerLng={customerLng}
      />

      {/* Pin tienda */}
      <AdvancedMarker position={{ lat: storeLat, lng: storeLng }} title="Calzatura Vilchez">
        <Pin background="#c9a227" borderColor="#050505" glyphColor="#050505" scale={1.1} />
      </AdvancedMarker>

      {/* Pin cliente */}
      <AdvancedMarker position={{ lat: customerLat, lng: customerLng }} title="Dirección de entrega">
        <Pin background="#ef4444" borderColor="#7f1d1d" glyphColor="#fff" scale={1.2} />
      </AdvancedMarker>
    </Map>
  );
}

export default function OrderDeliveryMapReadOnly({ customerLat, customerLng, direccion }: Props) {
  if (!GMAPS_KEY) return null;

  return (
    <div className="order-delivery-map-admin">
      {direccion && (
        <p className="order-delivery-map-label">
          📍 {direccion}
        </p>
      )}
      <div className="order-delivery-map-container">
        <APIProvider apiKey={GMAPS_KEY}>
          <MapInner customerLat={customerLat} customerLng={customerLng} />
        </APIProvider>
      </div>
    </div>
  );
}
