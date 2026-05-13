import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { fetchAllOrders, updateOrderStatus } from "@/domains/pedidos/services/orders";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import type { CartItem, Order, OrderStatus } from "@/types";
import ImagePreviewModal from "@/domains/administradores/components/ImagePreviewModal";
import toast from "react-hot-toast";

const ESTADOS: OrderStatus[] = ["pendiente", "pagado", "enviado", "entregado", "cancelado"];

const ESTADO_LABEL: Record<OrderStatus, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  pendiente: "#f59e0b",
  pagado: "#3b82f6",
  enviado: "#8b5cf6",
  entregado: "#10b981",
  cancelado: "#ef4444",
};

const ADMIN_ORDERS_SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4"] as const;

function orderItemLineKey(item: CartItem, lineIndex: number) {
  const pid = item.product?.id ?? "unknown";
  return `${pid}-${item.color ?? ""}-${item.talla ?? ""}-q${item.quantity}-i${lineIndex}`;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string; subtitle?: string } | null>(null);

  const loadOrders = useCallback(() => {
    fetchAllOrders().then(setOrders).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useOrdersRealtime(loadOrders);

  const handleStatusChange = async (orderId: string, estado: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, estado);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, estado } : o))
      );
      toast.success("Estado actualizado");
    } catch {
      toast.error("Error al actualizar estado");
    }
  };

  const filtered = filterEstado === "todos"
    ? orders
    : orders.filter((o) => o.estado === filterEstado);

  let ordersMain: ReactNode;
  if (loading) {
    ordersMain = (
      <div className="orders-skeleton">
        {ADMIN_ORDERS_SKELETON_KEYS.map((id) => (
          <div key={id} className="skeleton-card" style={{ height: "80px" }} />
        ))}
      </div>
    );
  } else if (filtered.length === 0) {
    ordersMain = <p className="admin-empty">No hay pedidos con este estado.</p>;
  } else {
    ordersMain = (
        <div className="orders-list">
          {filtered.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-card-header">
                <button
                  type="button"
                  className="order-card-header-toggle"
                  aria-expanded={expanded === order.id}
                  aria-label={`Ver u ocultar detalle del pedido ${order.id.slice(-8).toUpperCase()}`}
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                >
                  <div className="order-card-meta">
                    <span className="order-id">#{order.id.slice(-8).toUpperCase()}</span>
                    <span className="order-email">{order.userEmail}</span>
                  </div>
                  <span className="order-total">S/ {order.total?.toFixed(2)}</span>
                  <span className="order-expand-btn" aria-hidden="true">
                    {expanded === order.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>
                <div className="order-card-info">
                  <select
                    value={order.estado}
                    onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                    className="status-select"
                    style={{ color: STATUS_COLOR[order.estado] }}
                  >
                    {ESTADOS.map((s) => (
                      <option key={s} value={s}>{ESTADO_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {expanded === order.id && (
                <div className="order-card-body">
                  <div className="order-items-list">
                    {order.items?.map((item, idx) => (
                      <div key={orderItemLineKey(item, idx)} className="order-item">
                        <button
                          type="button"
                          className="order-item-img-button"
                          onClick={() => setPreviewImage({
                            src: item.product?.imagen || "/placeholder-product.svg",
                            title: item.product?.nombre || "Producto",
                            subtitle: `Pedido #${order.id.slice(-8).toUpperCase()}`,
                          })}
                          aria-label={`Abrir imagen de ${item.product?.nombre || "producto"}`}
                        >
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
                        </button>
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
                  <div className="order-payment-info">
                    <p><strong>Método de pago:</strong> {order.metodoPago}</p>
                    {order.stripeSessionId && (
                      <p><strong>Session Stripe:</strong> {order.stripeSessionId}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Pedidos ({filtered.length})</h1>
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="form-input"
          style={{ width: "auto" }}
        >
          <option value="todos">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
          ))}
        </select>
      </div>

      {ordersMain}

      {previewImage && (
        <ImagePreviewModal
          src={previewImage.src}
          title={previewImage.title}
          subtitle={previewImage.subtitle}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
