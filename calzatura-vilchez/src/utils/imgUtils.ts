import type { SyntheticEvent } from "react";

type ProductImageSource = {
  imagen?: string | null;
  imagenes?: string[] | null;
};

/** URLs de galería: ignora huecos en `imagenes[]` y cae a `imagen` si hace falta. */
export function getProductGalleryImages(product: ProductImageSource): string[] {
  const fromArray = Array.isArray(product.imagenes)
    ? product.imagenes.map((value) => String(value ?? "").trim()).filter(Boolean)
    : [];
  if (fromArray.length > 0) return fromArray;
  const primary = String(product.imagen ?? "").trim();
  return primary ? [primary] : [];
}

export function getProductPrimaryImage(
  product: ProductImageSource,
  fallback = "/placeholder-product.svg",
): string {
  return getProductGalleryImages(product)[0] ?? fallback;
}

export function handleProductImageError(e: SyntheticEvent<HTMLImageElement>) {
  const image = e.target as HTMLImageElement;
  image.onerror = null;
  image.src = "/placeholder-product.svg";
}
