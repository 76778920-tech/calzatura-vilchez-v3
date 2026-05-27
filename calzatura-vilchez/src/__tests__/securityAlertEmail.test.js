import { createRequire } from "node:module";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const require = createRequire(import.meta.url);

describe("securityAlertEmail", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("buildSecurityAlertText no incluye HTML", () => {
    const { buildSecurityAlertText } = require("../../bff/securityAlertEmail.cjs");
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
    const { loadSecurityAlertRecipients } = require("../../bff/securityAlertEmail.cjs");
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

  it("sendSecurityAlertEmail reintenta si Resend falla", async () => {
    process.env.SECURITY_ALERT_ENABLED = "true";
    process.env.SECURITY_ALERT_EMAIL = "alert@test.local";
    process.env.RESEND_API_KEY = "re_test";
    process.env.SECURITY_EMAIL_FROM = "T <t@t>";

    let calls = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      calls += 1;
      if (calls === 1) return Promise.resolve({ ok: false, status: 500, text: () => Promise.resolve("err") });
      return Promise.resolve({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { sendSecurityAlertEmail } = require("../../bff/securityAlertEmail.cjs");
    const payload = { event: "Test evento", ipHash: "abc", details: ["detalle"] };

    const first = await sendSecurityAlertEmail(payload, () => {});
    const second = await sendSecurityAlertEmail(payload, () => {});

    expect(first.ok).toBe(false);
    expect(second.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
