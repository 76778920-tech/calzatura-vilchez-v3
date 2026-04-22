import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "@/domains/productos/components/ProductCard";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { fetchFavoriteProductIds } from "@/domains/clientes/services/favorites";
import { fetchProductsByIds } from "@/domains/productos/services/products";
import type { Product } from "@/types";
import toast from "react-hot-toast";

export default function FavoritesPage() {
  const { userProfile, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const name = userProfile?.nombre?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "cliente";

  useEffect(() => {
    let active = true;

    if (!user) {
      const timer = window.setTimeout(() => {
        if (!active) return;
        setProducts([]);
        setLoading(false);
      }, 0);
      return () => {
        active = false;
        window.clearTimeout(timer);
      };
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      fetchFavoriteProductIds(user.uid)
        .then((ids) => fetchProductsByIds(ids))
        .then((favoriteProducts) => {
          if (active) setProducts(favoriteProducts);
        })
        .catch((error) => {
          console.error("Favorites load error", error);
          if (active) {
            setProducts([]);
            toast.error("No se pudieron cargar tus favoritos");
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [user]);

  const handleFavoriteChange = (productId: string, isFavorite: boolean) => {
    if (isFavorite) return;
    setProducts((current) => current.filter((product) => product.id !== productId));
  };

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
              onFavoriteChange={handleFavoriteChange}
            />
          ))}
        </section>
      )}
    </main>
  );
}
