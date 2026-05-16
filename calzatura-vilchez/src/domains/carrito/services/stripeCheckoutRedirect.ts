import type { User } from "firebase/auth";
import { getBackendApiBaseUrl } from "@/config/apiBackend";

/**
 * Stripe.js ya no expone `redirectToCheckout` en versiones recientes.
 * El flujo correcto es abrir la URL hospedada que devuelve la API (`session.url`).
 */
export async function redirectStripeCheckoutForOrder(user: User, orderId: string): Promise<void> {
  const base = getBackendApiBaseUrl();
  if (!base) {
    throw new Error("VITE_BACKEND_API_URL no configurada (BFF Stripe Checkout)");
  }

  const idToken = await user.getIdToken();
  let res: Response;
  try {
    res = await fetch(`${base}/createCheckoutSession`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ orderId }),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor de pagos. Intenta otra vez en unos segundos.");
  }

  const payload = (await res.json()) as { error?: string; url?: string; sessionId?: string };
  if (!res.ok) {
    throw new Error(payload.error || "No se pudo iniciar Stripe Checkout");
  }

  const url = typeof payload.url === "string" ? payload.url.trim() : "";
  if (url.startsWith("https://") || url.startsWith("http://")) {
    globalThis.location.assign(url);
    return;
  }

  console.error("[createCheckoutSession] Respuesta sin URL usable", {
    status: res.status,
    keys: payload && typeof payload === "object" ? Object.keys(payload) : [],
    urlType: typeof payload.url,
  });

  throw new Error(
    "El servidor no devolvio la URL de pago de Stripe. Actualiza el BFF (createCheckoutSession debe incluir `url`).",
  );
}
