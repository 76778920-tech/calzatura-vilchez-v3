import { describe, it, expect } from "vitest";
import { effectiveFamiliaKey, tallyFamilyGroupSizes } from "@/utils/productFamily";

describe("effectiveFamiliaKey", () => {
  it("usa familiaId cuando viene informado", () => {
    expect(
      effectiveFamiliaKey({ id: "prod-1", familiaId: "familia-uuid-abc" })
    ).toBe("familia-uuid-abc");
  });

  it("ignora espacios en familiaId", () => {
    expect(effectiveFamiliaKey({ id: "x", familiaId: "  same  " })).toBe("same");
  });

  it("si familiaId vacío usa id del producto", () => {
    expect(effectiveFamiliaKey({ id: "legacy-99", familiaId: "" })).toBe("legacy-99");
    expect(effectiveFamiliaKey({ id: "legacy-99", familiaId: "   " })).toBe("legacy-99");
  });

  it("sin familiaId usa id", () => {
    expect(effectiveFamiliaKey({ id: "solo" })).toBe("solo");
  });
});

describe("tallyFamilyGroupSizes", () => {
  it("agrupa por familiaId compartido", () => {
    const rows = [
      { id: "a", familiaId: "fam-1" },
      { id: "b", familiaId: "fam-1" },
      { id: "c", familiaId: "fam-2" },
    ];
    expect(tallyFamilyGroupSizes(rows)).toEqual({ "fam-1": 2, "fam-2": 1 });
  });

  it("sin familiaId agrupa por id (cada uno solo)", () => {
    const rows = [{ id: "x" }, { id: "y" }];
    expect(tallyFamilyGroupSizes(rows)).toEqual({ x: 1, y: 1 });
  });

  it("variante apuntando al id del padre suma con el padre", () => {
    const rows = [{ id: "padre-id" }, { id: "var-b", familiaId: "padre-id" }];
    expect(tallyFamilyGroupSizes(rows)).toEqual({ "padre-id": 2 });
  });
});
