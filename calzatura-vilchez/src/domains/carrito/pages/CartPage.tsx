import { Link } from "react-router-dom";
import { ShoppingBag, Trash2, ArrowRight, LogIn } from "lucide-react";
import { useCart } from "@/domains/carrito/context/CartContext";
import { CartSummaryRows, CartItemQtyControls } from "@/domains/carrito/components/cartShared";
import { handleProductImageError } from "@/utils/imgUtils";
import { getSizeStock } from "@/utils/stock";
import { useAuth } from "@/domains/usuarios/context/AuthContext";

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, total, clearCart } = useCart();
  const { user } = useAuth();

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
        <button type="button" onClick={clearCart} className="clear-cart-btn">
          <Trash2 size={14} aria-hidden="true" /> Vaciar carrito
        </button>
      </div>

      <div className="cart-page-grid">
        {/* Items */}
        <div className="cart-page-items">
          {items.map((item) => (
            <div key={`${item.product.id}-${item.color}-${item.talla}`} className="cart-page-item">
              <img
                src={item.product.imagen || "/placeholder-product.svg"}
                alt={item.product.nombre}
                className="cart-page-item-img"
                onError={handleProductImageError}
              />
              <div className="cart-page-item-details">
                <h3>{item.product.nombre}</h3>
                {item.color && <p className="item-talla">Color: {item.color}</p>}
                {item.talla && <p className="item-talla">Talla: {item.talla}</p>}
                <p className="item-unit-price">S/ {item.product.precio.toFixed(2)} c/u</p>
              </div>
              <div className="cart-page-item-controls">
                <div className="qty-row">
                  <CartItemQtyControls
                    productId={item.product.id}
                    quantity={item.quantity}
                    talla={item.talla}
                    color={item.color}
                    onUpdate={updateQuantity}
                    maxQuantity={getSizeStock(item.product, item.talla, item.color)}
                    productName={item.product.nombre}
                  />
                </div>
                <p className="item-subtotal">S/ {(item.product.precio * item.quantity).toFixed(2)}</p>
                <button
                  type="button"
                  onClick={() => removeItem(item.product.id, item.talla, item.color)}
                  className="remove-item-btn"
                  aria-label={`Quitar ${item.product.nombre} del carrito`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="cart-page-summary">
          <h2>Resumen de tu carrito</h2>
          <div className="summary-rows">
            <CartSummaryRows subtotal={subtotal} total={total} rowClass="summary-row" totalClass="summary-total" />
          </div>
          {user ? (
            <Link to="/checkout" className="btn-primary btn-full">
              Proceder al Pago <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <div className="cart-login-notice">
                <LogIn size={15} aria-hidden="true" />
                <span>Necesitas iniciar sesión para continuar con el pago</span>
              </div>
              <Link to="/login?redirect=/checkout" className="btn-primary btn-full">
                Iniciar Sesión para Pagar <ArrowRight size={16} />
              </Link>
            </>
          )}
          <Link to="/productos" className="btn-outline btn-full" style={{ marginTop: "0.75rem" }}>
            Seguir Comprando
          </Link>
        </div>
      </div>
    </main>
  );
}
