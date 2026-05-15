import { describe, expect, it } from "vitest";
import { toastFromSaveError } from "@/domains/productos/pages/adminProductsInternals";

describe("toastFromSaveError", () => {
  it("muestra permisos para RLS 42501", () => {
    expect(toastFromSaveError({ code: "42501", message: "new row violates row-level security policy" }))
      .toBe("Sin permisos para realizar esta operación.");
  });

  it("muestra autorización para 401 aunque venga como statusCode", () => {
    expect(toastFromSaveError({ statusCode: 401, message: "Invalid token" }))
      .toBe("Sesión sin autorización para realizar esta operación.");
  });

  it("detecta 401 dentro del mensaje de Supabase", () => {
    expect(toastFromSaveError({ message: "HTTP 401 Unauthorized" }))
      .toBe("Sesión sin autorización para realizar esta operación.");
  });

  it("muestra migración pendiente para RPC faltante", () => {
    expect(toastFromSaveError({ code: "PGRST202", message: "Could not find the function public.delete_product_atomic" }))
      .toBe("Operación no disponible en la base de datos. Aplica las migraciones pendientes.");
  });
});
