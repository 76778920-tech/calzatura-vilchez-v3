import { describe, expect, it, vi } from "vitest";

const {
  buildOrderStockRpcItems,
  discountOrderStockRpc,
  restoreOrderStockRpc,
  shouldRestoreOrderStockOnCancel,
  applyOrderStatusStockSideEffects,
  mapOrderStockRpcError,
} = require("../fnUtils");

describe("orderStockRpc (functions)", () => {
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

  it("restoreOrderStockRpc invoca restore_order_stock", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    await restoreOrderStockRpc({ rpc }, {
      items: [{ productId: "p1", quantity: 2, talla: "38", color: "Negro" }],
    });
    expect(rpc).toHaveBeenCalledWith("restore_order_stock", {
      p_items: [{ productId: "p1", talla: "38", color: "Negro", cantidad: 2 }],
    });
  });

  it("shouldRestoreOrderStockOnCancel solo si descontó y no restauró", () => {
    expect(shouldRestoreOrderStockOnCancel({ stockDescontadoEn: "x" })).toBe(true);
    expect(shouldRestoreOrderStockOnCancel({ stockDescontadoEn: "x", stockRestauradoEn: "y" })).toBe(false);
    expect(shouldRestoreOrderStockOnCancel({})).toBe(false);
  });

  it("applyOrderStatusStockSideEffects restaura al cancelar", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const supabase = { rpc };
    const order = {
      stockDescontadoEn: "2026-01-01",
      items: [{ productId: "p1", quantity: 1 }],
    };
    const fx = await applyOrderStatusStockSideEffects(supabase, order, "ord-1", "cancelado");
    expect(rpc).toHaveBeenCalledWith("restore_order_stock", expect.any(Object));
    expect(fx.patch.stockRestauradoEn).toBeTruthy();
    expect(fx.audit.accion).toBe("restaurar_stock_pedido");
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
