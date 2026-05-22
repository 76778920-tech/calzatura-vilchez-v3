import { describe, expect, it } from "vitest";
import {
  decodeGooglePolyline,
  getGoogleMapsApiKey,
} from "../../bff/delivery.cjs";

describe("Google Directions (BFF delivery.cjs)", () => {
  it("decodeGooglePolyline decodifica puntos válidos", () => {
    const points = decodeGooglePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    expect(points.length).toBeGreaterThan(1);
    expect(points[0][0]).toBeCloseTo(38.5, 0);
    expect(points[0][1]).toBeCloseTo(-120.2, 0);
  });

  it("getGoogleMapsApiKey lee GOOGLE_MAPS_API_KEY sin exponer en front", () => {
    const prev = process.env.GOOGLE_MAPS_API_KEY;
    process.env.GOOGLE_MAPS_API_KEY = " test-key ";
    expect(getGoogleMapsApiKey()).toBe("test-key");
    if (prev === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
    else process.env.GOOGLE_MAPS_API_KEY = prev;
  });
});
