import type { CartItem } from "@/types";

type CheckoutOrderSummaryProps = Readonly<{
  items: CartItem[];
  subtotal: number;
  envioSummaryText: string;
  checkoutTotal: number;
}>;

export function CheckoutOrderSummary({
  items,
  subtotal,
  envioSummaryText,
  checkoutTotal,
}: CheckoutOrderSummaryProps) {
  return (
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
              {item.color ? <p className="checkout-item-talla">Color: {item.color}</p> : null}
              {item.talla ? <p className="checkout-item-talla">Talla: {item.talla}</p> : null}
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
  );
}
