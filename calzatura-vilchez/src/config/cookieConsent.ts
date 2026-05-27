import {
  ACCEPT_ALL_CHOICES,
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_POLICY_VERSION,
  type CookieCategoryId,
  type CookieChoices,
  type CookieConsentRecord,
  REJECT_NON_ESSENTIAL_CHOICES,
} from "@/config/cookieConsentPolicy";

function isBrowser(): boolean {
  return typeof globalThis.window !== "undefined" && typeof globalThis.localStorage !== "undefined";
}

/** Playwright puede forzar el banner con localStorage (cookie-consent.spec.ts). */
export const E2E_FORCE_COOKIE_BANNER_KEY = "calzatura_e2e_force_cookie_banner";

function isE2eBypass(): boolean {
  if (import.meta.env.VITE_E2E !== "true") return false;
  if (
    isBrowser() &&
    globalThis.localStorage.getItem(E2E_FORCE_COOKIE_BANNER_KEY) === "1"
  ) {
    return false;
  }
  return true;
}

function parseRecord(raw: string): CookieConsentRecord | null {
  try {
    const parsed = JSON.parse(raw) as CookieConsentRecord;
    if (parsed?.version !== COOKIE_POLICY_VERSION) return null;
    if (!parsed.timestamp || typeof parsed.timestamp !== "string") return null;
    const c = parsed.choices;
    if (
      typeof c?.functional !== "boolean" ||
      typeof c?.security !== "boolean" ||
      typeof c?.analytics !== "boolean"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Consentimiento implícito en E2E para no bloquear Playwright. */
function e2eFullConsent(): CookieConsentRecord {
  return {
    version: COOKIE_POLICY_VERSION,
    timestamp: new Date().toISOString(),
    choices: { ...ACCEPT_ALL_CHOICES },
  };
}

export function loadCookieConsent(): CookieConsentRecord | null {
  if (isE2eBypass()) return e2eFullConsent();
  if (!isBrowser()) return null;
  const raw = globalThis.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  if (!raw) return null;
  return parseRecord(raw);
}

export function hasValidCookieConsent(): boolean {
  return loadCookieConsent() !== null;
}

export function saveCookieConsent(choices: CookieChoices): CookieConsentRecord {
  const record: CookieConsentRecord = {
    version: COOKIE_POLICY_VERSION,
    timestamp: new Date().toISOString(),
    choices: {
      functional: Boolean(choices.functional),
      security: Boolean(choices.security),
      analytics: Boolean(choices.analytics),
    },
  };
  if (isBrowser() && !isE2eBypass()) {
    globalThis.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
  }
  return record;
}

export function acceptAllCookies(): CookieConsentRecord {
  return saveCookieConsent(ACCEPT_ALL_CHOICES);
}

export function rejectNonEssentialCookies(): CookieConsentRecord {
  return saveCookieConsent(REJECT_NON_ESSENTIAL_CHOICES);
}

export function acceptsCookieCategory(category: CookieCategoryId): boolean {
  if (category === "essential") return true;
  const record = loadCookieConsent();
  if (!record) return false;
  if (category === "functional") return record.choices.functional;
  if (category === "security") return record.choices.security;
  return record.choices.analytics;
}

export function canUseAnalytics(): boolean {
  return acceptsCookieCategory("analytics");
}

export function canUseSecurityCookies(): boolean {
  return acceptsCookieCategory("security");
}

export function canUseFunctionalCookies(): boolean {
  return acceptsCookieCategory("functional");
}
