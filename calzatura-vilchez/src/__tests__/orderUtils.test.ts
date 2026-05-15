import { describe, expect, it } from "vitest";
import type { CartItem } from "@/types";
import { ORDER_STATUS_LABELS, orderItemLineKey } from "@/domains/pedidos/utils/orderUtils";

describe("ORDER_STATUS_LABELS", () => {
  it("incluye estados de pedido esperados", () => {
    expect(ORDER_STATUS_LABELS.pendiente).toBe("Pendiente");
    expect(ORDER_STATUS_LABELS.pagado).toBe("Pagado");
    expect(ORDER_STATUS_LABELS.cancelado).toBe("Cancelado");
  });
});

describe("orderItemLineKey", () => {
  it("compone clave estable con producto, color, talla y cantidad", () => {
    const item = {
      product: { id: "p1" } as CartItem["product"],
      quantity: 2,
      color: "negro",
      talla: "40",
    };
    expect(orderItemLineKey(item, 0)).toBe("p1-negro-40-q2-i0");
  });

  it("usa unknown si falta producto", () => {
    const item = { quantity: 1, color: "", talla: "" } as CartItem;
    expect(orderItemLineKey(item, 3)).toBe("unknown---q1-i3");
  });
});
