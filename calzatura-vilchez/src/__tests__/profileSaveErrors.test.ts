import { describe, expect, it } from "vitest";
import { profileSaveErrorToast } from "@/domains/usuarios/utils/profileSaveErrors";

describe("profileSaveErrorToast", () => {
  it("timeout", () => {
    expect(profileSaveErrorToast(new Error("TIMEOUT"))).toBe(
      "Tiempo agotado. Inténtalo de nuevo o revisa tu conexión."
    );
  });

  it("permiso RLS por mensaje (sin código)", () => {
    expect(
      profileSaveErrorToast(new Error("new row violates row-level security policy"))
    ).toBe("Sin permisos para realizar esta operación.");
  });

  it("permiso RLS por código 42501 (sin mensaje RLS)", () => {
    expect(
      profileSaveErrorToast({ message: "permission denied for table usuarios", code: "42501" })
    ).toBe("Sin permisos para realizar esta operación.");
  });

  it("permiso RLS código + mensaje combinados", () => {
    expect(
      profileSaveErrorToast({
        message: "new row violates row-level security policy for table \"usuarios\"",
        code: "42501",
      })
    ).toBe("Sin permisos para realizar esta operación.");
  });

  it("not found", () => {
    expect(profileSaveErrorToast(new Error("not-found"))).toBe(
      "Documento no encontrado. Recarga la pagina e intenta de nuevo"
    );
  });

  it("genérico", () => {
    expect(profileSaveErrorToast(new Error("boom"))).toBe("Error: boom");
    expect(profileSaveErrorToast("x")).toBe("Error: no se pudo guardar");
  });
});
