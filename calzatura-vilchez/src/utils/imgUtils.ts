import type { SyntheticEvent } from "react";

export function handleProductImageError(e: SyntheticEvent<HTMLImageElement>) {
  const image = e.target as HTMLImageElement;
  image.onerror = null;
  image.src = "/placeholder-product.svg";
}
