import { Minus, Plus } from "lucide-react";
import { COSTO_ENVIO } from "@/domains/carrito/context/CartContext";

export function CartItemQtyControls({ productId, quantity, talla, color, onUpdate }: Readonly<{
  productId: string;
  quantity: number;
  talla: string | undefined;
  color: string | undefined;
  onUpdate: (id: string, qty: number, talla: string | undefined, color: string | undefined) => void;
}>) {
  return (
    <>
      <button onClick={() => onUpdate(productId, quantity - 1, talla, color)} className="qty-btn">
        <Minus size={12} />
      </button>
      <span className="qty-value">{quantity}</span>
      <button onClick={() => onUpdate(productId, quantity + 1, talla, color)} className="qty-btn">
        <Plus size={12} />
      </button>
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
