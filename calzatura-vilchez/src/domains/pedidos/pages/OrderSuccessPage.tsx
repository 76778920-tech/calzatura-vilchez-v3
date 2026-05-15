import { useEffect, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Package, ArrowRight, Download, Eye } from "lucide-react";
import { fetchOrderById } from "@/domains/pedidos/services/orders";
import type { Order } from "@/types";
import { useCart } from "@/domains/carrito/context/CartContext";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { downloadReceipt, openReceiptPreview } from "@/utils/receipt";
import toast from "react-hot-toast";

function successPageEstadoLabel(estado: Order["estado"], metodoPago?: string): string {
  if (estado === "pagado") return "Pagado";
  if (estado === "pendiente" && metodoPago === "contraentrega") return "Confirmado — pago al recibir";
  if (estado === "pendiente") return "Pendiente de pago";
  return estado;
}

const PAYMENT_POLL_MAX = 45;
const PAYMENT_POLL_MS = 2000;

export default function OrderSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const { userProfile } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentSyncTimeout, setPaymentSyncTimeout] = useState(false);
  const downloadedRef = useRef(false);
  const pollCountRef = useRef(0);

  useEffect(() => {
    if (!id) return;

    const sessionId = searchParams.get("session_id");
    let pollTimer: number | null = null;
    let active = true;

    const load = async () => {
      try {
        const o = await fetchOrderById(id);
        if (!active) return;
        setOrder(o);
        clearCart();
        if (o && !downloadedRef.current && !localStorage.getItem(`receipt_downloaded_${o.id}`)) {
          downloadedRef.current = true;
          downloadReceipt(o, userProfile);
          localStorage.setItem(`receipt_downloaded_${o.id}`, "true");
        }

        if (sessionId && o?.estado === "pendiente" && o.metodoPago === "stripe") {
          pollCountRef.current += 1;
          if (pollCountRef.current >= PAYMENT_POLL_MAX) {
            setPaymentSyncTimeout(true);
          } else {
            pollTimer = globalThis.setTimeout(() => {
              void load();
            }, PAYMENT_POLL_MS);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
      if (pollTimer) globalThis.clearTimeout(pollTimer);
    };
  }, [clearCart, id, searchParams, userProfile]);

  const handlePreviewReceipt = () => {
    if (!order) return;
    if (!openReceiptPreview(order, userProfile)) {
      toast.error("Permite ventanas emergentes para previsualizar la boleta");
    }
  };

  const handleDownloadReceipt = () => {
    if (!order) return;
    downloadReceipt(order, userProfile);
  };

  if (loading) {
    return (
      <main className="success-page">
        <div className="success-spinner" />
      </main>
    );
  }

  return (
    <main className="success-page">
      <div className="success-card">
        <CheckCircle size={64} className="success-icon" />
        <h1>¡Pedido Confirmado!</h1>
        <p className="success-message">
          Gracias por tu compra.
          {order?.metodoPago === "stripe" && order.estado === "pagado"
            ? " Stripe envía el recibo de pago a tu correo."
            : " Conserva el número de pedido para cualquier consulta."}
        </p>

        {paymentSyncTimeout && order?.estado === "pendiente" && (
          <p className="success-message" role="status">
            El pago puede tardar unos segundos en reflejarse. Revisa{" "}
            <Link to="/mis-pedidos" className="success-inline-link">
              Mis pedidos
            </Link>{" "}
            en un momento o actualiza esta página.
          </p>
        )}

        {order && (
          <div className="success-details">
            <div className="success-detail-row">
              <span>N° Pedido:</span>
              <span className="success-order-id">#{order.id.slice(-8).toUpperCase()}</span>
            </div>
            <div className="success-detail-row">
              <span>Total pagado:</span>
              <span>S/ {order.total?.toFixed(2)}</span>
            </div>
            <div className="success-detail-row">
              <span>Estado:</span>
              <span className={`order-status-badge status-${order.estado}`}>
                {successPageEstadoLabel(order.estado, order.metodoPago)}
              </span>
            </div>
            <div className="success-detail-row">
              <span>Entregar en:</span>
              <span>{order.direccion?.distrito}, {order.direccion?.ciudad}</span>
            </div>
          </div>
        )}

        <div className="success-actions">
          {order && (
            <>
              <button type="button" onClick={handlePreviewReceipt} className="btn-outline">
                <Eye size={16} /> Previsualizar Boleta
              </button>
              <button type="button" onClick={handleDownloadReceipt} className="btn-outline">
                <Download size={16} /> Descargar Boleta
              </button>
            </>
          )}
          <Link to="/mis-pedidos" className="btn-primary">
            <Package size={16} /> Mis Pedidos
          </Link>
          <Link to="/productos" className="btn-outline">
            Seguir Comprando <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </main>
  );
}
