import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { CartItem, Product } from "@/types";
import { getSizeStock } from "@/utils/stock";

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, talla?: string, color?: string) => void;
  removeItem: (productId: string, talla?: string, color?: string) => void;
  updateQuantity: (productId: string, quantity: number, talla?: string, color?: string) => void;
  clearCart: () => void;
  total: number;
  subtotal: number;
  itemCount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  total: 0,
  subtotal: 0,
  itemCount: 0,
  isOpen: false,
  setIsOpen: () => {},
});

const CART_STORAGE_KEY = "calzatura_cart";
const ENVIO = 0;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product, quantity = 1, talla?: string, color?: string) => {
    setItems((prev) => {
      const available = getSizeStock(product, talla, color);
      const existing = prev.find(
        (i) => i.product.id === product.id && i.talla === talla && i.color === color
      );
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id && i.talla === talla && i.color === color
            ? { ...i, quantity: Math.min(available, i.quantity + quantity) }
            : i
        );
      }
      return [...prev, { product, quantity: Math.min(available, quantity), talla, color }];
    });
    setIsOpen(true);
  };

  const removeItem = (productId: string, talla?: string, color?: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.product.id === productId && i.talla === talla && i.color === color))
    );
  };

  const updateQuantity = (productId: string, quantity: number, talla?: string, color?: string) => {
    if (quantity <= 0) {
      removeItem(productId, talla, color);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId && i.talla === talla && i.color === color
          ? { ...i, quantity: Math.min(getSizeStock(i.product, talla, color), quantity) }
          : i
      )
    );
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce(
    (acc, i) => acc + i.product.precio * i.quantity,
    0
  );
  const total = subtotal + (items.length > 0 ? ENVIO : 0);
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, total, subtotal, itemCount, isOpen, setIsOpen }}
    >
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  return useContext(CartContext);
}

export const COSTO_ENVIO = ENVIO;
