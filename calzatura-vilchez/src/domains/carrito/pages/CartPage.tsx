import { Link } from "react-router-dom";
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { useCart, COSTO_ENVIO } from "@/domains/carrito/context/CartContext";

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, total, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <main className="empty-cart-page">
        <ShoppingBag size={72} className="empty-cart-icon" />
        <h2>Tu carrito está vacío</h2>
        <p>Agrega productos para comenzar tu compra</p>
        <Link to="/productos" className="btn-primary btn-lg">
          Ver Productos
        </Link>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <div className="cart-page-header">
        <h1>Mi Carrito</h1>
        <button onClick={clearCart} className="clear-cart-btn">
          <Trash2 size={14} /> Vaciar carrito
        </button>
      </div>

      <div className="cart-page-grid">
        {/* Items */}
        <div className="cart-page-items">
          {items.map((item) => (
            <div key={`${item.product.id}-${item.color}-${item.talla}`} className="cart-page-item">
              <img
                src={item.product.imagen || "/placeholder.jpg"}
                alt={item.product.nombre}
                className="cart-page-item-img"
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.jpg"; }}
              />
              <div className="cart-page-item-details">
                <h3>{item.product.nombre}</h3>
                {item.color && <p className="item-talla">Color: {item.color}</p>}
                {item.talla && <p className="item-talla">Talla: {item.talla}</p>}
                <p className="item-unit-price">S/ {item.product.precio.toFixed(2)} c/u</p>
              </div>
              <div className="cart-page-item-controls">
                <div className="qty-row">
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
                </div>
                <p className="item-subtotal">S/ {(item.product.precio * item.quantity).toFixed(2)}</p>
                <button
                  onClick={() => removeItem(item.product.id, item.talla, item.color)}
                  className="remove-item-btn"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="cart-page-summary">
          <h2>Resumen del Pedido</h2>
          <div className="summary-rows">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>S/ {subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Envío</span>
              <span>{COSTO_ENVIO === 0 ? "Gratis" : `S/ ${Number(COSTO_ENVIO).toFixed(2)}`}</span>
            </div>
            <div className="summary-row summary-total">
              <span>Total</span>
              <span>S/ {total.toFixed(2)}</span>
            </div>
          </div>
          <Link to="/checkout" className="btn-primary btn-full">
            Proceder al Pago <ArrowRight size={16} />
          </Link>
          <Link to="/productos" className="btn-outline btn-full" style={{ marginTop: "0.75rem" }}>
            Seguir Comprando
          </Link>
        </div>
      </div>
    </main>
  );
}
