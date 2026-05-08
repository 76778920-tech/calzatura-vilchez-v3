import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "@/domains/productos/components/ProductCard";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { useFavorites } from "@/domains/clientes/context/FavoritesContext";
import { fetchPublicProductsByIds } from "@/domains/productos/services/products";
import { useProductsRealtime } from "@/hooks/useProductsRealtime";
import type { Product } from "@/types";
import toast from "react-hot-toast";

export default function FavoritesPage() {
  const { userProfile, user } = useAuth();
  const { favoriteIds, loading: favLoading } = useFavorites();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const name = userProfile?.nombre?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "cliente";

  // Carga los datos completos de los productos favoritos desde Supabase
  const loadProducts = useCallback(async (ids: Set<string>, active: () => boolean, showLoader = true) => {
    if (showLoader) setProductsLoading(true);
    try {
      const fetched = await fetchPublicProductsByIds([...ids]);
      if (active()) setAllProducts(fetched);
    } catch (error) {
      console.error("Favorites load error", error);
      if (active()) {
        setAllProducts([]);
        toast.error("No se pudieron cargar tus favoritos");
      }
    } finally {
      if (active() && showLoader) setProductsLoading(false);
    }
  }, []);

  // Carga inicial y cuando cambia el conjunto de IDs favoritos
  useEffect(() => {
    if (favLoading) return;
    let active = true;
    queueMicrotask(() => {
      if (active) void loadProducts(favoriteIds, () => active);
    });
    return () => { active = false; };
  }, [favoriteIds, favLoading, loadProducts]);

  // Recarga datos del producto si cambia en Supabase (precio, stock, etc.)
  useProductsRealtime(() => {
    void loadProducts(favoriteIds, () => true, false);
  });

  // Filtra en tiempo real: si el contexto quitó un ID, desaparece de la lista al instante
  const products = allProducts.filter((p) => favoriteIds.has(p.id));
  const loading = favLoading || productsLoading;

  if (loading) {
    return (
      <main className="favorites-page favorites-page-list">
        <div className="success-spinner" />
      </main>
    );
  }

  return (
    <main className="favorites-page favorites-page-list">
      <section className="favorites-header">
        <span className="page-kicker">Favoritos</span>
        <h1>Tu selección personal, {name}</h1>
        <p>Estos son los calzados que marcaste con corazón. La lista es privada para tu cuenta.</p>
      </section>

      {products.length === 0 ? (
        <section className="favorites-card">
          <div className="favorites-icon">
            <Heart size={34} />
          </div>
          <h2>Aún no tienes favoritos</h2>
          <p>Cuando marques un calzado con el corazón, aparecerá aquí para que puedas volver rápido.</p>
          <Link to="/productos" className="btn-primary">
            Explorar productos
          </Link>
        </section>
      ) : (
        <section className="products-grid favorites-grid" aria-label="Productos favoritos">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}
        </section>
      )}
    </main>
  );
}
