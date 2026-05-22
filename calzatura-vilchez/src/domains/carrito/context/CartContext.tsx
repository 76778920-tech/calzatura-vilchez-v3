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
const CART_GUEST_SESSION_KEY = "calzatura_cart:guest";
const CART_AUTH_SESSION_KEY = "calzatura_cart:auth";
const ENVIO = 0;

function activeCartStorageKey(userUid?: string | null) {
  return userUid ? CART_AUTH_SESSION_KEY : CART_GUEST_SESSION_KEY;
}

function legacyCartStorageKey(userUid?: string | null) {
  return userUid ? `${CART_STORAGE_KEY}:${userUid}` : CART_STORAGE_KEY;
}

function readCartFromStorage(storage: Storage, key: string): CartItem[] {
  try {
    const stored = storage.getItem(key);
    return stored ? (JSON.parse(stored) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeSessionCart(key: string, items: CartItem[]) {
  try {
    if (items.length === 0) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Si el navegador bloquea storage, el estado en memoria sigue funcionando.
  }
}

function removeLegacyCartKeys(userUid?: string | null) {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
    if (userUid) {
      localStorage.removeItem(legacyCartStorageKey(userUid));
    }
  } catch {
    // ignorar
  }
}

export function CartProvider({ children }: CartProviderProps) {
  const { user } = useAuth();
  const userUid = user?.uid ?? null;
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const userUidRef = useRef<string | null>(null);
  const prevCartUidRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    userUidRef.current = userUid;
  }, [userUid]);

  useEffect(() => {
    queueMicrotask(() => {
      const prevUid = prevCartUidRef.current;
      prevCartUidRef.current = userUid;
      // Solo al cambiar entre dos cuentas distintas (no en login inicial null → uid).
      if (prevUid && userUid && prevUid !== userUid) {
        try {
          sessionStorage.removeItem(CART_AUTH_SESSION_KEY);
        } catch {
          // ignorar
        }
      }

      const sessionKey = activeCartStorageKey(userUid);
      const sessionItems = readCartFromStorage(sessionStorage, sessionKey);
      if (sessionItems.length > 0) {
        setItems(sessionItems);
        removeLegacyCartKeys(userUid);
        return;
      }

      if (!userUid) {
        const legacyGuestItems = readCartFromStorage(localStorage, legacyCartStorageKey());
        setItems(legacyGuestItems);
        if (legacyGuestItems.length > 0) {
          writeSessionCart(sessionKey, legacyGuestItems);
        }
        removeLegacyCartKeys();
        return;
      }

      const legacyUserItems = readCartFromStorage(localStorage, legacyCartStorageKey(userUid));
      const sessionGuestItems = readCartFromStorage(sessionStorage, CART_GUEST_SESSION_KEY);
      const legacyGuestItems = readCartFromStorage(localStorage, legacyCartStorageKey());
      const guestItems = sessionGuestItems.length > 0 ? sessionGuestItems : legacyGuestItems;
      const nextItems = legacyUserItems.length > 0 ? legacyUserItems : guestItems;
      setItems(nextItems);
      if (nextItems.length > 0) {
        writeSessionCart(sessionKey, nextItems);
      }
      try {
        sessionStorage.removeItem(CART_GUEST_SESSION_KEY);
      } catch {
        // ignorar
      }
      removeLegacyCartKeys(userUid);
    });
  }, [userUid]);

  const persistItems = useCallback((newItems: CartItem[]) => {
    const uid = userUidRef.current;
    writeSessionCart(activeCartStorageKey(uid), newItems);
    removeLegacyCartKeys(uid);
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
