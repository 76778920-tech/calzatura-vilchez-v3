import fs from "node:fs";
import path from "node:path";

/**
 * Fuentes del flujo de checkout. Los guards validan el modulo completo, no solo CheckoutPage.tsx,
 * para que sigan vigentes cuando el paso de pago o direccion viven en subcomponentes.
 */
export const CHECKOUT_GUARD_REL_PATHS = [
  "src/domains/carrito/pages/CheckoutPage.tsx",
  "src/domains/carrito/pages/checkout/CheckoutPagoStep.tsx",
  "src/domains/carrito/pages/checkout/CheckoutDireccionStep.tsx",
  "src/domains/carrito/pages/checkout/CheckoutPageBlocked.tsx",
  "src/domains/carrito/pages/checkout/CheckoutOrderSummary.tsx",
];

export function readCheckoutGuardSources() {
  const cwd = process.cwd();
  return CHECKOUT_GUARD_REL_PATHS.map((rel) =>
    fs.readFileSync(path.resolve(cwd, rel), "utf8"),
  ).join("\n\n");
}
