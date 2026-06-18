import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const hostingConfig = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "firebase.json"), "utf8"),
);
const globalHeaders =
  hostingConfig.hosting?.headers?.find((h) => h.source === "**")?.headers ?? [];

function headerValue(key) {
  return globalHeaders.find((h) => h.key === key)?.value ?? "";
}

describe("Seguridad — headers Firebase Hosting (ISO 25010 superficie web)", () => {
  it("HSTS con includeSubDomains", () => {
    expect(headerValue("Strict-Transport-Security")).toContain("max-age=31536000");
    expect(headerValue("Strict-Transport-Security")).toContain("includeSubDomains");
  });

  it("anti-clickjacking y nosniff", () => {
    expect(headerValue("X-Frame-Options")).toBe("DENY");
    expect(headerValue("X-Content-Type-Options")).toBe("nosniff");
  });

  it("CSP de hosting con report-uri y script-src acotado", () => {
    const csp = headerValue("Content-Security-Policy");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("report-uri");
    expect(csp).toContain("script-src");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("COOP configurado para OAuth/Stripe (riesgo residual documentado)", () => {
    expect(headerValue("Cross-Origin-Opener-Policy")).toBe("same-origin-allow-popups");
  });
});
