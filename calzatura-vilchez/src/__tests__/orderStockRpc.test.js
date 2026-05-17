import { describe, expect, it, vi } from "vitest";

const {
  buildOrderStockRpcItems,
  discountOrderStockRpc,
  mapOrderStockRpcError,
} = require("../../functions/fnUtils");

describe("orderStockRpc", () => {
  it("buildOrderStockRpcItems normaliza líneas del pedido", () => {
    const items = buildOrderStockRpcItems({
      items: [
        {
          product: { id: "p1" },
          quantity: 2,
          talla: 38,
          color: " Negro ",
        },
      ],
    });
    expect(items).toEqual([
      { productId: "p1", talla: "38", color: "Negro", cantidad: 2 },
    ]);
  });

  it("discountOrderStockRpc invoca decrement_order_stock", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const supabase = { rpc };
    await discountOrderStockRpc(supabase, {
      items: [{ productId: "p1", quantity: 1, talla: "39" }],
    });
    expect(rpc).toHaveBeenCalledWith("decrement_order_stock", {
      p_items: [{ productId: "p1", talla: "39", color: null, cantidad: 1 }],
    });
  });

  it("mapOrderStockRpcError traduce insufficient_stock", () => {
    const err = mapOrderStockRpcError({ message: "insufficient_stock: p1" });
    expect(err.message).toMatch(/Stock insuficiente/i);
  });

  it("discountOrderStockRpc propaga error de stock insuficiente", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({
        error: { message: "insufficient_size_stock: product x" },
      }),
    };
    await expect(
      discountOrderStockRpc(supabase, {
        items: [{ productId: "p1", quantity: 1 }],
      }),
    ).rejects.toThrow(/Stock insuficiente/i);
  });
});
