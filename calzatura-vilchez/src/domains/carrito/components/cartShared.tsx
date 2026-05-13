import { COSTO_ENVIO } from "@/domains/carrito/context/CartContext";

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
