import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ShoppingCart,
  ArrowLeft,
  Plus,
  Minus,
  Package,
  Shield,
  Truck,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import { fetchProductById, fetchRelatedProductsInFamily } from "@/domains/productos/services/products";
import type { Product } from "@/types";
import { useCart } from "@/domains/carrito/context/CartContext";
import { getProductColors } from "@/utils/colors";
import { getAvailableSizes, getSizeStock } from "@/utils/stock";
import ImagePreviewModal from "@/domains/administradores/components/ImagePreviewModal";
import toast from "react-hot-toast";

const FALLBACK_PRODUCT_IMAGE = "/placeholder-product.svg";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [familySiblings, setFamilySiblings] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedTalla, setSelectedTalla] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchProductById(id)
      .then(async (p) => {
        setProduct(p);
        setSelectedImageIndex(0);
        setPreviewOpen(false);
        const colors = p ? getProductColors(p) : [];
        const firstColor = colors[0] ?? "";
        setSelectedColor(firstColor);
        const availableSizes = p ? getAvailableSizes(p) : [];
        if (availableSizes.length) setSelectedTalla(availableSizes[0]);
        if (p) {
          try {
            const related = await fetchRelatedProductsInFamily(p);
            const sorted = [...related].sort((a, b) =>
              (a.color ?? "").localeCompare(b.color ?? "", "es", { sensitivity: "base" })
            );
            setFamilySiblings(sorted);
          } catch {
            setFamilySiblings([]);
          }
        } else {
          setFamilySiblings([]);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const availableColors = product ? getProductColors(product) : [];
  const availableSizes = product ? getAvailableSizes(product) : [];
  const selectedSizeStock = product ? getSizeStock(product, selectedTalla || undefined) : 0;
  const productImages = useMemo(() => {
    if (!product) return [];
    const images = (product.imagenes?.length ? product.imagenes : [product.imagen]).filter(Boolean);
    return images.length ? images : [FALLBACK_PRODUCT_IMAGE];
  }, [product]);
  const activeImage = productImages[selectedImageIndex] ?? product?.imagen ?? FALLBACK_PRODUCT_IMAGE;

  useEffect(() => {
    if (previewOpen) return;
    if (productImages.length <= 1) return;
    const interval = window.setInterval(() => {
      setSelectedImageIndex((current) => (current + 1) % productImages.length);
    }, 4500);

    return () => window.clearInterval(interval);
  }, [previewOpen, productImages.length]);

  const moveImage = (direction: 1 | -1) => {
    if (productImages.length <= 1) return;
    setSelectedImageIndex((current) => (
      current + direction + productImages.length
    ) % productImages.length);
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (availableSizes.length && !selectedTalla) {
      toast.error("Selecciona una talla");
      return;
    }
    if (quantity > selectedSizeStock) {
      toast.error("No hay stock suficiente para esa talla");
      return;
    }
    addItem(product, quantity, selectedTalla || undefined, selectedColor || undefined);
    toast.success("Producto agregado al carrito");
  };

  if (loading) {
    return (
      <div className="detail-skeleton">
        <div className="skeleton-img" />
        <div className="skeleton-info">
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
          <div className="skeleton-line" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="empty-state" style={{ marginTop: "4rem" }}>
        <p>Producto no encontrado.</p>
        <Link to="/productos" className="btn-primary">Ver todos los productos</Link>
      </div>
    );
  }

  return (
    <main className="detail-page">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="detail-grid">
        {/* Imagen */}
        <div className="detail-gallery">
          <div className="detail-img-area">
            <button
              type="button"
              className="detail-expand-btn"
              onClick={() => setPreviewOpen(true)}
              aria-label="Ampliar imagen"
            >
              <Maximize2 size={18} />
            </button>
            {productImages.length > 1 && (
              <>
                <button
                  type="button"
                  className="detail-gallery-arrow detail-gallery-prev"
                  onClick={() => moveImage(-1)}
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  className="detail-gallery-arrow detail-gallery-next"
                  onClick={() => moveImage(1)}
                  aria-label="Imagen siguiente"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
            <div
              className="detail-gallery-track"
              style={{ transform: `translateX(-${selectedImageIndex * 100}%)` }}
            >
              {productImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  className="detail-gallery-slide"
                  onClick={() => setPreviewOpen(true)}
                  aria-label={`Ampliar imagen ${index + 1}`}
                >
                  <img
                    src={image}
                    alt={`${product.nombre} imagen ${index + 1}`}
                    className="detail-img"
                    onError={(event) => {
                      const currentImage = event.target as HTMLImageElement;
                      currentImage.onerror = null;
                      currentImage.src = FALLBACK_PRODUCT_IMAGE;
                    }}
                  />
                </button>
              ))}
            </div>
            {product.stock === 0 && <div className="detail-agotado-overlay">Agotado</div>}
          </div>

          {productImages.length > 0 && (
            <div className="detail-thumbnails" aria-label="Imágenes del producto">
              {productImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  className={`detail-thumbnail ${selectedImageIndex === index ? "active" : ""}`}
                  onClick={() => {
                    setSelectedImageIndex(index);
                  }}
                  aria-label={`Ver imagen ${index + 1}`}
                >
                  <img
                    src={image}
                    alt=""
                    onError={(event) => {
                      const currentImage = event.target as HTMLImageElement;
                      currentImage.onerror = null;
                      currentImage.src = FALLBACK_PRODUCT_IMAGE;
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="detail-info">
          <div className="detail-breadcrumb">
            <Link to="/productos" className="breadcrumb-link">Productos</Link>
            <span>/</span>
            <span>{product.categoria}</span>
            {product.tipoCalzado && (
              <>
                <span>/</span>
                <span>{product.tipoCalzado}</span>
              </>
            )}
          </div>

          {product.marca && <p className="detail-brand">{product.marca}</p>}
          <h1 className="detail-title">{product.nombre}</h1>
          {availableColors.length > 0 && (
            <div className="detail-colors">
              <p className="detail-section-label">Colores disponibles</p>
              <div className="color-chip-list">
                {availableColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setSelectedColor(color);
                      setSelectedTalla(product ? getAvailableSizes(product)[0] ?? "" : "");
                      setQuantity(1);
                    }}
                    className={`color-chip color-chip-btn ${selectedColor === color ? "active" : ""}`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {familySiblings.length > 0 && (
            <div className="detail-family" aria-label="Otros colores del mismo modelo">
              <p className="detail-section-label">También disponible en</p>
              <ul className="detail-family-list">
                {familySiblings.map((s) => {
                  const thumb = (s.imagenes?.length ? s.imagenes[0] : s.imagen) || FALLBACK_PRODUCT_IMAGE;
                  const label = s.color?.trim() || "Ver producto";
                  return (
                    <li key={s.id}>
                      <Link to={`/producto/${s.id}`} className="detail-family-card">
                        <span className="detail-family-thumb-wrap">
                          <img
                            src={thumb}
                            alt=""
                            className="detail-family-thumb"
                            onError={(event) => {
                              const el = event.target as HTMLImageElement;
                              el.onerror = null;
                              el.src = FALLBACK_PRODUCT_IMAGE;
                            }}
                          />
                        </span>
                        <span className="detail-family-label">{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <p className="detail-price">S/ {product.precio.toFixed(2)}</p>

          {product.stock > 0 ? (
            <span className="detail-stock-ok">
              <Package size={14} /> En stock ({product.stock} disponibles)
            </span>
          ) : (
            <span className="detail-stock-out">Sin stock</span>
          )}

          <p className="detail-desc">{product.descripcion}</p>

          {/* Tallas */}
          {availableSizes.length > 0 && (
            <div className="detail-tallas">
              <p className="detail-section-label">
                Talla: <strong>{selectedTalla}</strong>
                {selectedTalla && <span className="detail-size-stock"> {selectedSizeStock} disponibles</span>}
              </p>
              <div className="tallas-grid">
                {availableSizes.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setSelectedTalla(t);
                      setQuantity(1);
                    }}
                    className={`talla-btn ${selectedTalla === t ? "active" : ""}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cantidad */}
          {product.stock > 0 && (
            <div className="detail-quantity">
              <p className="detail-section-label">Cantidad:</p>
              <div className="qty-controls">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="qty-btn-lg"
                >
                  <Minus size={14} />
                </button>
                <span className="qty-display">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(selectedSizeStock, q + 1))}
                  className="qty-btn-lg"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          )}

          <div className="detail-actions">
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="btn-primary btn-lg detail-cart-btn"
            >
              <ShoppingCart size={18} />
              {product.stock > 0 ? "Agregar al Carrito" : "Agotado"}
            </button>
          </div>

          <div className="detail-guarantees">
            <div className="guarantee-item">
              <Truck size={16} />
              <span>Envío gratis a Huancayo en 24-48 hrs</span>
            </div>
            <div className="guarantee-item">
              <Shield size={16} />
              <span>Compra 100% segura</span>
            </div>
          </div>
        </div>
      </div>

      {previewOpen && (
        <ImagePreviewModal
          src={activeImage}
          images={productImages}
          selectedIndex={selectedImageIndex}
          title={product.nombre}
          subtitle="Vista ampliada"
          onNavigate={moveImage}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </main>
  );
}
