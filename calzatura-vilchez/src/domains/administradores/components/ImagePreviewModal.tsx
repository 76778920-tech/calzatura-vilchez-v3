import { ChevronLeft, ChevronRight, X } from "lucide-react";

const FALLBACK_PRODUCT_IMAGE = "/placeholder-product.svg";

interface ImagePreviewModalProps {
  src: string;
  images?: string[];
  selectedIndex?: number;
  title: string;
  subtitle?: string;
  onNavigate?: (direction: 1 | -1) => void;
  onClose: () => void;
}

export default function ImagePreviewModal({
  src,
  images,
  selectedIndex = 0,
  title,
  subtitle,
  onNavigate,
  onClose,
}: ImagePreviewModalProps) {
  const galleryImages = images?.length ? images : [src];
  const activeIndex = Math.min(Math.max(selectedIndex, 0), galleryImages.length - 1);

  return (
    <div className="modal-overlay image-preview-overlay" onClick={onClose}>
      <div className="document-preview-modal" onClick={(event) => event.stopPropagation()}>
        <div className="document-preview-header">
          <div>
            {subtitle && <span>{subtitle}</span>}
            <strong>{title}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar imagen">
            <X size={20} />
          </button>
        </div>
        <div className="document-preview-stage">
          {galleryImages.length > 1 && onNavigate && (
            <>
              <button
                type="button"
                className="document-preview-arrow document-preview-prev"
                onClick={() => onNavigate(-1)}
                aria-label="Imagen anterior"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                className="document-preview-arrow document-preview-next"
                onClick={() => onNavigate(1)}
                aria-label="Imagen siguiente"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
          <div
            className="document-preview-track"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {galleryImages.map((image, index) => (
              <div className="document-preview-slide" key={`${image}-${index}`}>
                <img
                  src={image}
                  alt={`${title} ${index + 1}`}
                  onError={(event) => {
                    const currentImage = event.target as HTMLImageElement;
                    currentImage.onerror = null;
                    currentImage.src = FALLBACK_PRODUCT_IMAGE;
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
