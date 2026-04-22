import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Heart } from "lucide-react";
import type { Product } from "@/types";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { useCart } from "@/domains/carrito/context/CartContext";
import { getProductColors } from "@/utils/colors";
import { getAvailableSizes } from "@/utils/stock";
import { isProductFavorite, toggleFavoriteProduct } from "@/domains/clientes/services/favorites";
import toast from "react-hot-toast";

interface Props {
  product: Product;
  onFavoriteChange?: (productId: string, isFavorite: boolean) => void;
}

export default function ProductCard({ product, onFavoriteChange }: Props) {
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const colors = getProductColors(product);
  const firstColor = colors[0] ?? "";
  const availableSizes = getAvailableSizes(product, firstColor || undefined);
  const images = (product.imagenes?.length ? product.imagenes : [product.imagen]).filter(Boolean);
  const primaryImage = images[0] ?? "/placeholder.jpg";
  const hoverImage = images[1] ?? primaryImage;

  useEffect(() => {
    let active = true;

    if (!user) {
      const timer = window.setTimeout(() => {
        if (active) setLiked(false);
      }, 0);
      return () => {
        active = false;
        window.clearTimeout(timer);
      };
    }

    isProductFavorite(user.uid, product.id)
      .then((isFavorite) => {
        if (active) setLiked(isFavorite);
      })
      .catch(() => {
        if (active) setLiked(false);
      });

    return () => {
      active = false;
    };
  }, [product.id, user]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product, 1, availableSizes[0], firstColor || undefined);
    toast.success(`${product.nombre} agregado al carrito`);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Inicia sesión para guardar favoritos");
      navigate("/login?redirect=/favoritos");
      return;
    }

    if (favoriteBusy) return;

    const nextLiked = !liked;
    setFavoriteBusy(true);
    setLiked(nextLiked);

    try {
      await toggleFavoriteProduct(user.uid, product.id, nextLiked);
      onFavoriteChange?.(product.id, nextLiked);
      toast.success(nextLiked ? "Agregado a favoritos" : "Quitado de favoritos");
    } catch (error) {
      console.error("Favorite error", error);
      setLiked(!nextLiked);
      toast.error("No se pudo actualizar favoritos. Revisa las reglas de Firestore.");
    } finally {
      setFavoriteBusy(false);
    }
  };

  return (
    <Link to={`/producto/${product.id}`} className="product-card">
      <div className={`product-card-img-wrapper ${hoverImage !== primaryImage ? "has-hover-image" : ""}`}>
        <img
          src={primaryImage}
          alt={product.nombre}
          className="product-card-img product-card-img-primary"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.jpg"; }}
        />
        {hoverImage !== primaryImage && (
          <img
            src={hoverImage}
            alt={`${product.nombre} vista alternativa`}
            className="product-card-img product-card-img-hover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        {product.stock === 0 && (
          <span className="product-badge-agotado">Agotado</span>
        )}
        {product.destacado && product.stock > 0 && (
          <span className="product-badge-nuevo">Destacado</span>
        )}
        <button
          type="button"
          onClick={handleLike}
          disabled={favoriteBusy}
          className={`like-btn ${liked ? "liked" : ""}`}
          aria-label={liked ? "Quitar de favoritos" : "Agregar a favoritos"}
          aria-pressed={liked}
        >
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="product-card-body">
        <p className="product-card-category">{product.tipoCalzado || product.categoria}</p>
        <h3 className="product-card-name">{product.nombre}</h3>
        {product.marca && <p className="product-card-brand">{product.marca}</p>}
        {colors.length > 0 && (
          <div className="product-card-colors">
            {colors.slice(0, 3).map((color) => (
              <span key={color} className="color-chip">{color}</span>
            ))}
            {colors.length > 3 && <span className="color-chip">+{colors.length - 3}</span>}
          </div>
        )}
        <div className="product-card-footer">
          <span className="product-card-price">S/ {product.precio.toFixed(2)}</span>
          {product.stock > 0 ? (
            <button
              onClick={handleAddToCart}
              className="add-to-cart-btn"
              aria-label="Agregar al carrito"
            >
              <ShoppingCart size={16} />
            </button>
          ) : (
            <span className="out-of-stock-label">Sin stock</span>
          )}
        </div>
        {availableSizes.length > 0 && (
          <div className="product-card-tallas">
            {availableSizes.slice(0, 5).map((t) => (
              <span key={t} className="talla-chip">{t}</span>
            ))}
            {availableSizes.length > 5 && <span className="talla-chip">+{availableSizes.length - 5}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
