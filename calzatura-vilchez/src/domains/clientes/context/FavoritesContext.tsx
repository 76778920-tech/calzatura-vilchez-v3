import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { fetchFavoriteProductIds, toggleFavoriteProduct } from "@/domains/clientes/services/favorites";
import { useAuth } from "@/domains/usuarios/context/AuthContext";

type FavoritesContextType = Readonly<{
  favoriteIds: Set<string>;
  toggle: (productId: string) => Promise<void>;
  loading: boolean;
}>;

type FavoritesProviderProps = Readonly<{
  children: ReactNode;
}>;

const FavoritesContext = createContext<FavoritesContextType>({
  favoriteIds: new Set(),
  toggle: async () => {},
  loading: true,
});

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const favoriteIdsRef = useRef(favoriteIds);
  useEffect(() => { favoriteIdsRef.current = favoriteIds; }, [favoriteIds]);

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => {
        setFavoriteIds(new Set());
        setLoading(false);
      });
      return;
    }

    let active = true;
    queueMicrotask(() => setLoading(true));

    fetchFavoriteProductIds(user.uid)
      .then((ids) => {
        if (!active) return;
        setFavoriteIds(new Set(ids));
        setLoading(false);
      })
      .catch((error) => {
        console.error("[FavoritesContext] favorites error:", error);
        if (active) {
          setLoading(false);
          toast.error("Error al cargar favoritos. Intenta recargar la página.");
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  const toggle = useCallback(async (productId: string) => {
    if (!user) return;

    const isCurrentlyFavorite = favoriteIdsRef.current.has(productId);
    const nextValue = !isCurrentlyFavorite;

    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (nextValue) { next.add(productId); } else { next.delete(productId); }
      return next;
    });

    try {
      await toggleFavoriteProduct(user.uid, productId, nextValue);
      toast.success(nextValue ? "Agregado a favoritos" : "Quitado de favoritos");
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyFavorite) { next.add(productId); } else { next.delete(productId); }
        return next;
      });
      toast.error("No se pudo actualizar favoritos. Inténtalo de nuevo.");
    }
  }, [user]);

  const value = useMemo(
    () => ({ favoriteIds, toggle, loading }),
    [favoriteIds, toggle, loading],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFavorites() {
  return useContext(FavoritesContext);
}
