"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { tallyFamilyGroupSizes, effectiveFamiliaKey } = require("./publicCatalog.cjs");

describe("publicCatalog", () => {
  it("effectiveFamiliaKey usa familiaId o id", () => {
    assert.equal(effectiveFamiliaKey({ id: "a", familiaId: "fam-1" }), "fam-1");
    assert.equal(effectiveFamiliaKey({ id: "solo", familiaId: "" }), "solo");
  });

  it("tallyFamilyGroupSizes agrupa variantes", () => {
    const counts = tallyFamilyGroupSizes([
      { id: "1", familiaId: "f" },
      { id: "2", familiaId: "f" },
      { id: "3", familiaId: "" },
    ]);
    assert.equal(counts.f, 2);
    assert.equal(counts["3"], 1);
  });
});
