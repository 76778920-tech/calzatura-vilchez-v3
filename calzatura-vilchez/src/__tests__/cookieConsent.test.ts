import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptAllCookies,
  acceptsCookieCategory,
  hasValidCookieConsent,
  loadCookieConsent,
  rejectNonEssentialCookies,
  saveCookieConsent,
} from "@/config/cookieConsent";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_POLICY_VERSION,
} from "@/config/cookieConsentPolicy";

describe("cookieConsent", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_E2E", "");
    globalThis.localStorage.clear();
  });

  it("no hay consentimiento válido sin registro previo", () => {
    expect(hasValidCookieConsent()).toBe(false);
    expect(loadCookieConsent()).toBeNull();
  });

  it("acceptAll activa funcional y seguridad; analítica permanece desactivada", () => {
    const record = acceptAllCookies();
    expect(record.version).toBe(COOKIE_POLICY_VERSION);
    expect(record.choices).toEqual({
      functional: true,
      security: true,
      analytics: false,
    });
    expect(hasValidCookieConsent()).toBe(true);
    expect(acceptsCookieCategory("security")).toBe(true);
    expect(acceptsCookieCategory("analytics")).toBe(false);
  });

  it("rejectNonEssential desactiva categorías opcionales", () => {
    rejectNonEssentialCookies();
    expect(acceptsCookieCategory("functional")).toBe(false);
    expect(acceptsCookieCategory("security")).toBe(false);
    expect(acceptsCookieCategory("analytics")).toBe(false);
    expect(acceptsCookieCategory("essential")).toBe(true);
  });

  it("invalida consentimiento si cambia la versión de política", () => {
    globalThis.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: "0.9",
        timestamp: new Date().toISOString(),
        choices: { functional: true, security: true, analytics: true },
      }),
    );
    expect(hasValidCookieConsent()).toBe(false);
  });

  it("persiste en localStorage con clave permitida", () => {
    saveCookieConsent({ functional: true, security: false, analytics: false });
    const raw = globalThis.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.choices.functional).toBe(true);
    expect(parsed.choices.security).toBe(false);
  });
});
