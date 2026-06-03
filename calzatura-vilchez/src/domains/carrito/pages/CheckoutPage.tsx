import { useEffect, useMemo, useRef, useState } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useCart } from "@/domains/carrito/context/CartContext";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { createOrder } from "@/domains/pedidos/services/orders";
import toast from "react-hot-toast";
import type { Address } from "@/types";
import { useCheckoutGeocodingEffects } from "@/domains/carrito/hooks/useCheckoutGeocodingEffects";
import { redirectStripeCheckoutForOrder } from "@/domains/carrito/services/stripeCheckoutRedirect";
import {
  formatDireccionTelefonoForSubmit,
  getCheckoutFieldErrors,
} from "@/domains/carrito/utils/checkoutDireccionValidation";
import type { CheckoutFieldErrors } from "@/domains/carrito/utils/checkoutDireccionValidation";
import { checkoutEnvioSummaryLabel } from "@/domains/carrito/utils/checkoutEnvioSummaryLabel";
import { CheckoutPageBlocked } from "@/domains/carrito/pages/checkout/CheckoutPageBlocked";
import { CheckoutDireccionStep } from "@/domains/carrito/pages/checkout/CheckoutDireccionStep";
import { CheckoutPagoStep } from "@/domains/carrito/pages/checkout/CheckoutPagoStep";
import { CheckoutOrderSummary } from "@/domains/carrito/pages/checkout/CheckoutOrderSummary";
import { resolveCheckoutItems } from "@/domains/carrito/pages/checkout/checkoutStock";

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? "";
const STRIPE_CONFIGURED = Boolean(String(STRIPE_PK).trim());

function placeOrderButtonLabel(loading: boolean, orderError: string | null, total: number): string {
  if (loading) return "Procesando...";
  const action = orderError ? "Reintentar pedido" : "Confirmar Pedido";
  return `${action} — S/ ${total.toFixed(2)}`;
}

function deliveryDegradedNotice(geo: ReturnType<typeof useCheckoutGeocodingEffects>) {
  if (!geo.mapDegraded) return "";
  if (geo.geocodeUnavailable) return geo.geocodeUnavailable;
  if (geo.orsConfigured) return "";
  return "Falta configurar mapas: VITE_BACKEND_API_URL y GOOGLE_MAPS_API_KEY (Directions) en el BFF.";
}

export default function CheckoutPage() {
  useDocumentTitle("Checkout");
  const { items, subtotal, clearCart } = useCart();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<"direccion" | "pago">("direccion");
  const [loading, setLoading] = useState(false);
  const [metodoPago, setMetodoPago] = useState<"stripe" | "contraentrega">(
    STRIPE_CONFIGURED ? "stripe" : "contraentrega",
  );
  const [orderError, setOrderError] = useState("");
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (step === "pago") {
      idempotencyKeyRef.current ??= crypto.randomUUID();
    } else {
      idempotencyKeyRef.current = null;
    }
  }, [step]);

  const [direccion, setDireccion] = useState<Address>({
    nombre: userProfile?.nombre?.split(" ")[0] ?? "",
    apellido: userProfile?.nombre?.split(" ")[1] ?? "",
    direccion: "",
    ciudad: "Huancayo",
    distrito: "",
    telefono: userProfile?.telefono ?? "",
    referencia: "",
  });

  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const geo = useCheckoutGeocodingEffects({ direccion });
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

  if (items.length === 0) return <CheckoutPageBlocked reason="empty-cart" />;
  if (!user) return <CheckoutPageBlocked reason="login-required" />;

  const geoValidationArgs = {
    direccion,
    deliveryPricingActive: geo.deliveryPricingActive,
    locationConfirmed: geo.locationConfirmed,
    selectedDelivery: geo.selectedDelivery,
    deliveryQuoteLoading: geo.deliveryQuoteLoading,
    deliveryQuoteError: geo.deliveryQuoteError,
    deliveryQuote: geo.deliveryQuote,
  };

  const handleDireccionSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const errors = getCheckoutFieldErrors(geoValidationArgs);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.delivery) toast.error(errors.delivery);
      return;
    }
    setFieldErrors({});
    setDireccion(formatDireccionTelefonoForSubmit(direccion));
    setStep("pago");
  };

  const handlePlaceOrder = async () => {
    if (submittingRef.current || loading) return;
    setOrderError("");
    if (metodoPago === "stripe" && !STRIPE_CONFIGURED) {
      toast.error(
        "El pago con tarjeta no está configurado (falta VITE_STRIPE_PUBLIC_KEY). Usa contra entrega o contacta a la tienda.",
      );
      setOrderError(
        "El pago con tarjeta no esta configurado. Selecciona pago contra entrega e intenta nuevamente.",
      );
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    const idempotencyKey = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = idempotencyKey;
    try {
      const checkoutItems = await resolveCheckoutItems(items);
      const deliveryPoint = geo.selectedDelivery;
      const orderDireccion = {
        ...direccion,
        ...(deliveryPoint
          ? { lat: deliveryPoint.lat, lng: deliveryPoint.lng, ubicacionLabel: deliveryPoint.label }
          : {}),
      };
      const orderId = await createOrder({
        items: checkoutItems,
        direccion: orderDireccion,
        metodoPago,
        notas: "",
        envio: geo.envioMonto,
        idempotencyKey,
      });

      if (metodoPago === "stripe" && STRIPE_CONFIGURED) {
        await redirectStripeCheckoutForOrder(user, orderId);
      } else {
        clearCart();
        navigate(`/pedido-exitoso/${orderId}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      toast.error("Error al procesar el pedido: " + message);
      setOrderError(`No pudimos procesar el pedido. ${message}`);
      submittingRef.current = false;
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
          {step === "direccion" ? (
            <CheckoutDireccionStep
              direccion={direccion}
              fieldErrors={fieldErrors}
              geo={geo}
              degradedNotice={deliveryDegradedNotice(geo)}
              addressLineLen={geo.addressLine().length}
              onDireccionChange={setDireccion}
              onClearFieldError={(key) => setFieldErrors((prev) => ({ ...prev, [key]: undefined }))}
              onSubmit={handleDireccionSubmit}
            />
          ) : (
            <CheckoutPagoStep
              direccion={direccion}
              metodoPago={metodoPago}
              stripeConfigured={STRIPE_CONFIGURED}
              orderError={orderError}
              loading={loading}
              pagoDisabledByDelivery={pagoDisabledByDelivery}
              placeOrderLabel={placeOrderButtonLabel(loading, orderError, checkoutTotal)}
              onMetodoPagoChange={setMetodoPago}
              onEditDireccion={() => setStep("direccion")}
              onPlaceOrder={handlePlaceOrder}
            />
          )}
        </div>

        <CheckoutOrderSummary
          items={items}
          subtotal={subtotal}
          envioSummaryText={envioSummaryText}
          checkoutTotal={checkoutTotal}
        />
      </div>
    </main>
  );
}
