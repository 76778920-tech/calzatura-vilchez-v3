import { useCookieConsent } from "@/context/useCookieConsent";

/** Enlace en el footer para reabrir preferencias de cookies. */
export function CookieSettingsLink() {
  const { openPreferences } = useCookieConsent();

  return (
    <button type="button" className="footer-cookie-settings" onClick={openPreferences}>
      Configuración de cookies
    </button>
  );
}
