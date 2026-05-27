import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { COOKIE_POLICY_LAST_UPDATED } from "@/config/cookieConsentPolicy";
import { INFO_ROUTES } from "@/routes/paths";
import { useCookieConsent } from "@/context/CookieConsentContext";
import { CookiePreferencesModal } from "@/components/cookies/CookiePreferencesModal";

export function CookieBanner() {
  const { bannerOpen, acceptAll, rejectNonEssential, openPreferences } = useCookieConsent();

  return (
    <>
      {bannerOpen ? (
        <section
          className="cookie-consent-banner"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-banner-title"
          aria-describedby="cookie-banner-desc"
        >
          <div className="cookie-consent-banner-inner">
            <div className="cookie-consent-banner-head">
              <span className="cookie-consent-banner-icon" aria-hidden="true">
                <Shield size={22} />
              </span>
              <div>
                <h2 id="cookie-banner-title">Tu privacidad en Calzatura Vilchez</h2>
                <p className="cookie-consent-banner-updated">
                  Política vigente al {COOKIE_POLICY_LAST_UPDATED}
                </p>
              </div>
            </div>

            <p id="cookie-banner-desc" className="cookie-consent-banner-lead">
              Usamos cookies y tecnologías similares para operar la tienda en línea, proteger tu
              cuenta y mejorar tu experiencia. Puedes aceptar todas las categorías, limitarte a las
              estrictamente necesarias o configurar tu elección en detalle.
            </p>

            <p className="cookie-consent-banner-note">
              Si eliges solo las necesarias, podrás explorar el catálogo; para registrarte, iniciar
              sesión o pagar en línea podríamos pedirte autorizar categorías adicionales.
            </p>

            <p className="cookie-consent-banner-legal">
              Más información en nuestra{" "}
              <Link to={INFO_ROUTES.legalCookies}>Política de cookies</Link> y en la{" "}
              <Link to={INFO_ROUTES.legalPrivacidad}>Política de privacidad</Link>.
            </p>

            <div className="cookie-consent-banner-actions">
              <button type="button" className="btn-primary" onClick={acceptAll}>
                Aceptar todas
              </button>
              <button type="button" className="btn-ghost" onClick={rejectNonEssential}>
                Solo necesarias
              </button>
              <button
                type="button"
                className="btn-ghost cookie-consent-configure"
                onClick={openPreferences}
              >
                Configuración de cookies
              </button>
            </div>
          </div>
        </section>
      ) : null}
      <CookiePreferencesModal />
    </>
  );
}
