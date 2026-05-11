import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShoppingBag, CreditCard, Truck, ChevronRight } from "lucide-react";
import { useCart } from "@/domains/carrito/context/CartContext";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { createOrder } from "@/domains/pedidos/services/orders";
import toast from "react-hot-toast";
import type { Address } from "@/types";
import { loadStripe } from "@stripe/stripe-js";
import { formatPeruPhone, isValidPeruPhone, normalizePeruPhoneInput, peruPhoneError } from "@/utils/phone";
import { DELIVERY_CONFIG } from "@/config/delivery";
import {
  calculateDeliveryForCoordinates,
  geocodeCheckoutFormSuggestions,
  geocodeSearchBarSuggestions,
  hasOpenRouteServiceKey,
  reverseGeocodeLabel,
  type DeliveryQuote,
  type GeocodeCandidate,
} from "@/services/deliveryOpenRoute";
import CheckoutDeliveryMap from "@/domains/carrito/components/CheckoutDeliveryMap";

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? "";

function buildAddressLine(d: Address): string {
  return [d.direccion, d.distrito, d.ciudad].map((s) => s.trim()).filter(Boolean).join(", ");
}

const GEO_LAYER_HINT: Partial<Record<string, string>> = {
  address: "Dirección (calle y número)",
  street: "Calle",
  venue: "Lugar / negocio",
  neighbourhood: "Barrio",
  borough: "Distrito o zona",
  locality: "Ciudad (poco preciso)",
  localadmin: "Zona administrativa",
  region: "Región",
};

function geoLayerHint(layer?: string): string | null {
  if (!layer) return null;
  return GEO_LAYER_HINT[layer] ?? null;
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<"direccion" | "pago">("direccion");
  const [loading, setLoading] = useState(false);
  const [metodoPago, setMetodoPago] = useState<"stripe" | "contraentrega">("stripe");
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
  const [deliveryQuoteLoading, setDeliveryQuoteLoading] = useState(false);
  const [deliveryQuoteError, setDeliveryQuoteError] = useState("");

  const [addressSuggestions, setAddressSuggestions] = useState<GeocodeCandidate[]>([]);
  const [addressSuggestLoading, setAddressSuggestLoading] = useState(false);
  const [addressSuggestError, setAddressSuggestError] = useState("");

  const [mapSearchInput, setMapSearchInput] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<GeocodeCandidate[]>([]);
  const [searchSuggestLoading, setSearchSuggestLoading] = useState(false);
  const [searchSuggestError, setSearchSuggestError] = useState("");

  const [selectedDelivery, setSelectedDelivery] = useState<GeocodeCandidate | null>(null);
  const [mapFitNonce, setMapFitNonce] = useState(0);

  const selectedDeliveryRef = useRef<GeocodeCandidate | null>(null);
  useEffect(() => {
    selectedDeliveryRef.current = selectedDelivery;
  }, [selectedDelivery]);

  const reverseGeocodeRequestId = useRef(0);

  const [direccion, setDireccion] = useState<Address>({
    nombre: userProfile?.nombre?.split(" ")[0] ?? "",
    apellido: userProfile?.nombre?.split(" ")[1] ?? "",
    direccion: "",
    ciudad: "Huancayo",
    distrito: "",
    telefono: userProfile?.telefono ?? "",
    referencia: "",
  });

  const orsEnabled = hasOpenRouteServiceKey();

  useEffect(() => {
    if (!orsEnabled) {
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      const line = buildAddressLine(direccion);
      if (line.length < 10) {
        setAddressSuggestions([]);
        setAddressSuggestError("");
        setAddressSuggestLoading(false);
        setSelectedDelivery(null);
        setDeliveryQuote(null);
        setDeliveryQuoteError("");
        setDeliveryQuoteLoading(false);
        return;
      }
      void (async () => {
        setAddressSuggestLoading(true);
        setAddressSuggestError("");
        try {
          const list = await geocodeCheckoutFormSuggestions({
            direccion: direccion.direccion,
            distrito: direccion.distrito,
            ciudad: direccion.ciudad,
          });
          if (ctrl.signal.aborted) return;
          setAddressSuggestions(list);
        } catch (err) {
          if (ctrl.signal.aborted) return;
          setAddressSuggestions([]);
          setAddressSuggestError(err instanceof Error ? err.message : "No se pudieron cargar sugerencias");
        } finally {
          if (!ctrl.signal.aborted) setAddressSuggestLoading(false);
        }
      })();
    }, 550);

    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo dirección compuesta
  }, [direccion.direccion, direccion.distrito, direccion.ciudad, orsEnabled]);

  useEffect(() => {
    if (!orsEnabled) return;
    const ctrl = new AbortController();
    const q = mapSearchInput.trim();
    const timer = window.setTimeout(() => {
      if (q.length < 3) {
        setSearchSuggestions([]);
        setSearchSuggestError("");
        setSearchSuggestLoading(false);
        return;
      }
      void (async () => {
        setSearchSuggestLoading(true);
        setSearchSuggestError("");
        try {
          const list = await geocodeSearchBarSuggestions(q, {
            ciudad: direccion.ciudad,
            distrito: direccion.distrito,
          });
          if (ctrl.signal.aborted) return;
          setSearchSuggestions(list);
        } catch (err) {
          if (ctrl.signal.aborted) return;
          setSearchSuggestions([]);
          setSearchSuggestError(err instanceof Error ? err.message : "Error en la búsqueda");
        } finally {
          if (!ctrl.signal.aborted) setSearchSuggestLoading(false);
        }
      })();
    }, 450);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [mapSearchInput, orsEnabled, direccion.ciudad, direccion.distrito]);

  useEffect(() => {
    if (!orsEnabled || !selectedDelivery) {
      startTransition(() => {
        setDeliveryQuote(null);
        setDeliveryQuoteError("");
        setDeliveryQuoteLoading(false);
      });
      return;
    }
    const lat = selectedDelivery.lat;
    const lng = selectedDelivery.lng;
    let cancelled = false;
    startTransition(() => {
      setDeliveryQuoteLoading(true);
      setDeliveryQuoteError("");
    });
    void calculateDeliveryForCoordinates(lat, lng, selectedDeliveryRef.current?.label)
      .then((q) => {
        if (cancelled) return;
        setDeliveryQuote({
          ...q,
          label: selectedDeliveryRef.current?.label ?? q.label,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setDeliveryQuote(null);
        setDeliveryQuoteError(err instanceof Error ? err.message : "No se pudo calcular el envío");
      })
      .finally(() => {
        if (!cancelled) setDeliveryQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nueva cotización solo al cambiar coordenadas; la etiqueta se sincroniza en el efecto siguiente y vía ref en el fetch
  }, [orsEnabled, selectedDelivery?.lat, selectedDelivery?.lng]);

  useEffect(() => {
    if (!selectedDelivery?.label) return;
    const sel = selectedDelivery;
    startTransition(() => {
      setDeliveryQuote((prev) => {
        if (!prev || prev.customerLat !== sel.lat || prev.customerLng !== sel.lng) {
          return prev;
        }
        if (prev.label === sel.label) return prev;
        return { ...prev, label: sel.label };
      });
    });
  }, [selectedDelivery]);

  const pickCandidate = useCallback((c: GeocodeCandidate, refitMap: boolean) => {
    setSelectedDelivery(c);
    if (refitMap) setMapFitNonce((n) => n + 1);
  }, []);

  const onMapCustomerMove = useCallback((lat: number, lng: number) => {
    const id = ++reverseGeocodeRequestId.current;
    setSelectedDelivery({ lat, lng, label: "Ubicación en el mapa…" });
    void (async () => {
      let label: string | null = null;
      try {
        label = await reverseGeocodeLabel(lng, lat);
      } catch {
        label = null;
      }
      if (reverseGeocodeRequestId.current !== id) return;
      setSelectedDelivery({ lat, lng, label: label ?? "Ubicación elegida en el mapa" });
    })();
  }, []);

  const envioMonto = useMemo(() => {
    if (!orsEnabled) return 0;
    if (!deliveryQuote || deliveryQuote.isOutOfRange) return 0;
    return deliveryQuote.cost;
  }, [deliveryQuote, orsEnabled]);

  const checkoutTotal = subtotal + envioMonto;

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
    if (orsEnabled) {
      const line = buildAddressLine(direccion);
      if (line.length >= 10 && !selectedDelivery) {
        toast.error("Elegí un punto de entrega: una sugerencia de la lista, una búsqueda o el mapa.");
        return;
      }
      if (deliveryQuoteLoading) {
        toast.error("Espera un momento: estamos calculando el costo de envío.");
        return;
      }
      if (deliveryQuoteError) {
        toast.error(deliveryQuoteError);
        return;
      }
      if (!deliveryQuote || deliveryQuote.isOutOfRange) {
        toast.error(
          `No podemos entregar a esa dirección (máx. ${DELIVERY_CONFIG.maxDeliveryKm} km desde la tienda).`,
        );
        return;
      }
    }
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
        envio: envioMonto,
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

              {orsEnabled && (
                <div className="checkout-delivery-box">
                  <p className="checkout-delivery-title">Envío (OpenRouteService)</p>
                  <p className="checkout-delivery-muted checkout-delivery-intro">
                    La lista prioriza direcciones y calles sobre solo «ciudad». Incluí en <strong>Dirección</strong> el
                    nombre de la vía y el número (ej. Jr. Puno 245). Si no aparece tu puerta exacta, tocá el mapa o
                    arrastrá el pin azul.
                  </p>

                  <div className="form-group checkout-delivery-search-group">
                    <label>Buscar ubicación en el mapa</label>
                    <input
                      type="text"
                      value={mapSearchInput}
                      onChange={(e) => setMapSearchInput(e.target.value)}
                      className="form-input"
                      placeholder="Ej: Jr. Puno 123, Huancayo"
                      autoComplete="street-address"
                    />
                    {searchSuggestLoading && (
                      <p className="checkout-delivery-muted">Buscando…</p>
                    )}
                    {!searchSuggestLoading && searchSuggestError && (
                      <p className="checkout-delivery-error">{searchSuggestError}</p>
                    )}
                    {!searchSuggestLoading && !searchSuggestError && searchSuggestions.length > 0 && (
                      <ul className="checkout-delivery-suggest-list" role="listbox" aria-label="Resultados de búsqueda">
                        {searchSuggestions.map((c, i) => (
                          <li key={`s-${i}-${c.lat}-${c.lng}`}>
                            <button
                              type="button"
                              className="checkout-delivery-suggest-btn"
                              title={c.label}
                              onClick={() => pickCandidate(c, true)}
                            >
                              <span className="checkout-delivery-suggest-label">{c.label}</span>
                              {geoLayerHint(c.layer) ? (
                                <span className="checkout-delivery-layer-hint">{geoLayerHint(c.layer)}</span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {buildAddressLine(direccion).length >= 10 && (
                    <div className="checkout-delivery-suggest-block">
                      <p className="checkout-delivery-subtitle">Sugerencias según tu dirección</p>
                      {addressSuggestLoading && (
                        <p className="checkout-delivery-muted">Cargando sugerencias…</p>
                      )}
                      {!addressSuggestLoading && addressSuggestError && (
                        <p className="checkout-delivery-error">{addressSuggestError}</p>
                      )}
                      {!addressSuggestLoading && !addressSuggestError && addressSuggestions.length === 0 && (
                        <p className="checkout-delivery-muted">No hay resultados; probá el buscador de arriba.</p>
                      )}
                      {!addressSuggestLoading && !addressSuggestError && addressSuggestions.length > 0 && (
                        <ul className="checkout-delivery-suggest-list" role="listbox" aria-label="Sugerencias por dirección">
                          {addressSuggestions.map((c, i) => (
                            <li key={`a-${i}-${c.lat}-${c.lng}`}>
                              <button
                                type="button"
                                className="checkout-delivery-suggest-btn"
                                title={c.label}
                                onClick={() => pickCandidate(c, true)}
                              >
                                <span className="checkout-delivery-suggest-label">{c.label}</span>
                                {geoLayerHint(c.layer) ? (
                                  <span className="checkout-delivery-layer-hint">{geoLayerHint(c.layer)}</span>
                                ) : null}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {selectedDelivery && (
                    <CheckoutDeliveryMap
                      storeLat={DELIVERY_CONFIG.storeLat}
                      storeLng={DELIVERY_CONFIG.storeLng}
                      customerLat={selectedDelivery.lat}
                      customerLng={selectedDelivery.lng}
                      fitBoundsNonce={mapFitNonce}
                      interactive
                      onCustomerPositionChange={onMapCustomerMove}
                    />
                  )}

                  {deliveryQuoteLoading && (
                    <p className="checkout-delivery-muted">Calculando distancia y costo…</p>
                  )}
                  {!deliveryQuoteLoading && deliveryQuoteError && (
                    <p className="checkout-delivery-error">{deliveryQuoteError}</p>
                  )}
                  {!deliveryQuoteLoading && !deliveryQuoteError && deliveryQuote && (
                    <>
                      <p className="checkout-delivery-line">
                        Distancia aprox.: <strong>{deliveryQuote.distanceFormatted}</strong>
                        {deliveryQuote.label ? (
                          <span className="checkout-delivery-muted"> — {deliveryQuote.label}</span>
                        ) : null}
                      </p>
                      {deliveryQuote.isOutOfRange ? (
                        <p className="checkout-delivery-error">
                          Fuera de zona de reparto (máximo {DELIVERY_CONFIG.maxDeliveryKm} km).
                        </p>
                      ) : deliveryQuote.isFreeDelivery ? (
                        <p className="checkout-delivery-ok">Envío gratis en tu zona.</p>
                      ) : (
                        <p className="checkout-delivery-line">
                          Costo de envío: <strong>{deliveryQuote.costFormatted}</strong>
                        </p>
                      )}
                    </>
                  )}

                  {buildAddressLine(direccion).length < 10 && (
                    <p className="checkout-delivery-muted">Completa dirección, distrito y ciudad para ver sugerencias de envío.</p>
                  )}
                </div>
              )}

              {!orsEnabled && (
                <p className="checkout-delivery-muted">
                  Sin <code className="checkout-delivery-code">VITE_ORS_API_KEY</code>, el envío se registra como S/ 0.00
                  (configura la clave en <code className="checkout-delivery-code">.env.local</code> para cálculo automático).
                </p>
              )}

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
                disabled={
                  loading ||
                  (orsEnabled &&
                    (deliveryQuoteLoading ||
                      !!deliveryQuoteError ||
                      !deliveryQuote ||
                      deliveryQuote.isOutOfRange))
                }
                className="btn-primary btn-full"
              >
                {loading ? "Procesando..." : `Confirmar Pedido — S/ ${checkoutTotal.toFixed(2)}`}
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
              <span>
                {!orsEnabled
                  ? "S/ 0.00"
                  : deliveryQuoteLoading
                    ? "…"
                    : deliveryQuoteError
                      ? "—"
                      : !deliveryQuote
                        ? "—"
                        : deliveryQuote.isOutOfRange
                          ? "No disponible"
                          : deliveryQuote.isFreeDelivery
                            ? "Gratis"
                            : deliveryQuote.costFormatted}
              </span>
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
