import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from "firebase/app-check";
import { canUseSecurityCookies } from "@/config/cookieConsent";
import app from "@/firebase/config";

let appCheckInstance: AppCheck | null = null;

/**
 * Inicializa Firebase App Check solo si el usuario aceptó cookies de seguridad
 * (reCAPTCHA). Llamar tras guardar consentimiento o al cargar con consent previo.
 */
export function tryInitAppCheckFromConsent(): AppCheck | null {
  if (appCheckInstance) return appCheckInstance;
  if (import.meta.env.VITE_E2E === "true") return null;

  const siteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY as string | undefined;
  if (!siteKey?.trim()) return null;
  if (!canUseSecurityCookies()) return null;

  appCheckInstance = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  return appCheckInstance;
}

export function getAppCheckInstance(): AppCheck | null {
  return appCheckInstance;
}
