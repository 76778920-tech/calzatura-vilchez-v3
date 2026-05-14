import { aiAdminFetch } from "@/services/aiAdminClient";

// Render en plan gratuito puede tardar ~20-30 s en cold start.
const AI_FETCH_TIMEOUT_MS = 90_000;

/** `pathAndQuery` p. ej. `/api/predict/combined?horizon=30&history=120` (véase `aiAdminClient`). */
export async function fetchAI(pathAndQuery: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS);
  try {
    return await aiAdminFetch(pathAndQuery, { ...options, signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timer);
  }
}

export function describeAIError(cause: unknown): string {
  if (cause instanceof DOMException && cause.name === "AbortError") {
    return "El servicio tardó demasiado en responder. Si es la primera carga del día, espera unos segundos y pulsa Reintentar.";
  }
  if (cause instanceof Error && cause.message.includes("Sesión requerida")) {
    return "Debes iniciar sesión como administrador para usar el panel de IA.";
  }
  return cause instanceof Error ? cause.message : "Error desconocido al conectar con el servicio de IA.";
}

export type CacheEvent =
  | "full"
  | "stock_entry"
  | "product_created"
  | "product_updated"
  | "product_deleted"
  | "sale_recorded";

export async function invalidateAICache(event: CacheEvent = "full"): Promise<void> {
  try {
    await fetchAI("/api/cache/invalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
    });
  } catch {
    // El panel puede seguir consultando aunque el cache no se invalide.
  }
}

export async function fetchCombinedPredictionsJson(
  selectedHorizon: 7 | 15 | 30,
  selectedHistory: 30 | 60 | 90 | 120,
): Promise<unknown> {
  const res = await fetchAI(`/api/predict/combined?horizon=${selectedHorizon}&history=${selectedHistory}`);
  if (!res.ok) throw new Error("Error al conectar con el servicio de IA.");
  return res.json();
}
