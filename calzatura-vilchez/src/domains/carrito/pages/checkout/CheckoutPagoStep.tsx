import { AlertCircle, CreditCard, Truck } from "lucide-react";
import type { Address } from "@/types";

type CheckoutPagoStepProps = {
  direccion: Address;
  metodoPago: "stripe" | "contraentrega";
  stripeConfigured: boolean;
  orderError: string;
  loading: boolean;
  pagoDisabledByDelivery: boolean;
  placeOrderLabel: string;
  onMetodoPagoChange: (metodo: "stripe" | "contraentrega") => void;
  onEditDireccion: () => void;
  onPlaceOrder: () => void;
};

export function CheckoutPagoStep({
  direccion,
  metodoPago,
  stripeConfigured,
  orderError,
  loading,
  pagoDisabledByDelivery,
  placeOrderLabel,
  onMetodoPagoChange,
  onEditDireccion,
  onPlaceOrder,
}: CheckoutPagoStepProps) {
  return (
    <div className="checkout-form">
      <fieldset className="payment-options-fieldset">
        <legend className="form-section-title payment-options-legend">
          <CreditCard size={18} aria-hidden="true" /> Método de Pago
        </legend>

        <div className="payment-options">
          <label
            className={`payment-option ${metodoPago === "stripe" ? "selected" : ""} ${stripeConfigured ? "" : "is-disabled"}`}
          >
            <input
              type="radio"
              name="pago"
              value="stripe"
              checked={metodoPago === "stripe"}
              disabled={!stripeConfigured}
              onChange={() => onMetodoPagoChange("stripe")}
            />
            <div className="payment-option-content">
              <CreditCard size={20} />
              <div>
                <strong>Tarjeta de Crédito / Débito</strong>
                <p>
                  {stripeConfigured
                    ? "Visa, Mastercard, American Express"
                    : "No disponible: falta configurar Stripe en produccion"}
                </p>
              </div>
            </div>
          </label>

          <label className={`payment-option ${metodoPago === "contraentrega" ? "selected" : ""}`}>
            <input
              type="radio"
              name="pago"
              value="contraentrega"
              checked={metodoPago === "contraentrega"}
              onChange={() => onMetodoPagoChange("contraentrega")}
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
      </fieldset>

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
        <button type="button" onClick={onEditDireccion} className="edit-address-btn">
          Cambiar dirección
        </button>
      </div>

      <p className="checkout-validation-note">
        Precios, stock y disponibilidad se validan nuevamente contra el catalogo vivo al confirmar.
      </p>

      {orderError ? (
        <div className="checkout-error-state" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div>
            <strong>No se pudo confirmar el pedido</strong>
            <p>{orderError}</p>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onPlaceOrder}
        disabled={loading || pagoDisabledByDelivery}
        className="btn-primary btn-full"
      >
        {placeOrderLabel}
      </button>
    </div>
  );
}
