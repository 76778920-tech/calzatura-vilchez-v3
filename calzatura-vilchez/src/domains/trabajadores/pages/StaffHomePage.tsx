import { Link } from "react-router-dom";
import { ArrowRight, CircleDollarSign, ShoppingBag, Store } from "lucide-react";
import { STAFF_ROUTES } from "@/routes/paths";

export default function StaffHomePage() {
  return (
    <div className="staff-home-page">
      <section className="staff-hero">
        <div className="staff-hero-icon" aria-hidden="true">
          <Store size={26} />
        </div>
        <div>
          <p className="staff-hero-kicker">Área tienda</p>
          <h1>Panel de tienda</h1>
          <p>Gestiona pedidos y ventas físicas con accesos rápidos y visibles para la operación diaria.</p>
        </div>
      </section>

      <div className="staff-action-grid" aria-label="Accesos del panel de tienda">
        <Link to={STAFF_ROUTES.orders} className="staff-action-card">
          <span className="staff-action-icon staff-action-icon-orders">
            <ShoppingBag size={24} />
          </span>
          <span className="staff-action-copy">
            <strong>Pedidos online</strong>
            <small>Revisa pedidos web, estados y datos de entrega.</small>
          </span>
          <ArrowRight size={18} className="staff-action-arrow" />
        </Link>

        <Link to={STAFF_ROUTES.sales} className="staff-action-card">
          <span className="staff-action-icon staff-action-icon-sales">
            <CircleDollarSign size={24} />
          </span>
          <span className="staff-action-copy">
            <strong>Ventas diarias</strong>
            <small>Registra ventas de tienda física y devoluciones.</small>
          </span>
          <ArrowRight size={18} className="staff-action-arrow" />
        </Link>
      </div>
    </div>
  );
}
