import { createRequire } from "node:module";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const require = createRequire(import.meta.url);

describe("publicRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.LOGIN_RATE_MAX;
  });

  afterEach(() => {
    delete process.env.LOGIN_RATE_MAX;
  });

  it("buildRateLimitSpecs ignora LOGIN_RATE_MAX inválido", () => {
    process.env.LOGIN_RATE_MAX = "not-valid";
    const { buildRateLimitSpecs } = require("../../bff/publicRateLimit.cjs");
    const { SURFACES } = require("../../bff/securityMonitor.cjs");
    expect(buildRateLimitSpecs()[SURFACES.AUTH_LOGIN].max).toBe(15);
  });
});
