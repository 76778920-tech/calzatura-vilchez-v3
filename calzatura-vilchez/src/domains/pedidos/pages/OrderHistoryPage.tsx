import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ChevronDown, ChevronUp } from "lucide-react";
import { fetchOrdersByUser } from "@/domains/pedidos/services/orders";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import type { Order } from "@/types";
import { ORDER_STATUS_LABELS, orderItemLineKey } from "@/domains/pedidos/utils/orderUtils";
import { OrderAddressBlock, OrderItemDetails } from "@/domains/pedidos/components/orderShared";
import { handleProductImageError } from "@/utils/imgUtils";

const ORDER_HISTORY_SKELETON_KEYS = ["sk-1", "sk-2", "sk-3"] as const;

export default function OrderHistoryPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadOrders = useCallback(() => {
    if (!user) return;
    fetchOrdersByUser(user.uid)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      loadOrders();
    });
  }, [loadOrders]);

  useOrdersRealtime(loadOrders, user?.uid);

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
          {ORDER_HISTORY_SKELETON_KEYS.map((id) => (
            <div key={id} className="skeleton-card" style={{ height: "80px" }} />
          ))}
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
              <button
                type="button"
                className="order-card-header"
                aria-expanded={expanded === order.id}
                aria-label={`Ver u ocultar detalle del pedido ${order.id.slice(-8).toUpperCase()}`}
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              >
                <div className="order-card-meta">
                  <span className="order-id">#{order.id.slice(-8).toUpperCase()}</span>
                  <span className={`order-status-badge status-${order.estado}`}>
                    {ORDER_STATUS_LABELS[order.estado] ?? order.estado}
                  </span>
                </div>
                <div className="order-card-info">
                  <span className="order-total">S/ {order.total?.toFixed(2)}</span>
                  <span className="order-items-count">
                    {order.items?.reduce((a, i) => a + i.quantity, 0)} producto(s)
                  </span>
                </div>
                <span className="order-expand-btn" aria-hidden="true">
                  {expanded === order.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </button>

              {expanded === order.id && (
                <div className="order-card-body">
                  <div className="order-items-list">
                    {order.items?.map((item, idx) => (
                      <div key={orderItemLineKey(item, idx)} className="order-item">
                        <img
                          src={item.product?.imagen || "/placeholder-product.svg"}
                          alt={item.product?.nombre}
                          className="order-item-img"
                          onError={handleProductImageError}
                        />
                        <OrderItemDetails item={item} />
                      </div>
                    ))}
                  </div>
                  <OrderAddressBlock order={order} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
