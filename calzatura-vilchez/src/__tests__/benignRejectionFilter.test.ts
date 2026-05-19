import { describe, expect, it } from "vitest";
import { isBenignUnhandledRejection } from "@/utils/benignRejectionFilter";

describe("isBenignUnhandledRejection", () => {
  it("detects extension message channel errors", () => {
    expect(
      isBenignUnhandledRejection(
        new Error(
          "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received",
        ),
      ),
    ).toBe(true);
  });

  it("ignores real application errors", () => {
    expect(isBenignUnhandledRejection(new Error("No se pudo cargar tu desempeño."))).toBe(false);
  });
});
