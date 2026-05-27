import { createRequire } from "node:module";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const require = createRequire(import.meta.url);

describe("securityMonitor", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SECURITY_ALERT_ENABLED = "true";
    process.env.SECURITY_ALERT_EMAIL = "alert@test.local";
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.SECURITY_EMAIL_FROM = "Test <noreply@test.local>";
    process.env.SECURITY_VALIDATION_ABUSE_MAX = "3";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SECURITY_VALIDATION_ABUSE_MAX;
  });

  it("onValidationFailure alerta solo al cruzar el umbral (por superficie)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { onValidationFailure, SURFACES } = require("../../bff/securityMonitor.cjs");
    const ip = "203.0.113.50";
    const log = () => {};

    await onValidationFailure({ surface: SURFACES.AUTH_LOGIN, ip, fields: { a: 1 } }, log);
    await onValidationFailure({ surface: SURFACES.AUTH_LOGIN, ip, fields: { a: 1 } }, log);
    expect(fetchMock).not.toHaveBeenCalled();

    await onValidationFailure({ surface: SURFACES.AUTH_LOGIN, ip, fields: { a: 1 } }, log);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await onValidationFailure({ surface: SURFACES.AUTH_LOGIN, ip, fields: { a: 1 } }, log);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const ipLibro = "198.51.100.77";
    await onValidationFailure({ surface: SURFACES.LIBRO_RECLAMACIONES, ip: ipLibro, fields: { b: 1 } }, log);
    await onValidationFailure({ surface: SURFACES.LIBRO_RECLAMACIONES, ip: ipLibro, fields: { b: 1 } }, log);
    await onValidationFailure({ surface: SURFACES.LIBRO_RECLAMACIONES, ip: ipLibro, fields: { b: 1 } }, log);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("parseThreshold ignora valores no numéricos", () => {
    const { parseThreshold } = require("../../bff/securityMonitor.cjs");
    expect(parseThreshold("not-a-number", 5)).toBe(5);
    expect(parseThreshold("0", 5)).toBe(5);
    expect(parseThreshold("4", 5)).toBe(4);
  });
});
