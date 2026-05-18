import { Link } from "react-router-dom";
import { ShoppingBag, CircleDollarSign } from "lucide-react";
import { STAFF_ROUTES } from "@/routes/paths";

export default function StaffHomePage() {
  return (
    <div className="admin-page">
      <h1>Panel de tienda</h1>
      <p className="admin-page-subtitle">Gestión operativa: pedidos y ventas en tienda física.</p>
      <div className="admin-quick-links" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
        <Link to={STAFF_ROUTES.orders} className="admin-nav-item" style={{ padding: "1rem 1.25rem" }}>
          <ShoppingBag size={22} />
          <span>Pedidos online</span>
        </Link>
        <Link to={STAFF_ROUTES.sales} className="admin-nav-item" style={{ padding: "1rem 1.25rem" }}>
          <CircleDollarSign size={22} />
          <span>Ventas diarias</span>
        </Link>
      </div>
    </div>
  );
}
