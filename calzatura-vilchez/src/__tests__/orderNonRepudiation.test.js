import { describe, it, expect, beforeAll } from "vitest";

const nr = await import("../../functions/orderNonRepudiation.cjs");

describe("No repudio PKCS#7 — pedidos", () => {
  beforeAll(() => {
    delete process.env.ORDER_NR_PRIVATE_KEY_PEM;
    delete process.env.ORDER_NR_CERT_PEM;
    process.env.NODE_ENV = "test";
  });

  it("firma y verifica un pedido de prueba (PKCS#7)", () => {
    const order = {
      id: "ord-test-001",
      userId: "uid-1",
      userEmail: "cliente@test.com",
      items: [{ productId: "p1", qty: 2, price: 120 }],
      subtotal: 240,
      envio: 10,
      total: 250,
      estado: "pendiente",
      metodoPago: "contraentrega",
      creadoEn: "2026-06-16T12:00:00.000Z",
      pagadoEn: null,
      stockDescontadoEn: null,
      stripeSessionId: null,
      idempotencyKey: "idem-abc",
    };
    const signed = nr.signOrderRecord(order);
    expect(signed.nrPkcs7Signature).toContain("BEGIN PKCS7");
    expect(signed.nrPayloadHash).toMatch(/^[a-f0-9]{64}$/);
    const verify = nr.verifyOrderRecord({ ...order, ...signed });
    expect(verify.valid).toBe(true);
    expect(verify.reason).toBe("OK");
  });

  it("detecta manipulación del total", () => {
    const order = {
      id: "ord-test-002",
      userId: "uid-2",
      userEmail: "x@test.com",
      items: [],
      subtotal: 100,
      envio: 0,
      total: 100,
      estado: "pagado",
      metodoPago: "stripe",
      creadoEn: "2026-06-16T12:00:00.000Z",
      pagadoEn: "2026-06-16T12:01:00.000Z",
      stockDescontadoEn: "2026-06-16T12:01:00.000Z",
      stripeSessionId: "cs_test",
      idempotencyKey: null,
    };
    const signed = nr.signOrderRecord(order);
    const tampered = { ...order, ...signed, total: 99 };
    const verify = nr.verifyOrderRecord(tampered);
    expect(verify.valid).toBe(false);
    expect(verify.reason).toBe("PAYLOAD_TAMPERED");
  });

  it("persistOrderNonRepudiation escribe columnas nr* (mock Supabase)", async () => {
    const updates = [];
    const supabase = {
      from() {
        return {
          update(patch) {
            return {
              eq(_col, id) {
                updates.push({ id, patch });
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      },
    };
    const order = {
      id: "ord-persist",
      userId: "u",
      userEmail: "e@t.com",
      items: [{ sku: "z" }],
      subtotal: 50,
      envio: 5,
      total: 55,
      estado: "pendiente",
      metodoPago: "contraentrega",
      creadoEn: "2026-06-16T12:00:00.000Z",
    };
    await nr.persistOrderNonRepudiation(supabase, order);
    expect(updates).toHaveLength(1);
    expect(updates[0].patch.nrPkcs7Signature).toContain("BEGIN PKCS7");
    expect(updates[0].patch.nrSignatureVersion).toBe("1");
  });
});
