import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";

const require = createRequire(import.meta.url);
const {
  buildSecurityAlertText,
  loadSecurityAlertRecipients,
} = require("../../bff/securityAlertEmail.cjs");

describe("securityAlertEmail", () => {
  it("buildSecurityAlertText no incluye HTML", () => {
    const text = buildSecurityAlertText({
      event: "rate limit",
      ipHash: "abc123",
      details: ["Línea <script>"],
    });
    expect(text).toContain("rate limit");
    expect(text).not.toContain("<script>");
    expect(text).toContain("‹script›");
  });

  it("loadSecurityAlertRecipients usa SECURITY_ALERT_EMAIL si está definido", () => {
    const prev = process.env.SECURITY_ALERT_EMAIL;
    const prevEnabled = process.env.SECURITY_ALERT_ENABLED;
    try {
      process.env.SECURITY_ALERT_ENABLED = "true";
      process.env.SECURITY_ALERT_EMAIL = "seguridad@empresa.pe";
      expect(loadSecurityAlertRecipients()).toEqual(["seguridad@empresa.pe"]);
    } finally {
      process.env.SECURITY_ALERT_EMAIL = prev;
      process.env.SECURITY_ALERT_ENABLED = prevEnabled;
    }
  });
});
