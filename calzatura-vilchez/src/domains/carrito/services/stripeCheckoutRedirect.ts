import { loadStripe } from "@stripe/stripe-js";
import type { User } from "firebase/auth";
import { getBackendApiBaseUrl } from "@/config/apiBackend";

export async function redirectStripeCheckoutForOrder(user: User, orderId: string, stripePublicKey: string): Promise<void> {
  const base = getBackendApiBaseUrl();
  if (!base) {
    throw new Error("VITE_BACKEND_API_URL no configurada (BFF Stripe Checkout)");
  }

  const idToken = await user.getIdToken();
  const stripe = await loadStripe(stripePublicKey);
  if (!stripe) throw new Error("Stripe no disponible");

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

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || "No se pudo iniciar Stripe Checkout");
  }

  const checkout = stripe as unknown as {
    redirectToCheckout(args: { sessionId: string }): Promise<{ error?: Error }>;
  };
  const { error } = await checkout.redirectToCheckout({ sessionId: payload.sessionId });
  if (error) throw error;
}
