import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../..");
const server = fs.readFileSync(path.join(ROOT, "bff/server.cjs"), "utf8");
const nrMod = fs.readFileSync(path.join(ROOT, "functions/orderNonRepudiation.cjs"), "utf8");
const migration = path.join(
  ROOT,
  "supabase/migrations/20260616120000_pedidos_pkcs7_non_repudiation.sql",
);

describe("Guard — no repudio PKCS#7 en pedidos", () => {
  it("módulo orderNonRepudiation exporta firma PKCS#7", () => {
    expect(nrMod).toContain("forge.pkcs7.createSignedData");
    expect(nrMod).toContain("persistOrderNonRepudiation");
    expect(nrMod).toContain("verifyOrderRecord");
  });

  it("BFF firma pedido en createOrder y webhook Stripe", () => {
    expect(server).toContain("refreshOrderNonRepudiation");
    expect(server).toContain("verifyOrderNonRepudiation");
    expect(server).toContain('require("./orderNonRepudiation.cjs")');
  });

  it("migración Supabase con columnas nr*", () => {
    expect(fs.existsSync(migration)).toBe(true);
    const sql = fs.readFileSync(migration, "utf8");
    expect(sql).toContain("nrPkcs7Signature");
    expect(sql).toContain("nrPayloadHash");
  });
});
