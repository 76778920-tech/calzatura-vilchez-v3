import { X, ShoppingBag, Trash2, Plus, Minus } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart, COSTO_ENVIO } from "@/domains/carrito/context/CartContext";

export default function CartSidebar() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, subtotal, total, itemCount } = useCart();

  if (!isOpen) return null;

  return (
    <>
      <div className="cart-overlay" onClick={() => setIsOpen(false)} />
      <aside className="cart-sidebar">
        {/* Header */}
        <div className="cart-header">
          <div className="cart-header-title">
            <ShoppingBag size={20} />
            <span>Mi Carrito ({itemCount})</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="cart-close-btn">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="cart-items">
          {items.length === 0 ? (
            <div className="cart-empty">
              <ShoppingBag size={48} className="cart-empty-icon" />
              <p>Tu carrito está vacío</p>
              <button onClick={() => setIsOpen(false)} className="btn-primary">
                Ver Productos
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={`${item.product.id}-${item.color}-${item.talla}`} className="cart-item">
                <img
                  src={item.product.imagen || "/placeholder.jpg"}
                  alt={item.product.nombre}
                  className="cart-item-img"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.jpg"; }}
                />
                <div className="cart-item-info">
                  <p className="cart-item-name">{item.product.nombre}</p>
                  {item.color && <p className="cart-item-talla">Color: {item.color}</p>}
                  {item.talla && <p className="cart-item-talla">Talla: {item.talla}</p>}
                  <p className="cart-item-price">
                    S/ {(item.product.precio * item.quantity).toFixed(2)}
                  </p>
                  <div className="cart-item-controls">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.talla, item.color)}
                      className="qty-btn"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.talla, item.color)}
                      className="qty-btn"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={() => removeItem(item.product.id, item.talla, item.color)}
                      className="remove-btn"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        {items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-summary">
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <span>S/ {subtotal.toFixed(2)}</span>
              </div>
              <div className="cart-summary-row">
                <span>Envío</span>
                <span>{COSTO_ENVIO === 0 ? "Gratis" : `S/ ${Number(COSTO_ENVIO).toFixed(2)}`}</span>
              </div>
              <div className="cart-summary-row cart-summary-total">
                <span>Total</span>
                <span>S/ {total.toFixed(2)}</span>
              </div>
            </div>
            <Link
              to="/checkout"
              className="btn-checkout"
              onClick={() => setIsOpen(false)}
            >
              Proceder al Pago
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="btn-continue"
            >
              Continuar Comprando
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
