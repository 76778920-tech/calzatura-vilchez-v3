import { useLayoutEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, X } from "lucide-react";
import toast from "react-hot-toast";
import type { Product } from "@/types";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { useCart } from "@/domains/carrito/context/CartContext";
import { useFavorites } from "@/domains/clientes/context/FavoritesContext";
import { getProductColors } from "@/utils/colors";
import { getAvailableSizes } from "@/utils/stock";

type Props = Readonly<{
  product: Product;
  /** Total de productos en BD que comparten la misma familia (incluye este). Solo catalogo. */
  familyGroupSize?: number;
  onFavoriteChange?: (productId: string, isFavorite: boolean) => void;
}>;

const FALLBACK_PRODUCT_IMAGE = "/placeholder-product.svg";

export default function ProductCard({ product, familyGroupSize = 1, onFavoriteChange }: Props) {
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const { favoriteIds, toggle } = useFavorites();
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const sizePickerTitleId = useId();
  const openSizePickerButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeSizePickerButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstSizeButtonRef = useRef<HTMLButtonElement | null>(null);
  const colors = getProductColors(product);
  const availableSizes = getAvailableSizes(product);
  const images = (product.imagenes?.length ? product.imagenes : [product.imagen]).filter(Boolean);
  const primaryImage = images[0] ?? FALLBACK_PRODUCT_IMAGE;
  const secondaryImage = images[1] ?? null;
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [failedHoverImage, setFailedHoverImage] = useState<string | null>(null);
  const imageSrc = failedImage === primaryImage ? FALLBACK_PRODUCT_IMAGE : primaryImage;
  const hoverImageSrc = (() => {
    if (!secondaryImage) return null;
    if (failedHoverImage === secondaryImage) return imageSrc;
    return secondaryImage;
  })();
  const isLiked = Boolean(user) && favoriteIds.has(product.id);
  const productHref = `/producto/${product.id}`;

  useLayoutEffect(() => {
    if (!showSizePicker) return;
    firstSizeButtonRef.current?.focus();
  }, [showSizePicker]);

  const handleOpenSizePicker = (event: React.MouseEvent) => {
    event.stopPropagation();
    setShowSizePicker(true);
  };

  const handleSelectSize = (event: React.MouseEvent, size: string) => {
    event.stopPropagation();
    addItem(product, 1, size, product.color || undefined);
    toast.success(`${product.nombre} - talla ${size} agregado`);
    handleCloseSizePicker();
  };

  const handleCloseSizePicker = () => {
    setShowSizePicker(false);
    queueMicrotask(() => openSizePickerButtonRef.current?.focus());
  };

  const handleSizePickerKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      handleCloseSizePicker();
      return;
    }
    if (event.key !== "Tab") return;

    const focusables = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables.at(-1);
    if (!last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleLike = async (event: React.MouseEvent) => {
    event.stopPropagation();

    if (!user) {
      toast.error("Inicia sesion para guardar favoritos");
      navigate("/login?redirect=/favoritos");
      return;
    }

    if (favoriteBusy) return;

    setFavoriteBusy(true);
    try {
      await toggle(product.id);
      onFavoriteChange?.(product.id, !isLiked);
    } finally {
      setFavoriteBusy(false);
    }
  };

  return (
    <article className="product-card" style={{ position: "relative" }}>
      <Link to={productHref} className="product-card-image-link" aria-label={`Ver detalle de ${product.nombre}`}>
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
              alt=""
              className="product-card-img product-card-img-hover"
              onError={(event) => {
                const image = event.target as HTMLImageElement;
                image.onerror = null;
                setFailedHoverImage(secondaryImage);
              }}
            />
          )}
          {product.stock === 0 && <span className="product-badge-agotado">Agotado</span>}
          {product.descuento && product.stock > 0 && (
            <span className="product-badge-cyber">{product.descuento}% OFF</span>
          )}
          {product.destacado && !product.descuento && product.stock > 0 && (
            <span className="product-badge-nuevo">Destacado</span>
          )}
          {familyGroupSize > 1 && (
            <span className="product-badge-familia" title={`${familyGroupSize - 1} color(es) mas en catalogo`}>
              Mas colores
            </span>
          )}
        </div>
      </Link>

      <div className="product-card-body">
        <p className="product-card-category">{product.tipoCalzado || product.categoria}</p>
        <h3 className="product-card-name">
          <Link to={productHref} className="product-card-title-link">
            {product.nombre}
          </Link>
        </h3>
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
            <span className="add-to-cart-btn" aria-hidden="true" style={{ visibility: "hidden" }}>
              <ShoppingCart size={16} />
            </span>
          ) : (
            <span className="out-of-stock-label">Sin stock</span>
          )}
        </div>
        {availableSizes.length > 0 && (
          <div className="product-card-tallas">
            {availableSizes.slice(0, 5).map((size) => (
              <span key={size} className="talla-chip">{size}</span>
            ))}
            {availableSizes.length > 5 && <span className="talla-chip">+{availableSizes.length - 5}</span>}
          </div>
        )}
      </div>

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

      {product.stock > 0 && (
        <button
          ref={openSizePickerButtonRef}
          type="button"
          onClick={handleOpenSizePicker}
          className="add-to-cart-btn"
          aria-label="Seleccionar talla"
          style={{
            position: "absolute",
            right: "1rem",
            bottom: availableSizes.length > 0 ? "3.1rem" : "1rem",
            zIndex: 2,
          }}
        >
          <ShoppingCart size={16} />
        </button>
      )}

      {showSizePicker && (
        <dialog
          open
          className="product-size-picker"
          aria-modal="true"
          aria-labelledby={sizePickerTitleId}
          onKeyDown={handleSizePickerKeyDown}
          style={{ bottom: "auto", aspectRatio: "1 / 1" }}
        >
          <button
            ref={closeSizePickerButtonRef}
            type="button"
            className="product-size-picker-close"
            onClick={handleCloseSizePicker}
            aria-label="Cerrar selector de talla"
          >
            <X size={14} aria-hidden="true" />
          </button>
          <p id={sizePickerTitleId} className="product-size-picker-label">Selecciona tu talla</p>
          <div className="product-size-picker-grid">
            {availableSizes.map((size, index) => (
              <button
                key={size}
                ref={index === 0 ? firstSizeButtonRef : undefined}
                type="button"
                className="product-size-picker-chip"
                onClick={(event) => handleSelectSize(event, size)}
              >
                {size}
              </button>
            ))}
          </div>
        </dialog>
      )}
    </article>
  );
}
