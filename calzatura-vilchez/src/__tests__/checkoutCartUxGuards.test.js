import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const checkoutSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/domains/carrito/pages/CheckoutPage.tsx"),
  "utf8",
);
const cartSidebarSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/domains/carrito/components/CartSidebar.tsx"),
  "utf8",
);
const cartSharedSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/domains/carrito/components/cartShared.tsx"),
  "utf8",
);

describe("Carrito/Checkout UX guards", () => {
  it("deshabilita Stripe en UI cuando no hay public key y cae en contraentrega", () => {
    expect(checkoutSource).toContain("STRIPE_CONFIGURED");
    expect(checkoutSource).toContain('STRIPE_CONFIGURED ? "stripe" : "contraentrega"');
    expect(checkoutSource).toContain("disabled={!STRIPE_CONFIGURED}");
    expect(checkoutSource).toContain("No disponible: falta configurar Stripe en produccion");
  });

  it("muestra error persistente y reintento en checkout", () => {
    expect(checkoutSource).toContain("const [orderError, setOrderError]");
    expect(checkoutSource).toContain('role="alert"');
    expect(checkoutSource).toContain("Reintentar pedido");
    expect(checkoutSource).toContain("Precios, stock y disponibilidad se validan nuevamente");
  });

  it("el carrito vacio navega al catalogo y controles icon-only tienen nombre accesible", () => {
    expect(cartSidebarSource).toContain('<Link to="/productos"');
    expect(cartSidebarSource).toContain('aria-label="Cerrar carrito"');
    expect(cartSidebarSource).toContain("Quitar ${item.product.nombre} del carrito");
    expect(cartSharedSource).toContain("Aumentar cantidad de");
    expect(cartSharedSource).toContain("Disminuir cantidad de");
    expect(cartSharedSource).toContain("toast.error");
  });
});
