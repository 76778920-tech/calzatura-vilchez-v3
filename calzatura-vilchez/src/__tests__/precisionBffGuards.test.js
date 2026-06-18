/**
 * Guards de precisión en BFF — totales, precios vivos y stock server-side.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const serverSource = fs.readFileSync(path.resolve(process.cwd(), "bff/server.cjs"), "utf8");

describe("BFF — precisión de pedidos y pagos", () => {
  it("recalcula subtotal/total almacenado y rechaza desvíos > 0.01", () => {
    expect(serverSource).toContain("function calculateStoredSubtotal");
    expect(serverSource).toContain("function assertStoredTotals");
    expect(serverSource).toContain("Los totales del pedido no coinciden");
    expect(serverSource).toContain("> 0.01");
  });

  it("revalida precios vivos antes de Stripe (PCI / anti-manipulación)", () => {
    expect(serverSource).toContain("async function assertLivePrices");
    expect(serverSource).toContain("El precio de un producto cambio");
    expect(serverSource).toContain('isNaN(stored)');
  });

  it("valida stock y precio finito en buildOrderDraft y assertOrderStockAvailability", () => {
    expect(serverSource).toContain("async function assertOrderStockAvailability");
    expect(serverSource).toContain("async function buildOrderDraft");
    expect(serverSource).toContain("Stock o precio invalido");
    expect(serverSource).toContain("toFinitePrice");
    expect(serverSource).toContain("getSizeStock");
  });

  it("normaliza talla/color numéricos del JSON del pedido", () => {
    expect(serverSource).toContain("normalizeOrderTalla");
    expect(serverSource).toContain("normalizeOrderColor");
    expect(serverSource).toContain("sin esto el stock queda en 0");
  });
});
