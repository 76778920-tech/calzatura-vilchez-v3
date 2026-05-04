import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Heart, X } from "lucide-react";
import type { Product } from "@/types";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { useCart } from "@/domains/carrito/context/CartContext";
import { getProductColors } from "@/utils/colors";
import { getAvailableSizes } from "@/utils/stock";
import { isProductFavorite, toggleFavoriteProduct } from "@/domains/clientes/services/favorites";
import toast from "react-hot-toast";

interface Props {
  product: Product;
  /** Total de productos en BD que comparten la misma familia (incluye este). Solo catálogo. */
  familyGroupSize?: number;
  onFavoriteChange?: (productId: string, isFavorite: boolean) => void;
}

const FALLBACK_PRODUCT_IMAGE = "/placeholder-product.svg";

export default function ProductCard({ product, familyGroupSize = 1, onFavoriteChange }: Props) {
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const colors = getProductColors(product);
  const availableSizes = getAvailableSizes(product);
  const images = (product.imagenes?.length ? product.imagenes : [product.imagen]).filter(Boolean);
  const primaryImage = images[0] ?? FALLBACK_PRODUCT_IMAGE;
  const secondaryImage = images[1] ?? null;
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [failedHoverImage, setFailedHoverImage] = useState<string | null>(null);
  const imageSrc = failedImage === primaryImage ? FALLBACK_PRODUCT_IMAGE : primaryImage;
  const hoverImageSrc = secondaryImage
    ? failedHoverImage === secondaryImage
      ? imageSrc
      : secondaryImage
    : null;
  const isLiked = Boolean(user) && liked;

  useEffect(() => {
    let active = true;

    if (!user) return () => {
      active = false;
    };

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

  const handleOpenSizePicker = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSizePicker(true);
  };

  const handleSelectSize = (e: React.MouseEvent, size: string) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1, size, product.color || undefined);
    toast.success(`${product.nombre} — talla ${size} agregado`);
    setShowSizePicker(false);
  };

  const handleCloseSizePicker = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSizePicker(false);
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

    const nextLiked = !isLiked;
    setFavoriteBusy(true);
    setLiked(nextLiked);

    try {
      await toggleFavoriteProduct(user.uid, product.id, nextLiked);
      onFavoriteChange?.(product.id, nextLiked);
      toast.success(nextLiked ? "Agregado a favoritos" : "Quitado de favoritos");
    } catch (error) {
      console.error("Favorite error", error);
      setLiked(!nextLiked);
      toast.error("No se pudo actualizar favoritos. Inténtalo de nuevo.");
    } finally {
      setFavoriteBusy(false);
    }
  };

  return (
    <Link to={`/producto/${product.id}`} className="product-card">
      <div className="product-card-img-wrapper">
        <img
          src={imageSrc}
          alt={product.nombre}
          className="product-card-img product-card-img-primary"
          onError={(event) => {
            const image = event.target as HTMLImageElement;
            image.onerror = null;
            setFailedImage(primaryImage);
          }}
        />
        {hoverImageSrc && (
          <img
            src={hoverImageSrc}
            alt={product.nombre}
            className="product-card-img product-card-img-hover"
            onError={(event) => {
              const image = event.target as HTMLImageElement;
              image.onerror = null;
              setFailedHoverImage(secondaryImage);
            }}
          />
        )}
        {product.stock === 0 && (
          <span className="product-badge-agotado">Agotado</span>
        )}
        {product.descuento && product.stock > 0 && (
          <span className="product-badge-cyber">{product.descuento}% OFF</span>
        )}
        {product.destacado && !product.descuento && product.stock > 0 && (
          <span className="product-badge-nuevo">Destacado</span>
        )}
        {familyGroupSize > 1 && (
          <span className="product-badge-familia" title={`${familyGroupSize - 1} color(es) más en catálogo`}>
            Más colores
          </span>
        )}
        <button
          type="button"
          onClick={handleLike}
          disabled={favoriteBusy}
          className={`like-btn ${isLiked ? "liked" : ""}`}
          aria-label={isLiked ? "Quitar de favoritos" : "Agregar a favoritos"}
          aria-pressed={isLiked}
        >
          <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
        </button>

        {showSizePicker && (
          <div className="product-size-picker" onClick={handleCloseSizePicker}>
            <button
              type="button"
              className="product-size-picker-close"
              onClick={handleCloseSizePicker}
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
            <p className="product-size-picker-label">Selecciona tu talla</p>
            <div className="product-size-picker-grid">
              {availableSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className="product-size-picker-chip"
                  onClick={(e) => handleSelectSize(e, size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
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
          {product.descuento ? (
            <div className="product-card-price-group">
              <span className="product-card-price-original">S/ {product.precio.toFixed(2)}</span>
              <span className="product-card-price product-card-price-cyber">
                S/ {(product.precio * (1 - product.descuento / 100)).toFixed(2)}
              </span>
            </div>
          ) : (
            <span className="product-card-price">S/ {product.precio.toFixed(2)}</span>
          )}
          {product.stock > 0 ? (
            <button
              onClick={handleOpenSizePicker}
              className="add-to-cart-btn"
              aria-label="Seleccionar talla"
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
