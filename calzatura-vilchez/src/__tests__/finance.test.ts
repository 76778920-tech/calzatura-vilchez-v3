import { describe, it, expect } from "vitest";
import { calculatePriceRange } from "@/domains/ventas/services/finance";

describe("calculatePriceRange", () => {
  it("calcula precios correctamente con márgenes estándar", () => {
    const result = calculatePriceRange(100, 20, 35, 55);
    expect(result.precioMinimo).toBe(120);
    expect(result.precioSugerido).toBe(135);
    expect(result.precioMaximo).toBe(155);
  });

  it("devuelve los márgenes tal como se pasan", () => {
    const result = calculatePriceRange(100, 20, 35, 55);
    expect(result.margenMinimo).toBe(20);
    expect(result.margenObjetivo).toBe(35);
    expect(result.margenMaximo).toBe(55);
  });

  it("redondea a dos decimales", () => {
    const result = calculatePriceRange(75, 20, 35, 55);
    expect(result.precioMinimo).toBe(90);
    expect(result.precioSugerido).toBe(101.25);
    expect(result.precioMaximo).toBe(116.25);
  });

  it("usa márgenes por defecto cuando no se especifican", () => {
    const result = calculatePriceRange(100);
    expect(result.margenMinimo).toBe(25);
    expect(result.margenObjetivo).toBe(45);
    expect(result.margenMaximo).toBe(75);
  });

  it("no permite costo negativo — lo trata como cero", () => {
    const result = calculatePriceRange(-50, 20, 35, 55);
    expect(result.precioMinimo).toBe(0);
    expect(result.precioSugerido).toBe(0);
    expect(result.precioMaximo).toBe(0);
  });

  it("no permite margen negativo — lo trata como cero", () => {
    const result = calculatePriceRange(100, -10, -5, 0);
    expect(result.margenMinimo).toBe(0);
    expect(result.margenObjetivo).toBe(0);
    expect(result.margenMaximo).toBe(0);
    expect(result.precioMinimo).toBe(100);
  });

  it("ajusta margenObjetivo si es menor que margenMinimo", () => {
    const result = calculatePriceRange(100, 40, 20, 60);
    expect(result.margenObjetivo).toBe(40);
  });

  it("ajusta margenMaximo si es menor que margenObjetivo", () => {
    const result = calculatePriceRange(100, 20, 50, 30);
    expect(result.margenMaximo).toBe(50);
  });

  it("funciona con costo cero", () => {
    const result = calculatePriceRange(0, 20, 35, 55);
    expect(result.precioMinimo).toBe(0);
    expect(result.precioSugerido).toBe(0);
    expect(result.precioMaximo).toBe(0);
  });
});
