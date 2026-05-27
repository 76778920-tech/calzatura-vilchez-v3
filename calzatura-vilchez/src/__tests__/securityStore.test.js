import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";

const require = createRequire(import.meta.url);

describe("securityStore", () => {
  it("consumeRateLimit marca limited al superar max (memoria)", async () => {
    const { consumeRateLimit } = require("../../bff/securityStore.cjs");
    const key = `test:${Date.now()}`;
    let last;
    for (let i = 0; i < 4; i += 1) {
      last = await consumeRateLimit(key, 3, 60_000);
    }
    expect(last.count).toBe(4);
    expect(last.limited).toBe(true);
    expect(last.backend).toBe("memory");
  });
});
