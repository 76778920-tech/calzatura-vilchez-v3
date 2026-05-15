import { auth } from "@/firebase/config";
import { assertHttpsInProduction } from "@/utils/requireHttpsInProd";

/**
 * Modo de autenticación (Option B): el frontend envía el Firebase ID token
 * directamente al servicio IA en Render. Render verifica la firma y comprueba
 * que el email esté en SUPERADMIN_EMAILS. Sin VITE_AI_SERVICE_BEARER_TOKEN
 * en el bundle — el guard en vite.config.ts rechaza builds que lo incluyan.
 *
 * Si VITE_AI_ADMIN_PROXY_URL está definido (modo proxy legado con Cloud Function),
 * las peticiones pasan por ella; la auth sigue siendo Firebase ID token.
 */
const PROXY_URL_RAW = (import.meta.env.VITE_AI_ADMIN_PROXY_URL as string | undefined)?.trim() ?? "";
const PROXY_BASE = PROXY_URL_RAW
  ? assertHttpsInProduction(PROXY_URL_RAW.replaceAll(/\/$/g, ""), "VITE_AI_ADMIN_PROXY_URL")
  : "";

function directAiServiceBase(): string {
  const fromEnv = (import.meta.env.VITE_AI_SERVICE_URL as string | undefined)?.trim() ?? "";
  if (fromEnv) return assertHttpsInProduction(fromEnv.replaceAll(/\/$/g, ""), "VITE_AI_SERVICE_URL");
  if (import.meta.env.PROD) return "";
  return "http://localhost:8000";
}

const DIRECT_BASE = directAiServiceBase();

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

const PROXY_ROUTES: Record<string, { op: string; forwardParams?: boolean }> = {
  "/api/predict/combined":           { op: "combined",         forwardParams: true },
  "/api/sales/weekly-chart":         { op: "weeklyChart",      forwardParams: true },
  "/api/model/metrics":              { op: "modelMetrics" },
  "/api/ire/historial":              { op: "ireHistorial",     forwardParams: true },
  "/api/cache/invalidate":           { op: "cacheInvalidate" },
  "/api/campaign/active":            { op: "campaignActive" },
  "/api/campaign/feedback":          { op: "campaignFeedback" },
  "/api/predict/campaign-detection": { op: "campaignDetection", forwardParams: true },
  "/api/campaign/learning-stats":    { op: "learningStats" },
};

/** Convierte ruta del servicio IA directo en query de la Cloud Function (lista blanca). */
function toProxyUrl(pathAndQuery: string): string {
  const u = new URL(pathAndQuery, "https://placeholder.local");
  if (!PROXY_BASE) {
    throw new Error("Proxy de IA no configurado.");
  }

  const route = PROXY_ROUTES[u.pathname];
  if (!route) {
    throw new Error(`Ruta de IA no permitida en proxy: ${u.pathname}`);
  }

  const q = new URLSearchParams();
  q.set("op", route.op);
  if (route.forwardParams) {
    u.searchParams.forEach((val, key) => q.set(key, val));
  }
  return `${PROXY_BASE}?${q.toString()}`;
}

/**
 * Petición autenticada al servicio de IA con Firebase ID token.
 * `pathAndQuery` debe empezar por `/api/...` incluyendo querystring si aplica.
 */
export async function aiAdminFetch(pathAndQuery: string, init?: RequestInit): Promise<Response> {
  const rel = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  const headers = { ...(await authHeaders()), ...(init?.headers as Record<string, string> | undefined) };
  if (PROXY_BASE) {
    return fetch(toProxyUrl(rel), { ...init, headers });
  }
  const base = DIRECT_BASE.replaceAll(/\/$/g, "");
  if (!base) {
    throw new Error("En producción define VITE_AI_SERVICE_URL (https) o VITE_AI_ADMIN_PROXY_URL.");
  }
  return fetch(`${base}${rel}`, { ...init, headers });
}

export function aiAdminUsesProxy(): boolean {
  return Boolean(PROXY_BASE);
}

/**
 * Llama a /api/health (sin auth) para despertar el servicio en cold-start.
 * Fire-and-forget: nunca lanza ni bloquea.
 */
export function wakeAIService(): void {
  const base = DIRECT_BASE.replaceAll(/\/$/g, "");
  if (!base) return;
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 6_000);
  fetch(`${base}/api/health`, { signal: controller.signal })
    .catch(() => { /* warm-up silencioso */ })
    .finally(() => globalThis.clearTimeout(timer));
}
