import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { fetchAllOrders, updateOrderStatus } from "@/domains/pedidos/services/orders";
import { panelFetchScopeForRole } from "@/security/accessControl";
import type { PanelFetchScope } from "@/security/panelScope";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import type { Order, OrderStatus } from "@/types";
import ImagePreviewModal from "@/domains/administradores/components/ImagePreviewModal";
import toast from "react-hot-toast";
import { ORDER_STATUS_LABELS, orderItemLineKey } from "@/domains/pedidos/utils/orderUtils";
import { OrderAddressBlock, OrderItemDetails } from "@/domains/pedidos/components/orderShared";
import { handleProductImageError } from "@/utils/imgUtils";
import { maskEmailForDisplay } from "@/utils/maskEmail";
import { AccessibleConfirmDialog } from "@/components/common/AccessibleConfirmDialog";
import { LoadingStatusRegion } from "@/components/common/LoadingStatusRegion";

const ESTADOS: OrderStatus[] = ["pendiente", "pagado", "enviado", "entregado", "cancelado"];
const ESTADO_TRANSICIONES: Record<OrderStatus, OrderStatus[]> = {
  pendiente: ["pagado", "cancelado"],
  pagado: ["enviado", "cancelado"],
  enviado: ["entregado"],
  entregado: [],
  cancelado: [],
};

const ESTADO_LABEL = ORDER_STATUS_LABELS as Record<OrderStatus, string>;

const STATUS_COLOR: Record<string, string> = {
  pendiente: "#f59e0b",
  pagado: "#3b82f6",
  enviado: "#8b5cf6",
  entregado: "#10b981",
  cancelado: "#ef4444",
};

const ADMIN_ORDERS_SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4"] as const;

function maskOperationalToken(value: string): string {
  const token = value.trim();
  if (token.length <= 8) return "***";
  return `${token.slice(0, 3)}***${token.slice(-4)}`;
}

export default function AdminOrders() {
  const { user, userProfile } = useAuth();
  const panelScope: PanelFetchScope = panelFetchScopeForRole(
    userProfile?.rol,
    user?.email ?? userProfile?.email,
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingStatusIds, setSavingStatusIds] = useState<ReadonlySet<string>>(() => new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string; subtitle?: string } | null>(null);
  const [statusChangePending, setStatusChangePending] = useState<{
    orderId: string;
    orderLabel: string;
    from: OrderStatus;
    to: OrderStatus;
  } | null>(null);

  const loadOrders = useCallback((showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setLoadError(null);
    fetchAllOrders(panelScope)
      .then(setOrders)
      .catch(() => {
        setOrders([]);
        setLoadError("No pudimos cargar los pedidos en este momento.");
      })
      .finally(() => setLoading(false));
  }, [panelScope]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => loadOrders(true), 0);
    return () => globalThis.clearTimeout(timer);
  }, [loadOrders]);

  useOrdersRealtime(loadOrders);

  const requestStatusChange = (order: Order, estado: OrderStatus) => {
    if (estado === order.estado || savingStatusIds.has(order.id)) return;
    if (!ESTADO_TRANSICIONES[order.estado]?.includes(estado)) {
      toast.error("Transicion de estado no permitida");
      return;
    }
    setStatusChangePending({
      orderId: order.id,
      orderLabel: order.id.slice(-8).toUpperCase(),
      from: order.estado,
      to: estado,
    });
  };

  const cancelStatusChange = () => {
    if (statusChangePending && savingStatusIds.has(statusChangePending.orderId)) return;
    setStatusChangePending(null);
  };

  const handleStatusChange = async (orderId: string, estado: OrderStatus) => {
    if (savingStatusIds.has(orderId)) return;
    setSavingStatusIds((prev) => new Set(prev).add(orderId));
    try {
      await updateOrderStatus(orderId, estado);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                estado,
                ...(estado === "pagado" ? { pagadoEn: new Date().toISOString() } : {}),
              }
            : o,
        ),
      );
      toast.success("Estado actualizado");
      setStatusChangePending(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al actualizar estado";
      toast.error(message);
    } finally {
      setSavingStatusIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const filtered = filterEstado === "todos"
    ? orders
    : orders.filter((o) => o.estado === filterEstado);

  let ordersMain: ReactNode;
  if (loading) {
    ordersMain = (
      <LoadingStatusRegion className="orders-skeleton" label="Cargando pedidos">
        {ADMIN_ORDERS_SKELETON_KEYS.map((id) => (
          <div key={id} className="skeleton-card" style={{ height: "80px" }} />
        ))}
      </LoadingStatusRegion>
    );
  } else if (loadError) {
    ordersMain = (
      <div className="empty-state">
        <AlertCircle size={64} className="empty-cart-icon" />
        <p>{loadError}</p>
        <button type="button" onClick={() => loadOrders(true)} className="btn-primary">
          <RefreshCw size={16} /> Reintentar
        </button>
      </div>
    );
  } else if (filtered.length === 0) {
    ordersMain = <p className="admin-empty">No hay pedidos con este estado.</p>;
  } else {
    ordersMain = (
        <div className="orders-list">
          {filtered.map((order) => (
            <div key={order.id} className="order-card" aria-busy={savingStatusIds.has(order.id)}>
              <div className="order-card-header">
                <button
                  type="button"
                  className="order-card-header-toggle"
                  disabled={savingStatusIds.has(order.id)}
                  aria-expanded={expanded === order.id}
                  aria-label={`Ver u ocultar detalle del pedido ${order.id.slice(-8).toUpperCase()}`}
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                >
                  <div className="order-card-meta">
                    <span className="order-id">#{order.id.slice(-8).toUpperCase()}</span>
                    <span className="order-email">{maskEmailForDisplay(order.userEmail)}</span>
                  </div>
                  <span className="order-total">S/ {order.total?.toFixed(2)}</span>
                  <span className="order-expand-btn" aria-hidden="true">
                    {expanded === order.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>
                <div className="order-card-info">
                  <select
                    value={
                      statusChangePending?.orderId === order.id
                        ? statusChangePending.from
                        : order.estado
                    }
                    disabled={savingStatusIds.has(order.id)}
                    onChange={(e) => requestStatusChange(order, e.target.value as OrderStatus)}
                    className="status-select"
                    style={{ color: STATUS_COLOR[order.estado] }}
                    aria-label={`Estado del pedido ${order.id.slice(-8).toUpperCase()}`}
                  >
                    {ESTADOS.map((s) => (
                      <option
                        key={s}
                        value={s}
                        disabled={s !== order.estado && !ESTADO_TRANSICIONES[order.estado]?.includes(s)}
                      >
                        {ESTADO_LABEL[s]}
                      </option>
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
                          disabled={savingStatusIds.has(order.id)}
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
                            onError={handleProductImageError}
                          />
                        </button>
                        <OrderItemDetails item={item} />
                      </div>
                    ))}
                  </div>
                  <OrderAddressBlock order={order} redactPii />
                  <div className="order-payment-info">
                    <p><strong>Método de pago:</strong> {order.metodoPago}</p>
                    {order.stripeSessionId && (
                      <p><strong>Session Stripe:</strong> {maskOperationalToken(order.stripeSessionId)}</p>
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

      {statusChangePending && (
        <AccessibleConfirmDialog
          title="Cambiar estado del pedido"
          description={(
            <p>
              Pedido #{statusChangePending.orderLabel}: cambiar de{" "}
              <strong>{ESTADO_LABEL[statusChangePending.from]}</strong> a{" "}
              <strong>{ESTADO_LABEL[statusChangePending.to]}</strong>.
            </p>
          )}
          confirmLabel="Actualizar estado"
          loadingLabel="Guardando..."
          loading={savingStatusIds.has(statusChangePending.orderId)}
          onCancel={cancelStatusChange}
          onConfirm={() => void handleStatusChange(statusChangePending.orderId, statusChangePending.to)}
        />
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
