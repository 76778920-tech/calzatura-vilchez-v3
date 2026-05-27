import { fetchPublicProducts } from "@/domains/productos/services/products";
import { getSizeStock } from "@/utils/stock";
import type { CartItem, Product } from "@/types";

function comparable(value?: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function sameText(a?: string, b?: string) {
  return comparable(a) === comparable(b);
}

function findLiveProductForCartItem(products: Product[], item: CartItem) {
  const requestedColor = item.color || item.product.color || "";
  const requestedName = item.product.nombre || "";
  const requestedSize = item.talla || "";
  const requestedQty = Number(item.quantity || 0);

  const byId = products.find((product) => product.id === item.product.id);
  if (
    byId &&
    (!requestedColor || sameText(byId.color, requestedColor)) &&
    getSizeStock(byId, requestedSize || undefined, requestedColor || byId.color || undefined) >= requestedQty
  ) {
    return byId;
  }

  return products.find((product) => {
    if (!sameText(product.nombre, requestedName)) return false;
    if (requestedColor && !sameText(product.color, requestedColor)) return false;
    return getSizeStock(product, requestedSize || undefined, requestedColor || product.color || undefined) >= requestedQty;
  });
}

export async function resolveCheckoutItems(items: CartItem[]) {
  const liveProducts = await fetchPublicProducts();
  return items.map((item) => {
    const liveProduct = findLiveProductForCartItem(liveProducts, item);
    if (!liveProduct) {
      throw new Error(
        `${item.product.nombre} (${item.color || item.product.color || "sin color"} talla ${item.talla || "-"}) no tiene stock disponible`,
      );
    }
    return {
      ...item,
      product: liveProduct,
      color: item.color || liveProduct.color,
    };
  });
}
