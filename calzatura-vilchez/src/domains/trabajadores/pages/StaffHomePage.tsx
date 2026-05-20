import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, CircleDollarSign, ClipboardList, PackageCheck, ShoppingBag, Store, TrendingUp } from "lucide-react";
import { fetchAllOrders } from "@/domains/pedidos/services/orders";
import { fetchDailySales } from "@/domains/ventas/services/finance";
import { STAFF_ROUTES } from "@/routes/paths";
import type { DailySale, Order } from "@/types";

type StaffHomeState = {
  orders: Order[];
  sales: DailySale[];
  loading: boolean;
  error: string;
};

function todayISO() {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function currency(value: number) {
  return `S/ ${value.toFixed(2)}`;
}

export default function StaffHomePage() {
  const [state, setState] = useState<StaffHomeState>({
    orders: [],
    sales: [],
    loading: true,
    error: "",
  });

  const date = todayISO();

  useEffect(() => {
    let active = true;

    Promise.allSettled([fetchAllOrders("staff"), fetchDailySales(date, "staff")])
      .then(([ordersResult, salesResult]) => {
        if (!active) return;
        const orders = ordersResult.status === "fulfilled" ? ordersResult.value : [];
        const sales = salesResult.status === "fulfilled" ? salesResult.value : [];
        const error = ordersResult.status === "rejected" || salesResult.status === "rejected"
          ? "No se pudo cargar todo el resumen operativo."
          : "";
        setState({ orders, sales, loading: false, error });
      })
      .catch(() => {
        if (!active) return;
        setState({ orders: [], sales: [], loading: false, error: "No se pudo cargar el resumen operativo." });
      });

    return () => {
      active = false;
    };
  }, [date]);

  const summary = useMemo(() => {
    const activeOrders = state.orders.filter((order) => order.estado === "pendiente" || order.estado === "pagado");
    const readyToPrepare = state.orders.filter((order) => order.estado === "pagado");
    const salesTotal = state.sales.filter((sale) => !sale.devuelto).reduce((acc, sale) => acc + sale.total, 0);
    const pairsSold = state.sales
      .filter((sale) => !sale.devuelto)
      .reduce((acc, sale) => acc + sale.cantidad, 0);
    const latestOrders = [...activeOrders]
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
      .slice(0, 3);

    return {
      activeOrders: activeOrders.length,
      readyToPrepare: readyToPrepare.length,
      salesCount: state.sales.filter((sale) => !sale.devuelto).length,
      salesTotal,
      pairsSold,
      latestOrders,
    };
  }, [state.orders, state.sales]);

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

      {state.error && <p className="staff-inline-warning">{state.error}</p>}

      <section className="staff-ops-grid" aria-label="Resumen operativo de tienda">
        <article className="staff-ops-card staff-ops-card-primary">
          <span className="staff-ops-icon"><ClipboardList size={22} /></span>
          <div>
            <small>Pedidos activos</small>
            <strong>{state.loading ? "..." : summary.activeOrders}</strong>
            <p>{summary.readyToPrepare} pagados listos para preparar.</p>
          </div>
        </article>
        <article className="staff-ops-card">
          <span className="staff-ops-icon staff-ops-icon-green"><CircleDollarSign size={22} /></span>
          <div>
            <small>Venta física hoy</small>
            <strong>{state.loading ? "..." : currency(summary.salesTotal)}</strong>
            <p>{summary.salesCount} registros de venta.</p>
          </div>
        </article>
        <article className="staff-ops-card">
          <span className="staff-ops-icon staff-ops-icon-blue"><TrendingUp size={22} /></span>
          <div>
            <small>Pares vendidos hoy</small>
            <strong>{state.loading ? "..." : summary.pairsSold}</strong>
            <p>Según ventas registradas en tienda.</p>
          </div>
        </article>
      </section>

      <section className="staff-workbench">
        <div className="staff-workbench-main">
          <div className="staff-section-heading">
            <div>
              <p>Prioridad del turno</p>
              <h2>Operación de tienda</h2>
            </div>
            <span><CalendarDays size={14} /> {new Date(`${date}T12:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}</span>
          </div>

          <div className="staff-order-list">
            {state.loading ? (
              <p className="staff-empty-state">Cargando actividad...</p>
            ) : summary.latestOrders.length > 0 ? (
              summary.latestOrders.map((order) => (
                <div key={order.id} className="staff-order-item">
                  <span className="staff-order-status">{order.estado}</span>
                  <div>
                    <strong>Pedido {order.id.slice(-6).toUpperCase()}</strong>
                    <small>{order.items.length} item(s) · {currency(order.total)}</small>
                  </div>
                </div>
              ))
            ) : (
              <p className="staff-empty-state">No hay pedidos activos por atender.</p>
            )}
          </div>
        </div>

        <aside className="staff-workbench-side">
          <h2>Acciones principales</h2>
          <Link to={STAFF_ROUTES.orders} className="staff-action-card">
            <span className="staff-action-icon staff-action-icon-orders">
              <ShoppingBag size={24} />
            </span>
            <span className="staff-action-copy">
              <strong>Gestionar pedidos</strong>
              <small>Preparación, seguimiento y cambio de estado.</small>
            </span>
            <ArrowRight size={18} className="staff-action-arrow" />
          </Link>
          <Link to={STAFF_ROUTES.sales} className="staff-action-card">
            <span className="staff-action-icon staff-action-icon-sales">
              <PackageCheck size={24} />
            </span>
            <span className="staff-action-copy">
              <strong>Registrar venta física</strong>
              <small>Venta, comprobante, encargado y devolución.</small>
            </span>
            <ArrowRight size={18} className="staff-action-arrow" />
          </Link>
        </aside>
      </section>
    </div>
  );
}
