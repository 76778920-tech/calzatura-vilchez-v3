import { describe, it, expect } from "vitest";
import { categoryLabel } from "@/utils/labels";

describe("categoryLabel", () => {
  it.each([
    ["todos", "Todos"],
    ["hombre", "Hombre"],
    ["mujer", "Mujer"],
    ["dama", "Mujer"],
    ["nino", "Niños"],
    ["ninos", "Niños"],
    ["ninas", "Niñas"],
    ["bebe", "Bebé"],
    ["junior", "Junior"],
    ["deportivo", "Deportivo"],
    ["casual", "Casual"],
    ["formal", "Formal"],
    ["cyber-wow", "CYBER WOW"],
  ])('slug conocido "%s" → "%s"', (slug, label) => {
    expect(categoryLabel(slug)).toBe(label);
  });

  it("capitaliza el primer carácter de slugs desconocidos", () => {
    expect(categoryLabel("outlet")).toBe("Outlet");
    expect(categoryLabel("verano")).toBe("Verano");
  });

  it("slug de un solo carácter", () => {
    expect(categoryLabel("x")).toBe("X");
  });
});
