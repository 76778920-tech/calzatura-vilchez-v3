import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Package, ShoppingBag, Users, TrendingUp, CircleDollarSign,
  AlertCircle, X, MapPin, Phone, Mail, ChevronRight,
  BarChart2, Clock, Store, Globe,
} from "lucide-react";
import {
  computeDashboardFromFetchedData,
  getLast7Days,
  toDate,
  type DashboardStats,
} from "@/domains/administradores/utils/adminDashboardMetrics";
import { fetchProducts } from "@/domains/productos/services/products";
import { fetchAllOrders } from "@/domains/pedidos/services/orders";
import { fetchDailySales, fetchProductFinancials } from "@/domains/ventas/services/finance";
import { fetchAllUsers } from "@/domains/usuarios/services/users";
import { fetchRecentAudit } from "@/services/audit";
import type { Order, CartItem } from "@/types";
import type { AuditEntry } from "@/services/audit";
import { ADMIN_ROUTES } from "@/routes/paths";
import toast from "react-hot-toast";

// ─── helpers ───────────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function greetingText() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function formatCurrency(n: number) {
  return `S/ ${n.toFixed(2)}`;
}

function formatChartAxis(n: number) {
  if (n >= 1000) {
    const k = n / 1000;
    return `S/ ${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `S/ ${Math.round(n)}`;
}

function formatChartBarLabel(n: number) {
  if (n <= 0) return "";
  if (n >= 1000) return formatChartAxis(n);
  return `S/ ${Math.round(n)}`;
}

function chartScaleMax(values: number[]): number {
  const maxVal = Math.max(...values, 0);
  if (maxVal <= 0) return 100;
  const step = maxVal <= 80 ? 20 : maxVal <= 200 ? 50 : maxVal <= 600 ? 100 : maxVal <= 1500 ? 250 : 500;
  return Math.ceil(maxVal / step) * step;
}

function buildYAxisTicks(max: number, segments = 4): number[] {
  return Array.from({ length: segments + 1 }, (_, i) => (max / segments) * (segments - i));
}

const STATUS_COLOR: Record<string, string> = {
  pendiente: "#f59e0b",
  pagado: "#3b82f6",
  enviado: "#8b5cf6",
  entregado: "#10b981",
  cancelado: "#ef4444",
};

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

function dashboardOrderLineKey(item: CartItem, lineIndex: number) {
  const pid = item.product?.id ?? "unknown";
  return `${pid}-${item.color ?? ""}-${item.talla ?? ""}-q${item.quantity}-i${lineIndex}`;
}

// ─── Order Detail Modal ─────────────────────────────────────────────────────

function OrderDetailModal({ order, onClose }: Readonly<{ order: Order; onClose: () => void }>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="dash-order-modal-root">
      <button type="button" className="dash-order-modal-backdrop" aria-label="Cerrar" onClick={onClose} />
      <dialog
        open
        className="modal dash-order-modal"
        aria-modal="true"
        aria-labelledby="dash-order-modal-title"
      >
        <div className="modal-header">
          <div>
            <p className="dash-modal-kicker">Detalle del Pedido</p>
            <h2 id="dash-order-modal-title" className="dash-modal-title">#{order.id.slice(-8).toUpperCase()}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="dash-modal-body">
          {/* Status + Date */}
          <div className="dash-modal-meta">
            <span
              className="order-status-badge"
              style={{ background: STATUS_COLOR[order.estado] + "22", color: STATUS_COLOR[order.estado] }}
            >
              {STATUS_LABEL[order.estado] ?? order.estado}
            </span>
            <span className="dash-modal-date">
              <Clock size={13} />
              {toDate(order.creadoEn).toLocaleDateString("es-PE", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </span>
          </div>

          {/* Customer */}
          <div className="dash-modal-section">
            <p className="dash-modal-section-title">Cliente</p>
            <div className="dash-modal-info-grid">
              <span className="dash-modal-info-item"><Mail size={14} /> {order.userEmail}</span>
              {order.direccion?.telefono && (
                <span className="dash-modal-info-item"><Phone size={14} /> {order.direccion.telefono}</span>
              )}
              {order.direccion && (
                <span className="dash-modal-info-item">
                  <MapPin size={14} />
                  {order.direccion.nombre} {order.direccion.apellido} — {order.direccion.direccion}, {order.direccion.distrito}, {order.direccion.ciudad}
                </span>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="dash-modal-section">
            <p className="dash-modal-section-title">Productos ({order.items.length})</p>
            <div className="dash-modal-items">
              {order.items.map((item, idx) => (
                <div key={dashboardOrderLineKey(item, idx)} className="dash-modal-item-row">
                  {item.product.imagen && (
                    <img src={item.product.imagen} alt={item.product.nombre} className="dash-modal-item-img" />
                  )}
                  <div className="dash-modal-item-info">
                    <p className="dash-modal-item-name">{item.product.nombre}</p>
                    {item.color && <p className="dash-modal-item-meta">Color: {item.color}</p>}
                    {item.talla && <p className="dash-modal-item-meta">Talla: {item.talla}</p>}
                  </div>
                  <div className="dash-modal-item-price">
                    <p className="dash-modal-item-qty">×{item.quantity}</p>
                    <p>{formatCurrency(item.product.precio * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="dash-modal-totals">
            <div className="dash-modal-total-row">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="dash-modal-total-row">
              <span>Envío</span>
              <span>{order.envio > 0 ? formatCurrency(order.envio) : "Gratis"}</span>
            </div>
            <div className="dash-modal-total-row dash-modal-grand-total">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="dash-modal-actions">
            <Link to={ADMIN_ROUTES.orders} className="btn btn-primary" onClick={onClose}>
              Ver en Pedidos <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </dialog>
    </div>
  );
}

// ─── Bar Chart ──────────────────────────────────────────────────────────────

function SalesBarChart({
  days,
  values,
  variant,
}: Readonly<{ days: string[]; values: number[]; variant: "web" | "tienda" }>) {
  const total = values.reduce((sum, v) => sum + v, 0);
  const scaleMax = chartScaleMax(values);
  const yTicks = buildYAxisTicks(scaleMax);
  const panelClass = variant === "web" ? "dash-bar-chart--web" : "dash-bar-chart--tienda";
  const fillClass = variant === "web" ? "dash-bar-chart-fill-web" : "dash-bar-chart-fill-tienda";

  return (
    <div className={`dash-bar-chart ${panelClass}`}>
      <div className="dash-bar-chart-summary">
        <span>Total 7 días</span>
        <strong>{formatCurrency(total)}</strong>
      </div>

      <div className="dash-bar-chart-body">
        <div className="dash-bar-chart-yaxis" aria-hidden="true">
          {yTicks.map((tick) => (
            <span key={tick}>{formatChartAxis(tick)}</span>
          ))}
        </div>

        <div className="dash-bar-chart-plot">
          <div className="dash-bar-chart-grid" aria-hidden="true">
            {yTicks.map((tick) => (
              <div key={tick} className="dash-bar-chart-grid-line" />
            ))}
          </div>

          <div
            className="dash-bar-chart-bars"
            role="img"
            aria-label={`Ventas por día, total ${formatCurrency(total)}`}
          >
            {days.map((label, i) => {
              const amount = values[i];
              const pct = scaleMax > 0 ? (amount / scaleMax) * 100 : 0;
              const barHeight = amount > 0 ? Math.max(pct, 6) : 0;
              const colClass = amount > 0 ? "dash-bar-chart-col dash-bar-chart-col--active" : "dash-bar-chart-col";
              return (
                <div key={`${label}-${i}`} className={colClass} title={`${label}: ${formatCurrency(amount)}`}>
                  <span className="dash-bar-chart-val">{formatChartBarLabel(amount)}</span>
                  <div className="dash-bar-chart-bar-area">
                    <div
                      className={`dash-bar-chart-fill ${fillClass}`}
                      style={{ height: amount > 0 ? `${barHeight}%` : "0%" }}
                    />
                  </div>
                  <span className="dash-bar-chart-day">{label}</span>
                </div>
              );
            })}
          </div>

          {total === 0 && (
            <p className="dash-bar-chart-empty">Sin ventas registradas en los últimos 7 días</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ChannelSectionHeading({
  icon,
  title,
  subtitle,
  titleId,
}: Readonly<{ icon: ReactNode; title: string; subtitle: string; titleId?: string }>) {
  return (
    <div className="dash-channel-heading">
      <span className="dash-channel-heading-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <h2 id={titleId} className="dash-channel-title">{title}</h2>
        <p className="dash-channel-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Status Donut ────────────────────────────────────────────────────────────

function OrderStatusSummary({ orders }: Readonly<{ orders: Order[] }>) {
  const statuses = ["pendiente", "pagado", "enviado", "entregado", "cancelado"];
  const counts = statuses.map((s) => ({ status: s, count: orders.filter((o) => o.estado === s).length }));
  const total = orders.length || 1;
  return (
    <div className="dash-status-list">
      {counts.map(({ status, count }) => (
        <div key={status} className="dash-status-row">
          <span className="dash-status-dot" style={{ background: STATUS_COLOR[status] }} />
          <span className="dash-status-name">{STATUS_LABEL[status]}</span>
          <div className="dash-status-bar-track">
            <div
              className="dash-status-bar-fill"
              style={{ width: `${(count / total) * 100}%`, background: STATUS_COLOR[status] }}
            />
          </div>
          <span className="dash-status-count">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    productos: 0,
    pedidos: 0,
    pendientes: 0,
    usuarios: 0,
    ingresosWeb: 0,
    ingresosTienda: 0,
    ingresosTotales: 0,
    gananciasTotales: 0,
    ventasHoyWeb: 0,
    ventasHoyTienda: 0,
    gananciaHoyWeb: 0,
    gananciaHoyTienda: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [chartWeb, setChartWeb] = useState<number[]>(new Array(7).fill(0));
  const [chartTienda, setChartTienda] = useState<number[]>(new Array(7).fill(0));
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [auditError, setAuditError] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const last7Days = getLast7Days();

  const loadDashboard = useCallback(() => {
    const today = todayISO();
    setLoading(true);
    setLoadError(false);
    void fetchRecentAudit(10).then(setAuditLog).catch(() => setAuditError(true));

    return Promise.all([
      fetchProducts(),
      fetchAllOrders(),
      fetchDailySales(),
      fetchProductFinancials(),
      fetchAllUsers(),
    ])
      .then(([products, orders, sales, financials, users]) => {
        const { stats, chart } = computeDashboardFromFetchedData(
          today,
          last7Days,
          products,
          orders,
          sales,
          financials,
          users,
        );
        setStats(stats);
        setRecentOrders(orders.slice(0, 6));
        setAllOrders(orders);
        setChartWeb(chart.web);
        setChartTienda(chart.tienda);
      })
      .catch(() => {
        setLoadError(true);
        toast.error("No se pudieron cargar los datos del dashboard. Verifica tu conexión.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadDashboard();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="success-spinner" />
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="admin-loading">
        <AlertCircle size={40} style={{ color: "var(--danger, #ef4444)" }} />
        <p>No se pudieron cargar los datos del dashboard.</p>
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: "0.75rem" }}
          onClick={() => globalThis.location.reload()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  let auditBlock: ReactNode;
  if (auditError) {
    auditBlock = <p className="admin-empty">No se pudo cargar el historial de actividad.</p>;
  } else if (auditLog.length === 0) {
    auditBlock = <p className="admin-empty">Sin actividad registrada aún.</p>;
  } else {
    auditBlock = (
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Acción</th>
              <th>Entidad</th>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {auditLog.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <span className={`order-status-badge audit-badge-${entry.accion}`}>
                    {entry.accion}
                  </span>
                </td>
                <td>{entry.entidad}</td>
                <td className="dash-order-email">{entry.entidadNombre ?? "—"}</td>
                <td className="dash-order-email">{entry.usuarioEmail ?? "—"}</td>
                <td style={{ whiteSpace: "nowrap", fontSize: "12px", color: "var(--text-muted)" }}>
                  {entry.realizadoEn
                    ? new Date(entry.realizadoEn).toLocaleString("es-PE")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="dash-root">
      {/* Header */}
      <div className="dash-header">
        <div>
          <p className="dash-greeting">{greetingText()}, Administrador</p>
          <h1 className="dash-title">Dashboard</h1>
        </div>
        <div className="dash-header-date">
          <p className="dash-date-label">Hoy</p>
          <p className="dash-date-value">
            {new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* KPI row 1 — ingresos/ganancias estáticos a la izquierda */}
      <div className="dash-kpi-grid">
        <div className="dash-kpi-card dash-kpi-card-static dash-kpi-purple" aria-label={`Ingresos totales: ${formatCurrency(stats.ingresosTotales)}`}>
          <div className="dash-kpi-icon"><CircleDollarSign size={22} /></div>
          <div className="dash-kpi-body">
            <p className="dash-kpi-label">Ingresos totales</p>
            <p className="dash-kpi-value">{formatCurrency(stats.ingresosTotales)}</p>
          </div>
        </div>

        <div className="dash-kpi-card dash-kpi-card-static dash-kpi-gold" aria-label={`Ganancias totales: ${formatCurrency(stats.gananciasTotales)}`}>
          <div className="dash-kpi-icon"><TrendingUp size={22} /></div>
          <div className="dash-kpi-body">
            <p className="dash-kpi-label">Ganancias totales</p>
            <p className="dash-kpi-value">{formatCurrency(stats.gananciasTotales)}</p>
          </div>
        </div>

        <button type="button" className="dash-kpi-card dash-kpi-blue" onClick={() => navigate(ADMIN_ROUTES.products)}>
          <div className="dash-kpi-icon"><Package size={22} /></div>
          <div className="dash-kpi-body">
            <p className="dash-kpi-label">Productos</p>
            <p className="dash-kpi-value">{stats.productos}</p>
          </div>
          <ChevronRight size={16} className="dash-kpi-arrow" />
        </button>

        <button type="button" className="dash-kpi-card dash-kpi-green" onClick={() => navigate(ADMIN_ROUTES.orders)}>
          <div className="dash-kpi-icon"><ShoppingBag size={22} /></div>
          <div className="dash-kpi-body">
            <p className="dash-kpi-label">Pedidos web (total)</p>
            <p className="dash-kpi-value">{stats.pedidos}</p>
          </div>
          <ChevronRight size={16} className="dash-kpi-arrow" />
        </button>

        <button type="button" className="dash-kpi-card dash-kpi-orange" onClick={() => navigate(ADMIN_ROUTES.users)}>
          <div className="dash-kpi-icon"><Users size={22} /></div>
          <div className="dash-kpi-body">
            <p className="dash-kpi-label">Usuarios</p>
            <p className="dash-kpi-value">{stats.usuarios}</p>
          </div>
          <ChevronRight size={16} className="dash-kpi-arrow" />
        </button>
      </div>

      <div className="dash-channels-row">
        <section className="dash-card dash-channel-panel dash-channel-panel-web" aria-labelledby="dash-channel-web-title">
          <ChannelSectionHeading
            icon={<Globe size={20} />}
            title="Tienda web"
            subtitle="Pedidos online completados (pagado, enviado o entregado)"
            titleId="dash-channel-web-title"
          />
          <div className="dash-channel-metrics">
        <div className="dash-today-card dash-today-web">
          <CircleDollarSign size={20} />
          <div>
            <p className="dash-today-label">Ventas hoy — web</p>
            <p className="dash-today-value">{formatCurrency(stats.ventasHoyWeb)}</p>
          </div>
        </div>
        <div className="dash-today-card dash-today-web">
          <BarChart2 size={20} />
          <div>
            <p className="dash-today-label">Ganancia hoy — web (est.)</p>
            <p className="dash-today-value">{formatCurrency(stats.gananciaHoyWeb)}</p>
          </div>
        </div>
        <button
          type="button"
          className={`dash-today-card ${stats.pendientes > 0 ? "dash-today-alert" : "dash-today-muted"}`}
          onClick={() => navigate(ADMIN_ROUTES.orders)}
        >
          <AlertCircle size={20} />
          <div>
            <p className="dash-today-label">Pedidos pendientes</p>
            <p className="dash-today-value">{stats.pendientes}</p>
          </div>
          {stats.pendientes > 0 && <ChevronRight size={15} className="dash-kpi-arrow" />}
        </button>
          </div>
          <div className="dash-channel-chart">
            <p className="dash-channel-chart-kicker">Actividad de ventas</p>
            <h3 className="dash-channel-chart-title">Últimos 7 días — web</h3>
            <SalesBarChart
              days={last7Days.map((d) => d.label)}
              values={chartWeb}
              variant="web"
            />
          </div>
        </section>

        <section className="dash-card dash-channel-panel dash-channel-panel-store" aria-labelledby="dash-channel-store-title">
          <ChannelSectionHeading
            icon={<Store size={20} />}
            title="Tienda física"
            subtitle="Ventas registradas en Admin → Ventas"
            titleId="dash-channel-store-title"
          />
          <div className="dash-channel-metrics">
            <button type="button" className="dash-kpi-card dash-kpi-gold dash-channel-kpi" onClick={() => navigate(ADMIN_ROUTES.sales)}>
          <div className="dash-kpi-icon"><Store size={22} /></div>
          <div className="dash-kpi-body">
            <p className="dash-kpi-label">Ingresos tienda física</p>
            <p className="dash-kpi-value">{formatCurrency(stats.ingresosTienda)}</p>
          </div>
          <ChevronRight size={16} className="dash-kpi-arrow" />
        </button>
        <div className="dash-today-card dash-today-gold">
          <CircleDollarSign size={20} />
          <div>
            <p className="dash-today-label">Ventas hoy — física</p>
            <p className="dash-today-value">{formatCurrency(stats.ventasHoyTienda)}</p>
          </div>
        </div>
        <div className="dash-today-card dash-today-gold">
          <BarChart2 size={20} />
          <div>
            <p className="dash-today-label">Ganancia hoy — física</p>
            <p className="dash-today-value">{formatCurrency(stats.gananciaHoyTienda)}</p>
          </div>
        </div>
          </div>
          <div className="dash-channel-chart">
            <p className="dash-channel-chart-kicker">Actividad de ventas</p>
            <h3 className="dash-channel-chart-title">Últimos 7 días — tienda física</h3>
            <SalesBarChart
              days={last7Days.map((d) => d.label)}
              values={chartTienda}
              variant="tienda"
            />
          </div>
        </section>
      </div>

      {/* Orders + Status */}
      <div className="dash-two-col">
        {/* Recent orders */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <p className="dash-card-kicker">Últimas transacciones</p>
              <h2 className="dash-card-title">Pedidos recientes (tienda web)</h2>
            </div>
            <Link to={ADMIN_ROUTES.orders} className="admin-link dash-card-link">
              Ver todos <ChevronRight size={14} />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="admin-empty">No hay pedidos aún.</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table dash-orders-table">
                <thead>
                  <tr>
                    <th>N° Pedido</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="dash-order-row">
                      <td colSpan={4} className="dash-order-row-cell">
                        <button
                          type="button"
                          className="dash-order-row-btn"
                          onClick={() => setSelectedOrder(o)}
                          title="Ver detalle"
                        >
                          <span className="order-id-cell">#{o.id.slice(-8).toUpperCase()}</span>
                          <span className="dash-order-email">{o.userEmail}</span>
                          <span><strong>{formatCurrency(o.total ?? 0)}</strong></span>
                          <span>
                            <span
                              className="order-status-badge"
                              style={{ background: STATUS_COLOR[o.estado] + "22", color: STATUS_COLOR[o.estado] }}
                            >
                              {STATUS_LABEL[o.estado] ?? o.estado}
                            </span>
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order status summary */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <p className="dash-card-kicker">Resumen de pedidos</p>
              <h2 className="dash-card-title">Estado de Pedidos</h2>
            </div>
          </div>
          {allOrders.length === 0 ? (
            <p className="admin-empty">Sin pedidos registrados.</p>
          ) : (
            <OrderStatusSummary orders={allOrders} />
          )}
          <div className="dash-status-total">
            <span>Total registrados</span>
            <strong>{allOrders.length} pedidos</strong>
          </div>
        </div>
      </div>

      {/* Audit log */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <p className="dash-card-kicker">Trazabilidad ISO 9001</p>
            <h2 className="dash-card-title">Actividad reciente</h2>
          </div>
        </div>
        {auditBlock}
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}
