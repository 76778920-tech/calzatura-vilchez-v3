import { Link as LinkIcon, Upload, X } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";
import { IMAGE_SLOTS, type ProductForm } from "../adminProductsInternals";

const EDIT_GALLERY_SLOT_KEYS = Array.from({ length: IMAGE_SLOTS }, (_, i) => `edit-gallery-slot-${i}`);

type Props = Readonly<{
  currentImages: string[];
  form: ProductForm;
  compressing: boolean;
  setPreviewImage: (v: { src: string; title: string; subtitle?: string }) => void;
  fileInputRefs: RefObject<Array<HTMLInputElement | null>>;
  setFileInputRef: (index: number) => (element: HTMLInputElement | null) => void;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>, index: number) => void;
  updateImageUrl: (index: number, value: string) => void;
  validateImageUrl: (index: number, value: string) => void;
  clearImage: (index: number) => void;
}>;

export function AdminProductEditGallery({
  currentImages,
  form,
  compressing,
  setPreviewImage,
  fileInputRefs,
  setFileInputRef,
  handleFileChange,
  updateImageUrl,
  validateImageUrl,
  clearImage,
}: Props) {
  return (
    <div className="admin-image-grid">
      {currentImages.map((image, index) => (
        <div key={EDIT_GALLERY_SLOT_KEYS[index] ?? `edit-gallery-slot-${index}`} className="admin-image-slot">
          <button
            type="button"
            className="image-upload-area"
            onClick={() => {
              if (compressing) return;
              if (image) {
                setPreviewImage({
                  src: image,
                  title: `${form.nombre || "Producto"} - Imagen ${index + 1}`,
                  subtitle: "Galería",
                });
                return;
              }
              fileInputRefs.current[index]?.click();
            }}
            disabled={compressing}
          >
            {image ? (
              <img src={image} alt={`Vista previa ${index + 1}`} className="image-preview" />
            ) : (
              <div className="image-upload-placeholder">
                <Upload size={28} />
                <span>{compressing ? "Subiendo..." : `Imagen ${index + 1}`}</span>
                <small>JPG, PNG o WEBP</small>
              </div>
            )}
          </button>
          <input
            ref={setFileInputRef(index)}
            type="file"
            accept="image/*"
            onChange={(event) => handleFileChange(event, index)}
            style={{ display: "none" }}
          />
          <div className="input-wrapper">
            <LinkIcon size={14} className="input-icon" />
            <input
              type="text"
              inputMode="url"
              value={image.startsWith("data:") ? "" : image}
              onChange={(event) => updateImageUrl(index, event.target.value)}
              onBlur={(event) => validateImageUrl(index, event.target.value)}
              placeholder={`URL de imagen ${index + 1}`}
              className="form-input with-icon with-action"
            />
            {image && (
              <button
                type="button"
                className="input-action-btn"
                onClick={() => clearImage(index)}
                aria-label={`Quitar imagen ${index + 1}`}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
