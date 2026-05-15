import { describe, expect, it } from "vitest";
import {
  addressLabelContainsHousenumber,
  isDrivingRouteGeometry,
  parseStreetHousenumber,
  preferHousenumberMatches,
} from "@/services/deliveryOpenRoute";

describe("parseStreetHousenumber", () => {
  it("separa vía y número con #", () => {
    expect(parseStreetHousenumber("Av. Giraldez #215")).toEqual({
      street: "Av. Giraldez",
      housenumber: "215",
    });
  });

  it("separa número al final de la calle", () => {
    expect(parseStreetHousenumber("Jr. Puno 245")).toEqual({
      street: "Jr. Puno",
      housenumber: "245",
    });
  });
});

describe("preferHousenumberMatches", () => {
  it("filtra a coincidencias con el número cuando existen", () => {
    const list = [
      { lat: 1, lng: 1, label: "Huancayo, Perú", layer: "locality" },
      { lat: 2, lng: 2, label: "Av. Giraldez 215, Huancayo", layer: "address" },
    ];
    const out = preferHousenumberMatches(list, "215");
    expect(out).toHaveLength(1);
    expect(out[0].label).toContain("215");
  });
});

describe("isDrivingRouteGeometry", () => {
  it("requiere al menos 3 vértices", () => {
    expect(isDrivingRouteGeometry(null)).toBe(false);
    expect(isDrivingRouteGeometry([[-12, -75], [-12.01, -75.01]])).toBe(false);
    expect(
      isDrivingRouteGeometry([
        [-12, -75],
        [-12.005, -75.005],
        [-12.01, -75.01],
      ]),
    ).toBe(true);
  });
});

describe("addressLabelContainsHousenumber", () => {
  it("detecta el número como token", () => {
    expect(addressLabelContainsHousenumber("Av. Giraldez 215, Huancayo", "215")).toBe(true);
    expect(addressLabelContainsHousenumber("Av. Giraldez 21, Huancayo", "215")).toBe(false);
  });
});
