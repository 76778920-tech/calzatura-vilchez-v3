import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { fetchAllOrders, updateOrderStatus } from "@/domains/pedidos/services/orders";
import type { Order, OrderStatus } from "@/types";
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

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string; subtitle?: string } | null>(null);

  useEffect(() => {
    fetchAllOrders().then(setOrders).finally(() => setLoading(false));
  }, []);

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

      {loading ? (
        <div className="orders-skeleton">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton-card" style={{ height: "80px" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="admin-empty">No hay pedidos con este estado.</p>
      ) : (
        <div className="orders-list">
          {filtered.map((order) => (
            <div key={order.id} className="order-card">
              <div
                className="order-card-header"
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              >
                <div className="order-card-meta">
                  <span className="order-id">#{order.id.slice(-8).toUpperCase()}</span>
                  <span className="order-email">{order.userEmail}</span>
                </div>
                <div className="order-card-info">
                  <span className="order-total">S/ {order.total?.toFixed(2)}</span>
                  <select
                    value={order.estado}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleStatusChange(order.id, e.target.value as OrderStatus);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="status-select"
                    style={{ color: STATUS_COLOR[order.estado] }}
                  >
                    {ESTADOS.map((s) => (
                      <option key={s} value={s}>{ESTADO_LABEL[s]}</option>
                    ))}
                  </select>
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
      )}

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
