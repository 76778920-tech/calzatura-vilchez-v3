import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { X, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/domains/carrito/context/CartContext";
import { CartSummaryRows, CartItemQtyControls } from "@/domains/carrito/components/cartShared";
import { handleProductImageError } from "@/utils/imgUtils";
import { getSizeStock } from "@/utils/stock";

export default function CartSidebar() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, subtotal, total, itemCount } = useCart();
  const dialogRef = useRef<HTMLElement | null>(null);
  const titleId = "cart-sidebar-title";

  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus();
  }, [isOpen]);

  const trapFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])"
      )
    ).filter((el) => el.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="product-modal-host">
      <button
        type="button"
        className="cart-overlay product-modal-backdrop"
        onClick={() => setIsOpen(false)}
        aria-label="Cerrar carrito"
      />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="cart-sidebar"
        onKeyDown={trapFocus}
      >
        <div className="cart-header">
          <div className="cart-header-title" id={titleId}>
            <ShoppingBag size={20} aria-hidden="true" />
            <span>Mi Carrito ({itemCount})</span>
          </div>
          <button type="button" onClick={() => setIsOpen(false)} className="cart-close-btn" aria-label="Cerrar carrito">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="cart-items">
          {items.length === 0 ? (
            <div className="cart-empty">
              <ShoppingBag size={48} className="cart-empty-icon" aria-hidden="true" />
              <p>Tu carrito esta vacio</p>
              <Link to="/productos" onClick={() => setIsOpen(false)} className="btn-primary">
                Ver Productos
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div key={`${item.product.id}-${item.color}-${item.talla}`} className="cart-item">
                <img
                  src={item.product.imagen || "/placeholder-product.svg"}
                  alt={item.product.nombre}
                  className="cart-item-img"
                  onError={handleProductImageError}
                />
                <div className="cart-item-info">
                  <p className="cart-item-name">{item.product.nombre}</p>
                  {item.color && <p className="cart-item-talla">Color: {item.color}</p>}
                  {item.talla && <p className="cart-item-talla">Talla: {item.talla}</p>}
                  <p className="cart-item-price">
                    S/ {(item.product.precio * item.quantity).toFixed(2)}
                  </p>
                  <div className="cart-item-controls">
                    <CartItemQtyControls
                      productId={item.product.id}
                      quantity={item.quantity}
                      talla={item.talla}
                      color={item.color}
                      onUpdate={updateQuantity}
                      maxQuantity={getSizeStock(item.product, item.talla, item.color)}
                      productName={item.product.nombre}
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.product.id, item.talla, item.color)}
                      className="remove-btn"
                      aria-label={`Quitar ${item.product.nombre} del carrito`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-summary">
              <CartSummaryRows subtotal={subtotal} total={total} rowClass="cart-summary-row" totalClass="cart-summary-total" />
            </div>
            <Link
              to="/checkout"
              className="btn-checkout"
              onClick={() => setIsOpen(false)}
            >
              Proceder al Pago
            </Link>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn-continue"
            >
              Continuar Comprando
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
