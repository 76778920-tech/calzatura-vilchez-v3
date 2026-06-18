import { describe, expect, it, vi, beforeEach } from "vitest";
import type { CartItem, Product } from "@/types";
import { resolveCheckoutItems } from "@/domains/carrito/pages/checkout/checkoutStock";

const fetchPublicProducts = vi.fn<() => Promise<Product[]>>();

vi.mock("@/domains/productos/services/products", () => ({
  fetchPublicProducts: () => fetchPublicProducts(),
}));

function product(partial: Partial<Product> & Pick<Product, "id" | "nombre">): Product {
  return {
    precio: 100,
    descripcion: "",
    imagen: "",
    stock: 10,
    categoria: "hombre",
    color: "Negro",
    tallas: ["40"],
    tallaStock: { "40": 5 },
    activo: true,
    ...partial,
  };
}

function cartItem(partial: Partial<CartItem> & { product: Product }): CartItem {
  return {
    quantity: 1,
    talla: "40",
    color: "Negro",
    ...partial,
  };
}

describe("resolveCheckoutItems — precisión stock/precio en checkout", () => {
  beforeEach(() => {
    fetchPublicProducts.mockReset();
  });

  it("reemplaza el producto del carrito por el precio/stock vivo del catálogo", async () => {
    const live = product({ id: "p1", nombre: "Zapato", precio: 149, tallaStock: { "40": 3 } });
    fetchPublicProducts.mockResolvedValue([live]);

    const items = await resolveCheckoutItems([
      cartItem({ product: product({ id: "p1", nombre: "Zapato", precio: 99, tallaStock: { "40": 3 } }) }),
    ]);

    expect(items[0].product.precio).toBe(149);
  });

  it("falla si la cantidad supera el stock de talla en catálogo vivo", async () => {
    const live = product({ id: "p1", nombre: "Zapato", tallaStock: { "40": 1 }, stock: 1 });
    fetchPublicProducts.mockResolvedValue([live]);

    await expect(
      resolveCheckoutItems([
        cartItem({ quantity: 2, product: product({ id: "p1", nombre: "Zapato" }) }),
      ]),
    ).rejects.toThrow(/no tiene stock disponible/i);
  });

  it("resuelve por nombre y color cuando el id del carrito no coincide", async () => {
    const live = product({
      id: "p-live",
      nombre: "Sandalia Dama",
      color: "Beige",
      tallaStock: { "38": 4 },
      stock: 4,
    });
    fetchPublicProducts.mockResolvedValue([live]);

    const items = await resolveCheckoutItems([
      cartItem({
        talla: "38",
        color: "Beige",
        product: product({ id: "stale-id", nombre: "Sandalia Dama", color: "Beige", tallaStock: { "38": 4 } }),
      }),
    ]);

    expect(items[0].product.id).toBe("p-live");
  });

  it("normaliza acentos al comparar color", async () => {
    const live = product({
      id: "p1",
      nombre: "Bota",
      color: "Marrón",
      tallaStock: { "40": 2 },
    });
    fetchPublicProducts.mockResolvedValue([live]);

    const items = await resolveCheckoutItems([
      cartItem({
        talla: "40",
        color: "Marron",
        product: product({ id: "p1", nombre: "Bota", color: "Marron", tallaStock: { "40": 2 } }),
      }),
    ]);

    expect(items[0].product.precio).toBe(live.precio);
  });
});
