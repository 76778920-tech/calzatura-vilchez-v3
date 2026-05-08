import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "@/firebase/config";
import { toggleFavoriteProduct } from "@/domains/clientes/services/favorites";
import { useAuth } from "@/domains/usuarios/context/AuthContext";

interface FavoritesContextType {
  favoriteIds: Set<string>;
  toggle: (productId: string) => Promise<void>;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType>({
  favoriteIds: new Set(),
  toggle: async () => {},
  loading: true,
});

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Ref para leer el estado más reciente dentro del callback toggle
  // sin que toggle deba recrearse cada vez que favoriteIds cambia.
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

    queueMicrotask(() => setLoading(true));
    const col = collection(db, "usuarios", user.uid, "favoritos");

    const unsubscribe = onSnapshot(
      col,
      { includeMetadataChanges: false },
      (snapshot) => {
        setFavoriteIds(new Set(snapshot.docs.map((doc) => doc.id)));
        setLoading(false);
      },
      (error) => {
        console.error("[FavoritesContext] Firestore error:", error);
        setLoading(false);
        if ((error as { code?: string }).code !== "permission-denied") {
          toast.error("Error al cargar favoritos. Intenta recargar la página.");
        }
      },
    );

    return unsubscribe;
  }, [user]);

  const toggle = useCallback(async (productId: string) => {
    if (!user) return;

    const isCurrentlyFavorite = favoriteIdsRef.current.has(productId);
    const nextValue = !isCurrentlyFavorite;

    // Actualización optimista inmediata
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (nextValue) { next.add(productId); } else { next.delete(productId); }
      return next;
    });

    try {
      await toggleFavoriteProduct(user.uid, productId, nextValue);
      toast.success(nextValue ? "Agregado a favoritos" : "Quitado de favoritos");
    } catch {
      // Revertir si falla Firestore
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyFavorite) { next.add(productId); } else { next.delete(productId); }
        return next;
      });
      toast.error("No se pudo actualizar favoritos. Inténtalo de nuevo.");
    }
  }, [user]);

  return (
    <FavoritesContext.Provider value={{ favoriteIds, toggle, loading }}>
      {children}
    </FavoritesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFavorites() {
  return useContext(FavoritesContext);
}
