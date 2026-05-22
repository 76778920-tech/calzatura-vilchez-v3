import { Minus, Plus } from "lucide-react";
import { COSTO_ENVIO } from "@/domains/carrito/context/CartContext";
import toast from "react-hot-toast";

export function CartItemQtyControls({ productId, quantity, talla, color, onUpdate, maxQuantity, productName }: Readonly<{
  productId: string;
  quantity: number;
  talla: string | undefined;
  color: string | undefined;
  onUpdate: (id: string, qty: number, talla: string | undefined, color: string | undefined) => void;
  maxQuantity?: number;
  productName?: string;
}>) {
  const max = Number.isFinite(maxQuantity) ? Math.max(0, Number(maxQuantity)) : Number.POSITIVE_INFINITY;
  const isAtMax = quantity >= max;
  const stockHelpId = `cart-stock-${productId}-${talla || "sin-talla"}-${color || "sin-color"}`.replace(/[^a-zA-Z0-9_-]/g, "-");

  const handleIncrease = () => {
    if (isAtMax) {
      toast.error(`${productName || "Producto"} tiene stock máximo disponible: ${quantity}.`);
      return;
    }
    onUpdate(productId, quantity + 1, talla, color);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => onUpdate(productId, quantity - 1, talla, color)}
        className="qty-btn"
        aria-label={`Disminuir cantidad de ${productName || "producto"}`}
      >
        <Minus size={12} aria-hidden="true" />
      </button>
      <span className="qty-value">{quantity}</span>
      <button
        type="button"
        onClick={handleIncrease}
        className="qty-btn qty-btn-plus"
        aria-label={`Aumentar cantidad de ${productName || "producto"}`}
        aria-disabled={isAtMax ? "true" : undefined}
        aria-describedby={isAtMax ? stockHelpId : undefined}
        title={isAtMax ? `Stock máximo disponible: ${quantity}` : undefined}
      >
        <Plus size={12} aria-hidden="true" />
      </button>
      {isAtMax ? (
        <span id={stockHelpId} className="home-hero-progress-sr-only">
          Stock máximo disponible: {quantity}.
        </span>
      ) : null}
    </>
  );
}

export function CartSummaryRows({ subtotal, total, rowClass, totalClass }: Readonly<{
  subtotal: number;
  total: number;
  rowClass: string;
  totalClass: string;
}>) {
  return (
    <>
      <div className={rowClass}>
        <span>Subtotal</span>
        <span>S/ {subtotal.toFixed(2)}</span>
      </div>
      <div className={rowClass}>
        <span>Envío</span>
        <span>{COSTO_ENVIO === 0 ? "Gratis" : `S/ ${Number(COSTO_ENVIO).toFixed(2)}`}</span>
      </div>
      <div className={`${rowClass} ${totalClass}`}>
        <span>Total</span>
        <span>S/ {total.toFixed(2)}</span>
      </div>
    </>
  );
}
