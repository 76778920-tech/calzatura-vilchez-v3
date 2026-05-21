import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const indexSource = fs.readFileSync(path.join(dirname, "..", "index.js"), "utf8");

describe("Cloud Functions legacy Stripe guards", () => {
  it("bloquea marcar pedidos Stripe como pagados manualmente", () => {
    expect(indexSource).toContain('order.metodoPago === "stripe" && estado === "pagado"');
    expect(indexSource).toContain("Los pedidos Stripe solo se marcan como pagados desde el webhook de pago.");
  });

  it("el webhook Stripe marca stockDescontadoEn y falla para reintento si no puede descontar", () => {
    expect(indexSource).toContain("Stripe webhook stock discount error");
    expect(indexSource).toContain("Stripe reintentara el webhook.");
    expect(indexSource).toContain("stockDescontadoEn = new Date().toISOString()");
    expect(indexSource).toContain("stockDescontadoEn,");
  });
});
