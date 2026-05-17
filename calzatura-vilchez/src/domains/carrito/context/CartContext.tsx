import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { CartItem, Product } from "@/types";
import { getSizeStock } from "@/utils/stock";
import { useAuth } from "@/domains/usuarios/context/AuthContext";

type CartContextType = Readonly<{
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
}>;

type CartProviderProps = Readonly<{
  children: ReactNode;
}>;

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

function cartStorageKey(userUid?: string | null) {
  if (userUid) {
    return `${CART_STORAGE_KEY}:${userUid}`;
  }
  return CART_STORAGE_KEY;
}

function readCartFromStorage(key: string): CartItem[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: CartProviderProps) {
  const { user } = useAuth();
  const userUid = user?.uid ?? null;
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const userUidRef = useRef<string | null>(null);

  useEffect(() => {
    userUidRef.current = userUid;
  }, [userUid]);

  useEffect(() => {
    queueMicrotask(() => {
      if (!userUid) {
        setItems(readCartFromStorage(cartStorageKey()));
        return;
      }

      const userKey = cartStorageKey(userUid);
      const userItems = readCartFromStorage(userKey);
      if (userItems.length > 0) {
        setItems(userItems);
        return;
      }

      const guestItems = readCartFromStorage(CART_STORAGE_KEY);
      setItems(guestItems);
      if (guestItems.length > 0) {
        localStorage.setItem(userKey, JSON.stringify(guestItems));
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    });
  }, [userUid]);

  const persistItems = useCallback((newItems: CartItem[]) => {
    const uid = userUidRef.current;
    localStorage.setItem(cartStorageKey(uid), JSON.stringify(newItems));
  }, []);

  const addItem = useCallback(
    (product: Product, quantity = 1, talla?: string, color?: string) => {
      setItems((prev) => {
        const available = getSizeStock(product, talla, color);
        const existing = prev.find(
          (i) => i.product.id === product.id && i.talla === talla && i.color === color
        );
        const newItems = existing
          ? prev.map((i) =>
              i.product.id === product.id && i.talla === talla && i.color === color
                ? { ...i, quantity: Math.min(available, i.quantity + quantity) }
                : i
            )
          : [...prev, { product, quantity: Math.min(available, quantity), talla, color }];
        persistItems(newItems);
        return newItems;
      });
      setIsOpen(true);
    },
    [persistItems]
  );

  const removeItem = useCallback(
    (productId: string, talla?: string, color?: string) => {
      setItems((prev) => {
        const newItems = prev.filter(
          (i) => !(i.product.id === productId && i.talla === talla && i.color === color)
        );
        persistItems(newItems);
        return newItems;
      });
    },
    [persistItems]
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number, talla?: string, color?: string) => {
      if (quantity <= 0) {
        removeItem(productId, talla, color);
        return;
      }
      setItems((prev) => {
        const newItems = prev.map((i) =>
          i.product.id === productId && i.talla === talla && i.color === color
            ? { ...i, quantity: Math.min(getSizeStock(i.product, talla, color), quantity) }
            : i
        );
        persistItems(newItems);
        return newItems;
      });
    },
    [persistItems, removeItem]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    persistItems([]);
  }, [persistItems]);

  const subtotal = items.reduce((acc, i) => acc + i.product.precio * i.quantity, 0);
  const total = subtotal + (items.length > 0 ? ENVIO : 0);
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      total,
      subtotal,
      itemCount,
      isOpen,
      setIsOpen,
    }),
    [
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      total,
      subtotal,
      itemCount,
      isOpen,
      setIsOpen,
    ]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  return useContext(CartContext);
}

export const COSTO_ENVIO = ENVIO;
