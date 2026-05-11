/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base del BFF Express (Render, etc.): /createOrder, /authLogin, /createCheckoutSession, … */
  readonly VITE_BACKEND_API_URL?: string;
  /** URL completa del proxy de login si difiere de `VITE_BACKEND_API_URL/authLogin`. 0|false desactiva. */
  readonly VITE_AUTH_PROXY_LOGIN_URL?: string;
  readonly VITE_ORS_API_KEY?: string;
  readonly VITE_STORE_LAT?: string;
  readonly VITE_STORE_LNG?: string;
  readonly VITE_DELIVERY_BASE_PRICE?: string;
  readonly VITE_DELIVERY_PRICE_PER_KM?: string;
  readonly VITE_DELIVERY_FREE_KM?: string;
  readonly VITE_DELIVERY_MAX_KM?: string;
  /** minLat,minLon,maxLat,maxLon — acota geocodificación. off|none|0 desactiva. */
  readonly VITE_GEOCODE_BBOX?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
