import { describe, expect, it } from "vitest";
import { toastFromSalesError } from "@/domains/ventas/pages/adminSalesRegisterLogic";

describe("toastFromSalesError", () => {
  it("muestra stock insuficiente para errores de concurrencia", () => {
    expect(toastFromSalesError({ message: "insufficient_size_stock: product p1, size 41" }))
      .toBe("Stock insuficiente. Actualiza la lista y vuelve a intentarlo.");
  });

  it("muestra permisos para RLS 42501", () => {
    expect(toastFromSalesError({ code: "42501", message: "row-level security policy" }))
      .toBe("Sin permisos para realizar esta operación.");
  });

  it("muestra autorización para 401", () => {
    expect(toastFromSalesError({ statusCode: 401, message: "Invalid JWT" }))
      .toBe("Sesión sin autorización para realizar esta operación.");
  });

  it("muestra migración pendiente para RPC faltante", () => {
    expect(toastFromSalesError({ code: "PGRST202", message: "Could not find the function register_daily_sales_atomic" }))
      .toBe("Operación no disponible en la base de datos. Aplica las migraciones pendientes.");
  });
});
