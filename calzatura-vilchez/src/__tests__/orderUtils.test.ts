import { describe, it, expect } from "vitest";
import { ORDER_STATUS_LABELS, orderItemLineKey } from "@/domains/pedidos/utils/orderUtils";
import type { CartItem } from "@/types";

describe("ORDER_STATUS_LABELS", () => {
  it.each(["pendiente", "pagado", "enviado", "entregado", "cancelado"])(
    "contiene etiqueta para '%s'",
    (estado) => expect(ORDER_STATUS_LABELS[estado]).toBeTruthy()
  );
});

describe("orderItemLineKey", () => {
  function makeItem(overrides: Partial<CartItem> = {}): CartItem {
    return {
      product: { id: "p1", nombre: "Test", precio: 100, stock: 10, imagen: "", categoria: "hombre" } as CartItem["product"],
      quantity: 2,
      color: "negro",
      talla: "42",
      ...overrides,
    } as CartItem;
  }

  it("genera clave con product.id, color, talla y quantity", () => {
    const key = orderItemLineKey(makeItem(), 0);
    expect(key).toBe("p1-negro-42-q2-i0");
  });

  it("usa 'unknown' cuando product.id es undefined", () => {
    const item = makeItem({ product: undefined as unknown as CartItem["product"] });
    const key = orderItemLineKey(item, 1);
    expect(key).toContain("unknown");
  });

  it("usa cadena vacía cuando color es undefined", () => {
    const key = orderItemLineKey(makeItem({ color: undefined }), 0);
    expect(key).toBe("p1--42-q2-i0");
  });

  it("usa cadena vacía cuando talla es undefined", () => {
    const key = orderItemLineKey(makeItem({ talla: undefined }), 0);
    expect(key).toBe("p1-negro--q2-i0");
  });

  it("incluye el lineIndex en la clave", () => {
    expect(orderItemLineKey(makeItem(), 5)).toContain("-i5");
  });
});
