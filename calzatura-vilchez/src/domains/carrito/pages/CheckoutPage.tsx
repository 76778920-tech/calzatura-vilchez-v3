import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShoppingBag, CreditCard, Truck, ChevronRight } from "lucide-react";
import { useCart } from "@/domains/carrito/context/CartContext";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { createOrder } from "@/domains/pedidos/services/orders";
import { fetchPublicProducts } from "@/domains/productos/services/products";
import toast from "react-hot-toast";
import type { Address, CartItem, Product } from "@/types";
import { normalizePeruPhoneInput } from "@/utils/phone";
import { getSizeStock } from "@/utils/stock";
import CheckoutDeliveryBox from "@/domains/carrito/components/CheckoutDeliveryBox";
import { useCheckoutGeocodingEffects } from "@/domains/carrito/hooks/useCheckoutGeocodingEffects";
import { redirectStripeCheckoutForOrder } from "@/domains/carrito/services/stripeCheckoutRedirect";
import {
  formatDireccionTelefonoForSubmit,
  validateCheckoutDireccionStep,
} from "@/domains/carrito/utils/checkoutDireccionValidation";
import { checkoutEnvioSummaryLabel } from "@/domains/carrito/utils/checkoutEnvioSummaryLabel";

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? "";

function comparable(value?: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function sameText(a?: string, b?: string) {
  return comparable(a) === comparable(b);
}

function findLiveProductForCartItem(products: Product[], item: CartItem) {
  const requestedColor = item.color || item.product.color || "";
  const requestedName = item.product.nombre || "";
  const requestedSize = item.talla || "";
  const requestedQty = Number(item.quantity || 0);

  const byId = products.find((product) => product.id === item.product.id);
  if (
    byId &&
    (!requestedColor || sameText(byId.color, requestedColor)) &&
    getSizeStock(byId, requestedSize || undefined) >= requestedQty
  ) {
    return byId;
  }

  return products.find((product) => {
    if (!sameText(product.nombre, requestedName)) return false;
    if (requestedColor && !sameText(product.color, requestedColor)) return false;
    return getSizeStock(product, requestedSize || undefined) >= requestedQty;
  });
}

async function resolveCheckoutItems(items: CartItem[]) {
  const liveProducts = await fetchPublicProducts();
  return items.map((item) => {
    const liveProduct = findLiveProductForCartItem(liveProducts, item);
    if (!liveProduct) {
      throw new Error(`${item.product.nombre} (${item.color || item.product.color || "sin color"} talla ${item.talla || "-"}) no tiene stock disponible`);
    }
    return {
      ...item,
      product: liveProduct,
      color: item.color || liveProduct.color,
    };
  });
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
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

  const geo = useCheckoutGeocodingEffects({ direccion });
  const addressLineLen = geo.addressLine().length;

  const checkoutTotal = subtotal + geo.envioMonto;

  const envioSummaryText = useMemo(
    () =>
      checkoutEnvioSummaryLabel({
        deliveryPricingActive: geo.deliveryPricingActive,
        locationConfirmed: geo.locationConfirmed,
        deliveryQuoteLoading: geo.deliveryQuoteLoading,
        deliveryQuoteError: geo.deliveryQuoteError,
        deliveryQuote: geo.deliveryQuote,
      }),
    [
      geo.deliveryQuote,
      geo.deliveryQuoteError,
      geo.deliveryQuoteLoading,
      geo.deliveryPricingActive,
      geo.locationConfirmed,
    ],
  );

  const pagoDisabledByDelivery =
    geo.deliveryPricingActive &&
    (!geo.locationConfirmed ||
      geo.deliveryQuoteLoading ||
      !!geo.deliveryQuoteError ||
      !geo.deliveryQuote ||
      geo.deliveryQuote.isOutOfRange);

  const deliveryDegradedNotice = geo.mapDegraded
    ? geo.geocodeUnavailable ||
      (!geo.orsConfigured
        ? "Falta configurar mapas: VITE_BACKEND_API_URL + ORS_API_KEY en el BFF, o VITE_ORS_API_KEY en el build."
        : "")
    : "";

  if (items.length === 0) {
    return (
      <main className="empty-cart-page">
        <ShoppingBag size={72} className="empty-cart-icon" />
        <h2>Tu carrito está vacío</h2>
        <Link to="/productos" className="btn-primary">
          Ver Productos
        </Link>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="empty-cart-page">
        <h2>Debes iniciar sesión para continuar</h2>
        <Link to="/login" className="btn-primary">
          Iniciar Sesión
        </Link>
      </main>
    );
  }

  const handleDireccionSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const err = validateCheckoutDireccionStep({
      direccion,
      deliveryPricingActive: geo.deliveryPricingActive,
      locationConfirmed: geo.locationConfirmed,
      selectedDelivery: geo.selectedDelivery,
      deliveryQuoteLoading: geo.deliveryQuoteLoading,
      deliveryQuoteError: geo.deliveryQuoteError,
      deliveryQuote: geo.deliveryQuote,
    });
    if (err) {
      toast.error(err);
      return;
    }
    setDireccion(formatDireccionTelefonoForSubmit(direccion));
    setStep("pago");
  };

  const handlePlaceOrder = async () => {
    if (metodoPago === "stripe" && !STRIPE_PK.trim()) {
      toast.error("El pago con tarjeta no está configurado (falta VITE_STRIPE_PUBLIC_KEY). Usa contra entrega o contacta a la tienda.");
      return;
    }
    setLoading(true);
    try {
      const checkoutItems = await resolveCheckoutItems(items);
      const orderId = await createOrder({
        items: checkoutItems,
        direccion,
        metodoPago,
        notas: "",
        envio: geo.envioMonto,
      });

      if (metodoPago === "stripe" && STRIPE_PK) {
        await redirectStripeCheckoutForOrder(user, orderId, STRIPE_PK);
      } else {
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
        <div className="checkout-form-area">
          {step === "direccion" && (
            <form onSubmit={handleDireccionSubmit} className="checkout-form">
              <h2 className="form-section-title">
                <Truck size={18} /> Datos de Entrega
              </h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="checkout-nombre">Nombre *</label>
                  <input
                    id="checkout-nombre"
                    value={direccion.nombre}
                    onChange={(e) => setDireccion({ ...direccion, nombre: e.target.value })}
                    required
                    className="form-input"
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="checkout-apellido">Apellido *</label>
                  <input
                    id="checkout-apellido"
                    value={direccion.apellido}
                    onChange={(e) => setDireccion({ ...direccion, apellido: e.target.value })}
                    required
                    className="form-input"
                    placeholder="Tu apellido"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="checkout-direccion">Dirección *</label>
                <input
                  id="checkout-direccion"
                  value={direccion.direccion}
                  onChange={(e) => setDireccion({ ...direccion, direccion: e.target.value })}
                  required
                  className="form-input"
                  placeholder="Av., Calle, Jr..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="checkout-ciudad">Ciudad *</label>
                  <input
                    id="checkout-ciudad"
                    value={direccion.ciudad}
                    onChange={(e) => setDireccion({ ...direccion, ciudad: e.target.value })}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="checkout-distrito">Distrito *</label>
                  <input
                    id="checkout-distrito"
                    value={direccion.distrito}
                    onChange={(e) => setDireccion({ ...direccion, distrito: e.target.value })}
                    required
                    className="form-input"
                    placeholder="Miraflores, SJL..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="checkout-telefono">Teléfono *</label>
                <input
                  id="checkout-telefono"
                  type="tel"
                  value={direccion.telefono}
                  onChange={(e) =>
                    setDireccion({
                      ...direccion,
                      telefono: normalizePeruPhoneInput(e.target.value),
                    })
                  }
                  required
                  inputMode="tel"
                  maxLength={15}
                  pattern="(?:\+51\s?)?9[0-9]{2}\s?[0-9]{3}\s?[0-9]{3}"
                  className="form-input"
                  placeholder="+51 999 999 999"
                />
              </div>

              <div className="form-group">
                <label htmlFor="checkout-referencia">Referencia</label>
                <input
                  id="checkout-referencia"
                  value={direccion.referencia ?? ""}
                  onChange={(e) => setDireccion({ ...direccion, referencia: e.target.value })}
                  className="form-input"
                  placeholder="Cerca a..."
                />
              </div>

              <CheckoutDeliveryBox
                mapDegraded={geo.mapDegraded}
                degradedNotice={deliveryDegradedNotice}
                addressLineLength={addressLineLen}
                mapSearchInput={geo.mapSearchInput}
                mapSearchHasHouseNumber={geo.mapSearchHasHouseNumber}
                onMapSearchChange={geo.setMapSearchInput}
                searchSuggestLoading={geo.searchSuggestLoading}
                searchSuggestError={geo.searchSuggestError}
                searchSuggestions={geo.searchSuggestions}
                onPickCandidate={geo.pickCandidate}
                onPickSearchByIndex={geo.pickSearchSuggestion}
                addressSuggestLoading={geo.addressSuggestLoading}
                addressSuggestError={geo.addressSuggestError}
                addressSuggestions={geo.addressSuggestions}
                addressHasHouseNumber={geo.addressHasHouseNumber}
                selectedDelivery={geo.selectedDelivery}
                showDeliveryMap={geo.showDeliveryMap}
                locationConfirmed={geo.locationConfirmed}
                mapFitNonce={geo.mapFitNonce}
                routePositions={geo.routePositions}
                routeLoading={geo.routeLoading}
                onMapCustomerMove={geo.onMapCustomerMove}
                deliveryQuoteLoading={geo.deliveryQuoteLoading}
                deliveryQuoteError={geo.deliveryQuoteError}
                deliveryQuote={geo.deliveryQuote}
              />

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
                <p>
                  <strong>Entregar en:</strong>
                </p>
                <p>
                  {direccion.nombre} {direccion.apellido}
                </p>
                <p>
                  {direccion.direccion}, {direccion.distrito}, {direccion.ciudad}
                </p>
                <button type="button" onClick={() => setStep("direccion")} className="edit-address-btn">
                  Cambiar dirección
                </button>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading || pagoDisabledByDelivery}
                className="btn-primary btn-full"
              >
                {loading ? "Procesando..." : `Confirmar Pedido — S/ ${checkoutTotal.toFixed(2)}`}
              </button>
            </div>
          )}
        </div>

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
              <span>{envioSummaryText}</span>
            </div>
            <div className="summary-row summary-total">
              <span>Total</span>
              <span>S/ {checkoutTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
