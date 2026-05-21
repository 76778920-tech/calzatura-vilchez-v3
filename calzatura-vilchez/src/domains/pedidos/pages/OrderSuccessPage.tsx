import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle, Package, ArrowRight, Download, Eye, RefreshCw } from "lucide-react";
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [paymentSyncTimeout, setPaymentSyncTimeout] = useState(false);
  const downloadedRef = useRef(false);
  const pollCountRef = useRef(0);

  useEffect(() => {
    if (!id) {
      const timer = globalThis.setTimeout(() => {
        setOrder(null);
        setLoading(false);
        setLoadError("No encontramos el identificador del pedido.");
      }, 0);
      return () => globalThis.clearTimeout(timer);
    }

    const sessionId = searchParams.get("session_id");
    let pollTimer: number | null = null;
    let active = true;

    const load = async () => {
      try {
        setLoadError(null);
        const loadedOrder = await fetchOrderById(id);
        if (!active) return;

        if (!loadedOrder) {
          setOrder(null);
          setLoadError("No pudimos cargar tu pedido en este momento.");
          return;
        }

        setOrder(loadedOrder);
        clearCart();
        if (!downloadedRef.current && !localStorage.getItem(`receipt_downloaded_${loadedOrder.id}`)) {
          downloadedRef.current = true;
          downloadReceipt(loadedOrder, userProfile);
          localStorage.setItem(`receipt_downloaded_${loadedOrder.id}`, "true");
        }

        if (sessionId && loadedOrder.estado === "pendiente" && loadedOrder.metodoPago === "stripe") {
          pollCountRef.current += 1;
          if (pollCountRef.current >= PAYMENT_POLL_MAX) {
            setPaymentSyncTimeout(true);
          } else {
            pollTimer = globalThis.setTimeout(() => {
              void load();
            }, PAYMENT_POLL_MS);
          }
        }
      } catch {
        if (!active) return;
        setOrder(null);
        setLoadError("No pudimos cargar tu pedido en este momento.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
      if (pollTimer) globalThis.clearTimeout(pollTimer);
    };
  }, [clearCart, id, retryCount, searchParams, userProfile]);

  const handleRetryLoad = useCallback(() => {
    downloadedRef.current = false;
    pollCountRef.current = 0;
    setPaymentSyncTimeout(false);
    setLoading(true);
    setRetryCount((current) => current + 1);
  }, []);

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

  if (loadError || !order) {
    return (
      <main className="success-page">
        <div className="success-card">
          <AlertCircle size={64} className="success-icon" style={{ color: "#ef4444" }} />
          <h1>No pudimos confirmar el pedido</h1>
          <p className="success-message">{loadError ?? "Intenta nuevamente o revisa tu historial de pedidos."}</p>

          <div className="success-actions">
            <button type="button" onClick={handleRetryLoad} className="btn-primary">
              <RefreshCw size={16} /> Reintentar
            </button>
            <Link to="/mis-pedidos" className="btn-outline">
              <Package size={16} /> Ver historial
            </Link>
            <Link to="/productos" className="btn-outline">
              Seguir Comprando <ArrowRight size={16} />
            </Link>
          </div>
        </div>
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
          {order.metodoPago === "stripe" && order.estado === "pagado"
            ? " Stripe envía el recibo de pago a tu correo."
            : " Conserva el número de pedido para cualquier consulta."}
        </p>

        {paymentSyncTimeout && order.estado === "pendiente" && (
          <output className="success-message" aria-live="polite">
            El pago puede tardar unos segundos en reflejarse. Revisa{" "}
            <Link to="/mis-pedidos" className="success-inline-link">
              Mis pedidos
            </Link>{" "}
            en un momento o actualiza esta página.
          </output>
        )}

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

        <div className="success-actions">
          <button type="button" onClick={handlePreviewReceipt} className="btn-outline">
            <Eye size={16} /> Previsualizar Boleta
          </button>
          <button type="button" onClick={handleDownloadReceipt} className="btn-outline">
            <Download size={16} /> Descargar Boleta
          </button>
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
