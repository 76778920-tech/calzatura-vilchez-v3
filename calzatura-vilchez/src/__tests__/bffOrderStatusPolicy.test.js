import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  ORDER_STATUS_TRANSITIONS,
  assertOrderStatusTransition,
} = require("../../functions/orderStatusPolicy.js");

const serverSource = fs.readFileSync(path.resolve(process.cwd(), "bff/server.cjs"), "utf8");
const functionsSource = fs.readFileSync(path.resolve(process.cwd(), "functions/index.js"), "utf8");

describe("BFF/Functions order status transition policy", () => {
  it("define una maquina de estados explicita para pedidos", () => {
    expect([...ORDER_STATUS_TRANSITIONS.pendiente]).toEqual(["pagado", "cancelado"]);
    expect([...ORDER_STATUS_TRANSITIONS.pagado]).toEqual(["enviado", "cancelado"]);
    expect([...ORDER_STATUS_TRANSITIONS.enviado]).toEqual(["entregado"]);
    expect([...ORDER_STATUS_TRANSITIONS.entregado]).toEqual([]);
    expect([...ORDER_STATUS_TRANSITIONS.cancelado]).toEqual([]);
  });

  it("lanza 409 real para saltos, retrocesos y estados terminales", () => {
    const blocked = [
      ["cancelado", "pagado"],
      ["enviado", "pagado"],
      ["entregado", "cancelado"],
      ["pagado", "pendiente"],
      ["pendiente", "entregado"],
    ];

    for (const [from, to] of blocked) {
      expect(() => assertOrderStatusTransition({ estado: from }, to)).toThrow(/Transicion de estado no permitida/);
      try {
        assertOrderStatusTransition({ estado: from }, to);
      } catch (error) {
        expect(error.status).toBe(409);
      }
    }
  });

  it("permite transiciones esperadas y trata repetir estado como no-op", () => {
    expect(assertOrderStatusTransition({ estado: "pendiente" }, "pagado")).toBe("pendiente");
    expect(assertOrderStatusTransition({ estado: "pagado" }, "enviado")).toBe("pagado");
    expect(assertOrderStatusTransition({ estado: "enviado" }, "entregado")).toBe("enviado");
    expect(assertOrderStatusTransition({ estado: "cancelado" }, "cancelado")).toBe("cancelado");
  });

  it("BFF valida transicion antes de stock/auditoria y webhook Stripe", () => {
    const routeStart = serverSource.indexOf('app.post("/updateOrderStatus"');
    const transitionCheck = serverSource.indexOf("assertOrderStatusTransition(order, estado)", routeStart);
    const stockSideEffects = serverSource.indexOf("applyOrderStatusStockSideEffects", routeStart);
    const auditWrite = serverSource.indexOf("logAuditFn", routeStart);
    const webhookStart = serverSource.indexOf('app.post("/stripeWebhook"');
    const webhookTransition = serverSource.indexOf('assertOrderStatusTransition(order, "pagado")', webhookStart);
    const webhookUpdate = serverSource.indexOf('estado: "pagado"', webhookStart);

    expect(routeStart).toBeGreaterThan(-1);
    expect(transitionCheck).toBeGreaterThan(routeStart);
    expect(stockSideEffects).toBeGreaterThan(transitionCheck);
    expect(auditWrite).toBeGreaterThan(transitionCheck);
    expect(webhookTransition).toBeGreaterThan(webhookStart);
    expect(webhookUpdate).toBeGreaterThan(webhookTransition);
  });

  it("Cloud Functions legacy usa la misma politica que el BFF", () => {
    expect(serverSource).toContain('require("../functions/orderStatusPolicy")');
    expect(functionsSource).toContain('require("./orderStatusPolicy")');
    expect(functionsSource).toContain("assertOrderStatusTransition(order, estado)");
    expect(functionsSource).toContain('assertOrderStatusTransition(order, "pagado")');
  });

  it("auditoria de cambio de estado guarda from/to/source", () => {
    expect(serverSource).toContain('{ from: currentEstado, to: estado, source: "updateOrderStatus" }');
    expect(serverSource).toContain('from: fromEstado');
    expect(serverSource).toContain('to: "pagado"');
    expect(functionsSource).toContain('{ from: currentEstado, to: estado, source: "updateOrderStatus" }');
    expect(functionsSource).toContain('from: fromEstado');
    expect(functionsSource).toContain('to: "pagado"');
  });
});
