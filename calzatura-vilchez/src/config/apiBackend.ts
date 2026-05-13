/**
 * Base URL del BFF (Express en Render, Fly, etc.), sin barra final.
 * Mismas rutas que las Cloud Functions (`/createOrder`, `/authLogin`, …).
 */
export function getBackendApiBaseUrl(): string {
  const raw = import.meta.env.VITE_BACKEND_API_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : "";
}
