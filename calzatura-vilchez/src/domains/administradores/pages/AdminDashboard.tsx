import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Package, ShoppingBag, Users, TrendingUp, CircleDollarSign,
  AlertCircle, Factory, X, MapPin, Phone, Mail, ChevronRight,
  BarChart2, Clock, Brain,
} from "lucide-react";
import { fetchProducts } from "@/domains/productos/services/products";
import { fetchAllOrders } from "@/domains/pedidos/services/orders";
import { fetchDailySales, fetchProductFinancials } from "@/domains/ventas/services/finance";
import { fetchAllUsers } from "@/domains/usuarios/services/users";
import { fetchRecentAudit } from "@/services/audit";
import type { Order, ProductFinancial, DailySale } from "@/types";
import type { AuditEntry } from "@/services/audit";
import { ADMIN_ROUTES } from "@/routes/paths";

// ─── helpers ───────────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDate(value: Order["creadoEn"]) {
  return value ? new Date(value) : new Date();
}

function toLocalISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isCompletedOrder(order: Order) {
  return order.estado === "pagado" || order.estado === "enviado" || order.estado === "entregado";
}

function estimateOrderProfit(order: Order, financials: Record<string, ProductFinancial>) {
  return order.items.reduce((acc, item) => {
    const unitPrice = Number(item.product.precio) || 0;
    const unitCost = financials[item.product.id]?.costoCompra ?? unitPrice;
    return acc + (unitPrice - unitCost) * item.quantity;
  }, 0);
}

function getLast7Days(): { iso: string; label: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = toLocalISODate(d);
    const label = d.toLocaleDateString("es-PE", { weekday: "short" });
    return { iso, label: label.charAt(0).toUpperCase() + label.slice(1).replace(".", "") };
  });
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

// ─── Order Detail Modal ─────────────────────────────────────────────────────

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal dash-order-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="dash-modal-kicker">Detalle del Pedido</p>
            <h2 className="dash-modal-title">#{order.id.slice(-8).toUpperCase()}</h2>
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
                <div key={idx} className="dash-modal-item-row">
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
      </div>
    </div>
  );
}

// ─── Bar Chart ──────────────────────────────────────────────────────────────

function SalesBarChart({ days, values }: { days: string[]; values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="dash-chart-bars">
      {days.map((label, i) => (
        <div key={label} className="dash-chart-col">
          <span className="dash-chart-val">{values[i] > 0 ? `S/${values[i].toFixed(0)}` : ""}</span>
          <div className="dash-chart-track">
            <div
              className="dash-chart-fill"
              style={{ height: `${Math.max((values[i] / max) * 100, values[i] > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span className="dash-chart-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Status Donut ────────────────────────────────────────────────────────────

function OrderStatusSummary({ orders }: { orders: Order[] }) {
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
  const [stats, setStats] = useState({
    productos: 0, pedidos: 0, ingresos: 0, pendientes: 0,
    ventasHoy: 0, gananciaHoy: 0, usuarios: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [chartData, setChartData] = useState<number[]>(Array(7).fill(0));
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  const last7Days = getLast7Days();

  useEffect(() => {
    const today = todayISO();
    void fetchRecentAudit(10).then(setAuditLog).catch(() => {});

    Promise.all([
      fetchProducts(),
      fetchAllOrders(),
      fetchDailySales(),
      fetchProductFinancials(),
      fetchAllUsers(),
    ]).then(([products, orders, sales, financials, users]) => {
      const completedOrders = orders.filter(isCompletedOrder);
      const completedOrdersToday = completedOrders.filter(
        (o) => toLocalISODate(toDate(o.creadoEn)) === today
      );
      const ingresos = completedOrders.reduce((acc, o) => acc + (o.total ?? 0), 0);
      const pendientes = orders.filter((o) => o.estado === "pendiente").length;

      const ventasManualesHoy = (sales as DailySale[]).filter((s) => s.fecha === today).reduce((acc, s) => acc + s.total, 0);
      const gananciasManualesHoy = (sales as DailySale[]).filter((s) => s.fecha === today).reduce((acc, s) => acc + s.ganancia, 0);
      const ventasPedidosHoy = completedOrdersToday.reduce((acc, o) => acc + (o.total ?? 0), 0);
      const gananciasPedidosHoy = completedOrdersToday.reduce(
        (acc, o) => acc + estimateOrderProfit(o, financials), 0
      );

      // Chart: last 7 days
      const chart = last7Days.map(({ iso }) => {
        const manual = (sales as DailySale[]).filter((s) => s.fecha === iso).reduce((a, s) => a + s.total, 0);
        const fromOrders = completedOrders.filter((o) => toLocalISODate(toDate(o.creadoEn)) === iso).reduce((a, o) => a + (o.total ?? 0), 0);
        return manual + fromOrders;
      });

      setStats({
        productos: products.length,
        pedidos: orders.length,
        ingresos,
        pendientes,
        ventasHoy: ventasManualesHoy + ventasPedidosHoy,
        gananciaHoy: gananciasManualesHoy + gananciasPedidosHoy,
        usuarios: users.length,
      });
      setRecentOrders(orders.slice(0, 6));
      setAllOrders(orders);
      setChartData(chart);
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="success-spinner" />
        <p>Cargando dashboard...</p>
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

      {/* KPI row 1 */}
      <div className="dash-kpi-grid">
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
            <p className="dash-kpi-label">Pedidos Totales</p>
            <p className="dash-kpi-value">{stats.pedidos}</p>
          </div>
          <ChevronRight size={16} className="dash-kpi-arrow" />
        </button>

        <button type="button" className="dash-kpi-card dash-kpi-purple" onClick={() => navigate(ADMIN_ROUTES.sales)}>
          <div className="dash-kpi-icon"><TrendingUp size={22} /></div>
          <div className="dash-kpi-body">
            <p className="dash-kpi-label">Ingresos Pedidos</p>
            <p className="dash-kpi-value">{formatCurrency(stats.ingresos)}</p>
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

      {/* KPI row 2 — today */}
      <div className="dash-today-grid">
        <div className="dash-today-card dash-today-gold">
          <CircleDollarSign size={20} />
          <div>
            <p className="dash-today-label">Ventas hoy</p>
            <p className="dash-today-value">{formatCurrency(stats.ventasHoy)}</p>
          </div>
        </div>
        <div className="dash-today-card dash-today-gold">
          <BarChart2 size={20} />
          <div>
            <p className="dash-today-label">Ganancia estimada hoy</p>
            <p className="dash-today-value">{formatCurrency(stats.gananciaHoy)}</p>
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

      {/* Chart */}
      <div className="dash-card dash-chart-card">
        <div className="dash-card-header">
          <div>
            <p className="dash-card-kicker">Actividad de ventas</p>
            <h2 className="dash-card-title">Últimos 7 días</h2>
          </div>
          <Link to={ADMIN_ROUTES.sales} className="admin-link dash-card-link">
            Ver ventas <ChevronRight size={14} />
          </Link>
        </div>
        <SalesBarChart days={last7Days.map((d) => d.label)} values={chartData} />
      </div>

      {/* Orders + Status */}
      <div className="dash-two-col">
        {/* Recent orders */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <p className="dash-card-kicker">Últimas transacciones</p>
              <h2 className="dash-card-title">Pedidos Recientes</h2>
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
                    <tr
                      key={o.id}
                      className="dash-order-row"
                      onClick={() => setSelectedOrder(o)}
                      title="Ver detalle"
                    >
                      <td className="order-id-cell">#{o.id.slice(-8).toUpperCase()}</td>
                      <td className="dash-order-email">{o.userEmail}</td>
                      <td><strong>{formatCurrency(o.total ?? 0)}</strong></td>
                      <td>
                        <span
                          className="order-status-badge"
                          style={{ background: STATUS_COLOR[o.estado] + "22", color: STATUS_COLOR[o.estado] }}
                        >
                          {STATUS_LABEL[o.estado] ?? o.estado}
                        </span>
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

      {/* Quick actions */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <p className="dash-card-kicker">Acceso rápido</p>
            <h2 className="dash-card-title">Gestión del Sistema</h2>
          </div>
        </div>
        <div className="dash-actions-grid">
          <Link to={ADMIN_ROUTES.products} className="dash-action-card dash-action-blue">
            <div className="dash-action-icon"><Package size={26} /></div>
            <p className="dash-action-title">Productos</p>
            <p className="dash-action-desc">Gestionar catálogo, stock y precios</p>
            <ChevronRight size={16} className="dash-action-arrow" />
          </Link>
          <Link to={ADMIN_ROUTES.orders} className="dash-action-card dash-action-green">
            <div className="dash-action-icon"><ShoppingBag size={26} /></div>
            <p className="dash-action-title">Pedidos</p>
            <p className="dash-action-desc">Ver y actualizar estados de pedidos</p>
            <ChevronRight size={16} className="dash-action-arrow" />
          </Link>
          <Link to={ADMIN_ROUTES.sales} className="dash-action-card dash-action-gold">
            <div className="dash-action-icon"><CircleDollarSign size={26} /></div>
            <p className="dash-action-title">Ventas</p>
            <p className="dash-action-desc">Registrar ventas y consultar reportes</p>
            <ChevronRight size={16} className="dash-action-arrow" />
          </Link>
          <Link to={ADMIN_ROUTES.users} className="dash-action-card dash-action-orange">
            <div className="dash-action-icon"><Users size={26} /></div>
            <p className="dash-action-title">Usuarios</p>
            <p className="dash-action-desc">Administrar roles y perfiles</p>
            <ChevronRight size={16} className="dash-action-arrow" />
          </Link>
          <Link to={ADMIN_ROUTES.manufacturers} className="dash-action-card dash-action-purple">
            <div className="dash-action-icon"><Factory size={26} /></div>
            <p className="dash-action-title">Fabricantes</p>
            <p className="dash-action-desc">Gestionar proveedores y documentos</p>
            <ChevronRight size={16} className="dash-action-arrow" />
          </Link>
          <Link to={ADMIN_ROUTES.predictions} className="dash-action-card dash-action-ai">
            <div className="dash-action-icon"><Brain size={26} /></div>
            <p className="dash-action-title">Predicciones IA</p>
            <p className="dash-action-desc">Demanda y alertas de stock con IA</p>
            <ChevronRight size={16} className="dash-action-arrow" />
          </Link>
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
        {auditLog.length === 0 ? (
          <p className="admin-empty">Sin actividad registrada aún.</p>
        ) : (
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
        )}
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}
