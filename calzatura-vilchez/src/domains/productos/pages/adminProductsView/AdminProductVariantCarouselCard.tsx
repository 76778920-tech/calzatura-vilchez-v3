import { Link as LinkIcon, Upload, X } from "lucide-react";
import type { ChangeEvent } from "react";
import { getColorHex, normalizeImageSlots, type VariantSlot } from "../adminProductsInternals";

type Props = Readonly<{
  slot: VariantSlot;
  slotIndex: number;
  compressing: boolean;
  handleVariantFileChange: (event: ChangeEvent<HTMLInputElement>, slotIndex: number, imageIndex: number) => void;
  updateVariantSlotImageUrl: (slotIndex: number, imageIndex: number, value: string) => void;
  validateVariantSlotImageUrl: (slotIndex: number, imageIndex: number, value: string) => void;
  updateVariantSlot: (slotIndex: number, updater: (slot: VariantSlot) => VariantSlot) => void;
  setSlotColor: (slotIndex: number, color: string) => void;
}>;

export function AdminProductVariantCarouselCard({
  slot,
  slotIndex,
  compressing,
  handleVariantFileChange,
  updateVariantSlotImageUrl,
  validateVariantSlotImageUrl,
  updateVariantSlot,
  setSlotColor,
}: Props) {
  const slotImages = normalizeImageSlots(slot.imagenes);
  const colorHex = getColorHex(slot.color);

  return (
    <div className="admin-variant-carousel-card">
      <div className="admin-variant-block-header">
        <span className="admin-variant-block-label">
          <span className="admin-variant-color-dot" style={{ background: colorHex }} />
          {slot.color}
        </span>
        <button
          type="button"
          className="admin-variant-block-clear"
          onClick={() => setSlotColor(slotIndex, "")}
          aria-label={`Quitar Color ${slotIndex + 1}`}
        >
          <X size={13} />
        </button>
      </div>
      <div className="admin-image-grid">
        {slotImages.map((image, imageIndex) => (
          <div key={`variant-${slot.color}-${slotIndex}-img-${imageIndex}`} className="admin-image-slot">
            <button
              type="button"
              className="image-upload-area"
              onClick={() => {
                if (compressing) return;
                const input = document.getElementById(`variant-upload-${slotIndex}-${imageIndex}`) as HTMLInputElement | null;
                input?.click();
              }}
              disabled={compressing}
            >
              {image ? (
                <img src={image} alt={`Color ${slotIndex + 1} imagen ${imageIndex + 1}`} className="image-preview" />
              ) : (
                <div className="image-upload-placeholder">
                  <Upload size={22} />
                  <span>{compressing ? "Subiendo..." : `Imagen ${imageIndex + 1}`}</span>
                  <small>JPG · PNG · WEBP</small>
                </div>
              )}
            </button>
            <input
              id={`variant-upload-${slotIndex}-${imageIndex}`}
              type="file"
              accept="image/*"
              onChange={(event) => handleVariantFileChange(event, slotIndex, imageIndex)}
              style={{ display: "none" }}
            />
            <div className="input-wrapper">
              <LinkIcon size={14} className="input-icon" />
              <input
                type="text"
                inputMode="url"
                value={image.startsWith("data:") ? "" : image}
                onChange={(event) => updateVariantSlotImageUrl(slotIndex, imageIndex, event.target.value)}
                onBlur={(event) => validateVariantSlotImageUrl(slotIndex, imageIndex, event.target.value)}
                placeholder={`URL imagen ${imageIndex + 1}`}
                className="form-input with-icon"
              />
            </div>
          </div>
        ))}
      </div>
      <details className="admin-variant-details">
        <summary>Texto y visibilidad ({slot.color})</summary>
        <div className="admin-variant-details-body">
          <label className="checkbox-label admin-variant-details-check" htmlFor={`variant-activo-${slotIndex}`}>
            <input
              id={`variant-activo-${slotIndex}`}
              type="checkbox"
              checked={slot.activo}
              onChange={(event) => updateVariantSlot(slotIndex, (s) => ({ ...s, activo: event.target.checked }))}
            />{" "}
            Visible en tienda (solo este color)
          </label>
          <label className="admin-variant-details-label" htmlFor={`variant-desc-${slotIndex}`}>
            Descripción del color
          </label>
          <textarea
            id={`variant-desc-${slotIndex}`}
            value={slot.descripcion}
            onChange={(event) => updateVariantSlot(slotIndex, (s) => ({ ...s, descripcion: event.target.value }))}
            rows={2}
            className="form-input admin-variant-details-textarea"
            placeholder="Tonos, material visible en este color, combinaciones…"
          />
          <p className="admin-variant-details-hint">
            Si lo dejas vacío, se usará la descripción común del final del formulario.
          </p>
        </div>
      </details>
    </div>
  );
}
