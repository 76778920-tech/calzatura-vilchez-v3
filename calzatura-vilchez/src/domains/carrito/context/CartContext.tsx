import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { CartItem, Product } from "@/types";
import { getSizeStock } from "@/utils/stock";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { db } from "@/firebase/config";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

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
  return import.meta.env.VITE_E2E === "true" && userUid
    ? `${CART_STORAGE_KEY}:${userUid}`
    : CART_STORAGE_KEY;
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

  // Firestore para usuarios autenticados, localStorage para invitados
  useEffect(() => {
    if (!userUid) {
      queueMicrotask(() => {
        try {
          const stored = localStorage.getItem(cartStorageKey());
          setItems(stored ? (JSON.parse(stored) as CartItem[]) : []);
        } catch {
          setItems([]);
        }
      });
      return;
    }

    if (import.meta.env.VITE_E2E === "true") {
      queueMicrotask(() => {
        try {
          const stored = localStorage.getItem(cartStorageKey(userUid));
          setItems(stored ? (JSON.parse(stored) as CartItem[]) : []);
        } catch {
          setItems([]);
        }
      });
      return;
    }

    const cartRef = doc(db, "carts", userUid);
    const unsubscribe = onSnapshot(
      cartRef,
      (snap) => {
        if (snap.exists()) {
          setItems((snap.data().items as CartItem[]) ?? []);
        } else {
          // Primera sesión: migrar carrito de invitado si existe
          const stored = localStorage.getItem(CART_STORAGE_KEY);
          const localItems: CartItem[] = stored ? (JSON.parse(stored) as CartItem[]) : [];
          setItems(localItems);
          if (localItems.length > 0) {
            void setDoc(cartRef, { items: localItems }).catch(console.error);
            localStorage.removeItem(CART_STORAGE_KEY);
          }
        }
      },
      (error) => console.error("[CartContext] Firestore error:", error)
    );

    return () => unsubscribe();
  }, [userUid]);

  const persistItems = useCallback((newItems: CartItem[]) => {
    if (userUidRef.current) {
      if (import.meta.env.VITE_E2E === "true") {
        localStorage.setItem(cartStorageKey(userUidRef.current), JSON.stringify(newItems));
        return;
      }
      void setDoc(doc(db, "carts", userUidRef.current), { items: newItems }).catch(
        (e) => console.error("[CartContext] persist error:", e)
      );
    } else {
      localStorage.setItem(cartStorageKey(), JSON.stringify(newItems));
    }
  }, []);

  const addItem = useCallback(
    (product: Product, quantity = 1, talla?: string, color?: string) => {
      setItems((prev) => {
        const available = getSizeStock(product, talla);
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
            ? { ...i, quantity: Math.min(getSizeStock(i.product, talla), quantity) }
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
