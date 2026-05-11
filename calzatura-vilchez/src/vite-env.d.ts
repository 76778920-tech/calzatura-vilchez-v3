/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ORS_API_KEY?: string;
  readonly VITE_STORE_LAT?: string;
  readonly VITE_STORE_LNG?: string;
  readonly VITE_DELIVERY_BASE_PRICE?: string;
  readonly VITE_DELIVERY_PRICE_PER_KM?: string;
  readonly VITE_DELIVERY_FREE_KM?: string;
  readonly VITE_DELIVERY_MAX_KM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
