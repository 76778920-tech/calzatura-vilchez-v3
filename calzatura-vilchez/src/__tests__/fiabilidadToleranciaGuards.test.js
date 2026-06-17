import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

describe("Fiabilidad — tolerancia a fallos (guards estáticos)", () => {
  it("AppErrorBoundary envuelve la aplicación en main.tsx", () => {
    const main = read("src/main.tsx");
    expect(main).toContain("AppErrorBoundary");
    expect(main).toContain("<AppErrorBoundary>");
    expect(fs.existsSync(path.join(root, "src/components/layout/AppErrorBoundary.tsx"))).toBe(true);
  });

  it("CheckoutPagoStep expone estado de error accesible", () => {
    const checkout = read("src/domains/carrito/pages/checkout/CheckoutPagoStep.tsx");
    expect(checkout).toContain("checkout-error-state");
    expect(checkout).toContain('role="alert"');
    expect(checkout).toContain("No se pudo confirmar el pedido");
  });

  it("Panel IA muestra banner ante datos insuficientes", () => {
    const dash = read("src/domains/administradores/predictions/AdminPredictionsDashboard.tsx");
    expect(dash).toContain("pred-warnings-banner");
    expect(dash).toContain("Datos insuficientes para predicciones fiables");
    expect(dash).toContain('role="alert"');
  });

  it("E2E TC-PRED-003 y TC-CHK-ERR-001 definidos", () => {
    const pred = read("e2e/admin-predictions.spec.ts");
    expect(pred).toContain("TC-PRED-003");
    expect(pred).toContain("Datos insuficientes para predicciones fiables");

    const chk = read("e2e/checkout-cod-order.spec.ts");
    expect(chk).toContain("TC-CHK-ERR-001");
    expect(chk).toContain("checkout-error-state");
  });
});
