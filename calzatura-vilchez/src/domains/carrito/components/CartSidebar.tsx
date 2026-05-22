import { X, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/domains/carrito/context/CartContext";
import { CartSummaryRows, CartItemQtyControls } from "@/domains/carrito/components/cartShared";
import { handleProductImageError } from "@/utils/imgUtils";
import { getSizeStock } from "@/utils/stock";

export default function CartSidebar() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, subtotal, total, itemCount } = useCart();

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        className="cart-overlay"
        onClick={() => setIsOpen(false)}
        aria-label="Cerrar carrito"
      />
      <aside className="cart-sidebar" aria-label="Carrito de compras">
        <div className="cart-header">
          <div className="cart-header-title">
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
    </>
  );
}
