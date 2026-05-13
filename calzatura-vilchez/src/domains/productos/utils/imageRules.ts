// Reglas de negocio para imágenes del catálogo.
// Estas restricciones se aplican solo en cliente; no hay guardrails de BD
// para dimensiones/ratio (el volumen de metadata haría inviable un trigger).
// Cualquier cambio de regla debe reflejarse también en imageRules.test.ts.

export const IMAGE_RULES = {
  minWidth: 600,
  minHeight: 600,
  minAspectRatio: 65 / 100,          // ~2:3 retrato — más vertical que esto se rechaza
  maxAspectRatio: 8 / 5,          // ~8:5 apaisado — más horizontal que esto se rechaza
  maxCompressedBytes: (3 / 2) * 1024 * 1024,  // 1.5 MB post-compresión
} as const;

export type ImageValidationError =
  | "IMAGE_TOO_SMALL"
  | "IMAGE_RATIO_TOO_WIDE"
  | "IMAGE_RATIO_TOO_TALL"
  | "IMAGE_COMPRESSED_TOO_LARGE";

export function imageValidationMessage(code: ImageValidationError): string {
  const { minWidth, minHeight } = IMAGE_RULES;
  switch (code) {
    case "IMAGE_TOO_SMALL":
      return `Imagen muy pequeña. Mínimo ${minWidth}×${minHeight} px para garantizar calidad en catálogo.`;
    case "IMAGE_RATIO_TOO_WIDE":
      return "Imagen demasiado panorámica. Usa una proporción entre 2:3 (retrato) y 8:5 (apaisado).";
    case "IMAGE_RATIO_TOO_TALL":
      return "Imagen demasiado vertical. Usa una proporción entre 2:3 (retrato) y 8:5 (apaisado).";
    case "IMAGE_COMPRESSED_TOO_LARGE":
      return "Imagen muy pesada tras comprimir (> 1.5 MB). Usa una imagen más simple o de menor resolución.";
  }
}

/** Pura y testeable: recibe dimensiones, devuelve el error o null. */
export function checkImageDimensions(width: number, height: number): ImageValidationError | null {
  if (width < IMAGE_RULES.minWidth || height < IMAGE_RULES.minHeight) return "IMAGE_TOO_SMALL";
  const ratio = width / height;
  if (ratio < IMAGE_RULES.minAspectRatio) return "IMAGE_RATIO_TOO_TALL";
  if (ratio > IMAGE_RULES.maxAspectRatio) return "IMAGE_RATIO_TOO_WIDE";
  return null;
}

/** Carga el archivo en un <img> para leer sus dimensiones reales y valida ratio/tamaño. */
export async function validateImageFile(file: File): Promise<ImageValidationError | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(checkImageDimensions(img.naturalWidth, img.naturalHeight));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null); // deja que el upload falle con su propio error
    };
    img.src = objectUrl;
  });
}

/**
 * Carga una URL remota en <img> y verifica dimensiones/ratio.
 * naturalWidth/naturalHeight son accesibles sin CORS (no necesitas getImageData).
 * Timeout de 6 s: si la URL tarda más o falla, se resuelve null (sin bloquear).
 */
export async function validateImageUrlDimensions(url: string): Promise<ImageValidationError | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 6000);
    const img = new Image();
    img.onload = () => {
      clearTimeout(timer);
      resolve(checkImageDimensions(img.naturalWidth, img.naturalHeight));
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null); // URL inaccesible → no bloqueamos
    };
    img.src = url;
  });
}
