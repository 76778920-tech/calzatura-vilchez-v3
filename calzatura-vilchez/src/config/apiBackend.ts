import { assertHttpsInProduction } from "@/utils/requireHttpsInProd";

/**
 * Base URL del BFF (Express en Render, Fly, etc.), sin barra final.
 * Mismas rutas que las Cloud Functions (`/createOrder`, `/authLogin`, …).
 */
export function getBackendApiBaseUrl(): string {
  const raw = import.meta.env.VITE_BACKEND_API_URL?.trim();
  const base = raw ? raw.replace(/\/$/, "") : "";
  return assertHttpsInProduction(base, "VITE_BACKEND_API_URL");
}
