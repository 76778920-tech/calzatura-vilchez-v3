import { describe, it, expect } from "vitest";
import {
  normalizePeruPhoneInput,
  peruPhoneDigits,
  isValidPeruPhone,
  formatPeruPhone,
  peruPhoneError,
} from "@/utils/phone";

describe("peruPhoneDigits", () => {
  it("elimina el prefijo +51", () => {
    expect(peruPhoneDigits("+51 987 654 321")).toBe("987654321");
  });

  it("elimina el prefijo numérico 51", () => {
    expect(peruPhoneDigits("51987654321")).toBe("987654321");
  });

  it("devuelve dígitos sin prefijo tal cual", () => {
    expect(peruPhoneDigits("987 654 321")).toBe("987654321");
  });

  it("sin prefijo no altera los dígitos", () => {
    expect(peruPhoneDigits("987654321")).toBe("987654321");
  });
});

describe("isValidPeruPhone", () => {
  it("acepta número peruano válido que empieza en 9", () => {
    expect(isValidPeruPhone("987654321")).toBe(true);
  });

  it("rechaza número bloqueado 999999999", () => {
    expect(isValidPeruPhone("999999999")).toBe(false);
  });

  it("rechaza número bloqueado 000000000", () => {
    expect(isValidPeruPhone("000000000")).toBe(false);
  });

  it("rechaza número con menos de 9 dígitos", () => {
    expect(isValidPeruPhone("98765432")).toBe(false);
  });

  it("rechaza número que no empieza en 9", () => {
    expect(isValidPeruPhone("887654321")).toBe(false);
  });
});

describe("formatPeruPhone", () => {
  it("formatea 9 dígitos con prefijo +51", () => {
    expect(formatPeruPhone("987654321")).toBe("+51 987 654 321");
  });

  it("devuelve solo +51 para entrada vacía", () => {
    expect(formatPeruPhone("")).toBe("+51");
  });

  it("normaliza input que ya trae prefijo +51", () => {
    expect(formatPeruPhone("+51987654321")).toBe("+51 987 654 321");
  });
});

describe("normalizePeruPhoneInput", () => {
  it("formatea con prefijo cuando el input empieza con +", () => {
    expect(normalizePeruPhoneInput("+51987654321")).toBe("+51 987 654 321");
  });

  it("formatea con prefijo cuando el input empieza con 51", () => {
    expect(normalizePeruPhoneInput("51987654321")).toBe("+51 987 654 321");
  });

  it("agrupa sin prefijo cuando no hay indicador de prefijo", () => {
    expect(normalizePeruPhoneInput("987654321")).toBe("987 654 321");
  });
});

describe("peruPhoneError", () => {
  it("devuelve null para número válido", () => {
    expect(peruPhoneError("987654321")).toBeNull();
  });

  it("error cuando tiene menos de 9 dígitos", () => {
    expect(peruPhoneError("98765432")).toBe("El teléfono debe tener 9 dígitos.");
  });

  it("error cuando tiene más de 9 dígitos", () => {
    expect(peruPhoneError("9876543211")).toBe("El teléfono debe tener 9 dígitos.");
  });

  it("error cuando no empieza con 9", () => {
    expect(peruPhoneError("887654321")).toBe("El teléfono debe empezar con 9.");
  });

  it("error para número bloqueado", () => {
    expect(peruPhoneError("999999999")).toBe("Ingresa un teléfono real.");
  });
});
