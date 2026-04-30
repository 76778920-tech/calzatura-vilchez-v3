import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShoppingBag, CreditCard, Truck, ChevronRight } from "lucide-react";
import { useCart, COSTO_ENVIO } from "@/domains/carrito/context/CartContext";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { createOrder } from "@/domains/pedidos/services/orders";
import toast from "react-hot-toast";
import type { Address } from "@/types";
import { loadStripe } from "@stripe/stripe-js";
import { formatPeruPhone, isValidPeruPhone, normalizePeruPhoneInput, peruPhoneError } from "@/utils/phone";

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? "";

export default function CheckoutPage() {
  const { items, subtotal, total, clearCart } = useCart();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<"direccion" | "pago">("direccion");
  const [loading, setLoading] = useState(false);
  const [metodoPago, setMetodoPago] = useState<"stripe" | "contraentrega">("stripe");

  const [direccion, setDireccion] = useState<Address>({
    nombre: userProfile?.nombre?.split(" ")[0] ?? "",
    apellido: userProfile?.nombre?.split(" ")[1] ?? "",
    direccion: "",
    ciudad: "Huancayo",
    distrito: "",
    telefono: userProfile?.telefono ?? "",
    referencia: "",
  });

  if (items.length === 0) {
    return (
      <main className="empty-cart-page">
        <ShoppingBag size={72} className="empty-cart-icon" />
        <h2>Tu carrito está vacío</h2>
        <Link to="/productos" className="btn-primary">Ver Productos</Link>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="empty-cart-page">
        <h2>Debes iniciar sesión para continuar</h2>
        <Link to="/login" className="btn-primary">Iniciar Sesión</Link>
      </main>
    );
  }

  const handleDireccionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!direccion.direccion || !direccion.distrito || !direccion.telefono) {
      toast.error("Completa todos los campos requeridos");
      return;
    }
    const phoneError = peruPhoneError(direccion.telefono);
    if (phoneError || !isValidPeruPhone(direccion.telefono)) {
      toast.error(phoneError ?? "Ingresa un teléfono válido");
      return;
    }
    setDireccion((current) => ({
      ...current,
      telefono: formatPeruPhone(current.telefono),
    }));
    setStep("pago");
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const orderId = await createOrder({
        items,
        direccion,
        metodoPago,
        notas: "",
      });

      if (metodoPago === "stripe" && STRIPE_PK) {
        const idToken = await user.getIdToken();
        const stripe = await loadStripe(STRIPE_PK);
        if (!stripe) throw new Error("Stripe no disponible");

        const res = await fetch(
          `https://us-central1-calzaturavilchez-ab17f.cloudfunctions.net/createCheckoutSession`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ orderId }),
          }
        );

        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload.error || "No se pudo iniciar Stripe Checkout");
        }

        const checkout = stripe as unknown as {
          redirectToCheckout(args: { sessionId: string }): Promise<{ error?: Error }>;
        };
        const { error } = await checkout.redirectToCheckout({ sessionId: payload.sessionId });
        if (error) throw error;
      } else {
        // Pago contra entrega — validar totales server-side antes de confirmar
        clearCart();
        navigate(`/pedido-exitoso/${orderId}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      toast.error("Error al procesar el pedido: " + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="checkout-page">
      <h1 className="checkout-title">Finalizar Compra</h1>

      {/* Steps indicator */}
      <div className="checkout-steps">
        <div className={`step ${step === "direccion" ? "active" : "done"}`}>
          <span className="step-number">1</span>
          <span>Dirección</span>
        </div>
        <ChevronRight size={16} className="step-separator" />
        <div className={`step ${step === "pago" ? "active" : ""}`}>
          <span className="step-number">2</span>
          <span>Pago</span>
        </div>
      </div>

      <div className="checkout-grid">
        {/* Left: form */}
        <div className="checkout-form-area">
          {step === "direccion" && (
            <form onSubmit={handleDireccionSubmit} className="checkout-form">
              <h2 className="form-section-title">
                <Truck size={18} /> Datos de Entrega
              </h2>

              <div className="form-row">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    value={direccion.nombre}
                    onChange={(e) => setDireccion({ ...direccion, nombre: e.target.value })}
                    required
                    className="form-input"
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="form-group">
                  <label>Apellido *</label>
                  <input
                    value={direccion.apellido}
                    onChange={(e) => setDireccion({ ...direccion, apellido: e.target.value })}
                    required
                    className="form-input"
                    placeholder="Tu apellido"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Dirección *</label>
                <input
                  value={direccion.direccion}
                  onChange={(e) => setDireccion({ ...direccion, direccion: e.target.value })}
                  required
                  className="form-input"
                  placeholder="Av., Calle, Jr..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ciudad *</label>
                  <input
                    value={direccion.ciudad}
                    onChange={(e) => setDireccion({ ...direccion, ciudad: e.target.value })}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Distrito *</label>
                  <input
                    value={direccion.distrito}
                    onChange={(e) => setDireccion({ ...direccion, distrito: e.target.value })}
                    required
                    className="form-input"
                    placeholder="Miraflores, SJL..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Teléfono *</label>
                <input
                  type="tel"
                  value={direccion.telefono}
                  onChange={(e) => setDireccion({
                    ...direccion,
                    telefono: normalizePeruPhoneInput(e.target.value),
                  })}
                  required
                  inputMode="tel"
                  maxLength={15}
                  pattern="(?:\+51\s?)?9[0-9]{2}\s?[0-9]{3}\s?[0-9]{3}"
                  className="form-input"
                  placeholder="+51 999 999 999"
                />
              </div>

              <div className="form-group">
                <label>Referencia</label>
                <input
                  value={direccion.referencia ?? ""}
                  onChange={(e) => setDireccion({ ...direccion, referencia: e.target.value })}
                  className="form-input"
                  placeholder="Cerca a..."
                />
              </div>

              <button type="submit" className="btn-primary btn-full">
                Continuar al Pago
              </button>
            </form>
          )}

          {step === "pago" && (
            <div className="checkout-form">
              <h2 className="form-section-title">
                <CreditCard size={18} /> Método de Pago
              </h2>

              <div className="payment-options">
                <label className={`payment-option ${metodoPago === "stripe" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="pago"
                    value="stripe"
                    checked={metodoPago === "stripe"}
                    onChange={() => setMetodoPago("stripe")}
                  />
                  <div className="payment-option-content">
                    <CreditCard size={20} />
                    <div>
                      <strong>Tarjeta de Crédito / Débito</strong>
                      <p>Visa, Mastercard, American Express</p>
                    </div>
                  </div>
                </label>

                <label className={`payment-option ${metodoPago === "contraentrega" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="pago"
                    value="contraentrega"
                    checked={metodoPago === "contraentrega"}
                    onChange={() => setMetodoPago("contraentrega")}
                  />
                  <div className="payment-option-content">
                    <Truck size={20} />
                    <div>
                      <strong>Pago contra entrega</strong>
                      <p>Paga en efectivo al recibir tu pedido</p>
                    </div>
                  </div>
                </label>
              </div>

              <div className="checkout-confirm-address">
                <p><strong>Entregar en:</strong></p>
                <p>{direccion.nombre} {direccion.apellido}</p>
                <p>{direccion.direccion}, {direccion.distrito}, {direccion.ciudad}</p>
                <button type="button" onClick={() => setStep("direccion")} className="edit-address-btn">
                  Cambiar dirección
                </button>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="btn-primary btn-full"
              >
                {loading ? "Procesando..." : `Confirmar Pedido — S/ ${total.toFixed(2)}`}
              </button>
            </div>
          )}
        </div>

        {/* Right: order summary */}
        <div className="checkout-summary">
          <h2>Tu Pedido</h2>
          <div className="checkout-items">
            {items.map((item) => (
              <div key={`${item.product.id}-${item.color}-${item.talla}`} className="checkout-item">
                <img
                  src={item.product.imagen || "/placeholder-product.svg"}
                  alt={item.product.nombre}
                  className="checkout-item-img"
                  onError={(e) => {
                    const image = e.target as HTMLImageElement;
                    image.onerror = null;
                    image.src = "/placeholder-product.svg";
                  }}
                />
                <div className="checkout-item-info">
                  <p>{item.product.nombre}</p>
                  {item.color && <p className="checkout-item-talla">Color: {item.color}</p>}
                  {item.talla && <p className="checkout-item-talla">Talla: {item.talla}</p>}
                  <p>x{item.quantity}</p>
                </div>
                <span>S/ {(item.product.precio * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="checkout-totals">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>S/ {subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Envío</span>
              <span>{COSTO_ENVIO === 0 ? "Gratis" : `S/ ${Number(COSTO_ENVIO).toFixed(2)}`}</span>
            </div>
            <div className="summary-row summary-total">
              <span>Total</span>
              <span>S/ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
