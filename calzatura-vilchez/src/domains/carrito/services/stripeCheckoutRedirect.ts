import { loadStripe } from "@stripe/stripe-js";
import type { User } from "firebase/auth";

const STRIPE_CHECKOUT_URL =
  "https://us-central1-calzaturavilchez-ab17f.cloudfunctions.net/createCheckoutSession";

export async function redirectStripeCheckoutForOrder(user: User, orderId: string, stripePublicKey: string): Promise<void> {
  const idToken = await user.getIdToken();
  const stripe = await loadStripe(stripePublicKey);
  if (!stripe) throw new Error("Stripe no disponible");

  const res = await fetch(STRIPE_CHECKOUT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ orderId }),
  });

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
