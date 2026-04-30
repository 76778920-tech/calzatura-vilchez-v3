import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ChevronDown, ChevronUp } from "lucide-react";
import { fetchOrdersByUser } from "@/domains/pedidos/services/orders";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import type { Order } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export default function OrderHistoryPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchOrdersByUser(user.uid)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <main className="empty-cart-page">
        <h2>Debes iniciar sesión</h2>
        <Link to="/login" className="btn-primary">Iniciar Sesión</Link>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="orders-page">
        <h1>Mis Pedidos</h1>
        <div className="orders-skeleton">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton-card" style={{ height: "80px" }} />)}
        </div>
      </main>
    );
  }

  return (
    <main className="orders-page">
      <h1>Mis Pedidos</h1>

      {orders.length === 0 ? (
        <div className="empty-state">
          <Package size={64} className="empty-cart-icon" />
          <p>No tienes pedidos aún</p>
          <Link to="/productos" className="btn-primary">Empezar a Comprar</Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div
                className="order-card-header"
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              >
                <div className="order-card-meta">
                  <span className="order-id">#{order.id.slice(-8).toUpperCase()}</span>
                  <span className={`order-status-badge status-${order.estado}`}>
                    {STATUS_LABELS[order.estado] ?? order.estado}
                  </span>
                </div>
                <div className="order-card-info">
                  <span className="order-total">S/ {order.total?.toFixed(2)}</span>
                  <span className="order-items-count">
                    {order.items?.reduce((a, i) => a + i.quantity, 0)} producto(s)
                  </span>
                </div>
                <button className="order-expand-btn">
                  {expanded === order.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {expanded === order.id && (
                <div className="order-card-body">
                  <div className="order-items-list">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="order-item">
                        <img
                          src={item.product?.imagen || "/placeholder-product.svg"}
                          alt={item.product?.nombre}
                          className="order-item-img"
                          onError={(e) => {
                            const image = e.target as HTMLImageElement;
                            image.onerror = null;
                            image.src = "/placeholder-product.svg";
                          }}
                        />
                        <div>
                          <p>{item.product?.nombre}</p>
                          {item.color && <p className="order-item-talla">Color: {item.color}</p>}
                          {item.talla && <p className="order-item-talla">Talla: {item.talla}</p>}
                          <p>x{item.quantity} — S/ {((item.product?.precio ?? 0) * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="order-address">
                    <strong>Dirección de entrega:</strong>
                    <p>{order.direccion?.nombre} {order.direccion?.apellido}</p>
                    <p>{order.direccion?.direccion}, {order.direccion?.distrito}, {order.direccion?.ciudad}</p>
                    <p>Tel: {order.direccion?.telefono}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
