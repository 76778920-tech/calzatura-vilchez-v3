import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";

type CheckoutPageBlockedProps =
  | { reason: "empty-cart" }
  | { reason: "login-required" };

export function CheckoutPageBlocked(props: CheckoutPageBlockedProps) {
  if (props.reason === "empty-cart") {
    return (
      <main className="empty-cart-page">
        <ShoppingBag size={72} className="empty-cart-icon" />
        <h2>Tu carrito está vacío</h2>
        <Link to="/productos" className="btn-primary">
          Ver Productos
        </Link>
      </main>
    );
  }

  return (
    <main className="empty-cart-page">
      <h2>Debes iniciar sesión para continuar</h2>
      <Link to="/login" className="btn-primary">
        Iniciar Sesión
      </Link>
    </main>
  );
}
