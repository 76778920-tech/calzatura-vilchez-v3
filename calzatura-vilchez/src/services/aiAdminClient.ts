import { auth } from "@/firebase/config";

/**
 * Modo de autenticación (Option B): el frontend envía el Firebase ID token
 * directamente al servicio IA en Render. Render verifica la firma y comprueba
 * que el email esté en SUPERADMIN_EMAILS. Sin VITE_AI_SERVICE_BEARER_TOKEN
 * en el bundle — el guard en vite.config.ts rechaza builds que lo incluyan.
 *
 * Si VITE_AI_ADMIN_PROXY_URL está definido (modo proxy legado con Cloud Function),
 * las peticiones pasan por ella; la auth sigue siendo Firebase ID token.
 */
const PROXY_URL  = (import.meta.env.VITE_AI_ADMIN_PROXY_URL as string | undefined)?.trim();
const DIRECT_BASE = (import.meta.env.VITE_AI_SERVICE_URL as string | undefined)?.trim() ?? "http://localhost:8000";

async function firebaseUserHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Sesión requerida para consultar el servicio de IA.");
  }
  const idToken = await user.getIdToken();
  return { Authorization: `Bearer ${idToken}` };
}

/** Siempre Firebase ID token — tanto en modo proxy como en modo directo (Option B). */
async function authHeaders(): Promise<Record<string, string>> {
  return firebaseUserHeaders();
}

/** Convierte ruta del servicio IA directo en query de la Cloud Function (lista blanca). */
function toProxyUrl(pathAndQuery: string): string {
  const u = new URL(pathAndQuery, "https://placeholder.local");
  const q = new URLSearchParams();

  if (u.pathname === "/api/predict/combined") {
    q.set("op", "combined");
    u.searchParams.forEach((val, key) => q.set(key, val));
    return `${PROXY_URL!.replace(/\/$/, "")}?${q.toString()}`;
  }
  if (u.pathname === "/api/sales/weekly-chart") {
    q.set("op", "weeklyChart");
    u.searchParams.forEach((val, key) => q.set(key, val));
    return `${PROXY_URL!.replace(/\/$/, "")}?${q.toString()}`;
  }
  if (u.pathname === "/api/model/metrics") {
    q.set("op", "modelMetrics");
    return `${PROXY_URL!.replace(/\/$/, "")}?${q.toString()}`;
  }
  if (u.pathname === "/api/ire/historial") {
    q.set("op", "ireHistorial");
    u.searchParams.forEach((val, key) => q.set(key, val));
    return `${PROXY_URL!.replace(/\/$/, "")}?${q.toString()}`;
  }
  if (u.pathname === "/api/cache/invalidate") {
    q.set("op", "cacheInvalidate");
    return `${PROXY_URL!.replace(/\/$/, "")}?${q.toString()}`;
  }
  if (u.pathname === "/api/campaign/active") {
    q.set("op", "campaignActive");
    return `${PROXY_URL!.replace(/\/$/, "")}?${q.toString()}`;
  }
  if (u.pathname === "/api/campaign/feedback") {
    q.set("op", "campaignFeedback");
    return `${PROXY_URL!.replace(/\/$/, "")}?${q.toString()}`;
  }
  if (u.pathname === "/api/predict/campaign-detection") {
    q.set("op", "campaignDetection");
    u.searchParams.forEach((val, key) => q.set(key, val));
    return `${PROXY_URL!.replace(/\/$/, "")}?${q.toString()}`;
  }
  if (u.pathname === "/api/campaign/learning-stats") {
    q.set("op", "learningStats");
    return `${PROXY_URL!.replace(/\/$/, "")}?${q.toString()}`;
  }

  throw new Error(`Ruta de IA no permitida en proxy: ${u.pathname}`);
}

/**
 * Petición autenticada al servicio de IA con Firebase ID token.
 * `pathAndQuery` debe empezar por `/api/...` incluyendo querystring si aplica.
 */
export async function aiAdminFetch(pathAndQuery: string, init?: RequestInit): Promise<Response> {
  const rel = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  const headers = { ...(await authHeaders()), ...(init?.headers as Record<string, string> | undefined) };
  if (PROXY_URL) {
    return fetch(toProxyUrl(rel), { ...init, headers });
  }
  const base = DIRECT_BASE.replace(/\/$/, "");
  return fetch(`${base}${rel}`, { ...init, headers });
}

export function aiAdminUsesProxy(): boolean {
  return Boolean(PROXY_URL);
}

/**
 * Llama a /api/health (sin auth) para despertar el servicio en cold-start.
 * Fire-and-forget: nunca lanza ni bloquea.
 */
export function wakeAIService(): void {
  const base = DIRECT_BASE.replace(/\/$/, "");
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 6_000);
  fetch(`${base}/api/health`, { signal: controller.signal })
    .catch(() => { /* warm-up silencioso */ })
    .finally(() => window.clearTimeout(timer));
}
