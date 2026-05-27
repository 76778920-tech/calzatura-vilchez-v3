import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useDialogKeyboardTrap } from "@/hooks/useDialogKeyboardTrap";
import {
  COOKIE_CATEGORY_META,
  COOKIE_POLICY_LAST_UPDATED,
  COOKIE_POLICY_VERSION,
  type CookieCategoryId,
  type CookieChoices,
} from "@/config/cookieConsentPolicy";
import { INFO_ROUTES } from "@/routes/paths";
import { useCookieConsent } from "@/context/useCookieConsent";

type OptionalCookieCategoryId = Exclude<CookieCategoryId, "essential">;
const OPTIONAL_CATEGORIES: OptionalCookieCategoryId[] = ["functional", "security", "analytics"];

function choicesFromConsent(consent: ReturnType<typeof useCookieConsent>["consent"]): CookieChoices {
  return {
    functional: consent?.choices.functional ?? false,
    security: consent?.choices.security ?? false,
    analytics: consent?.choices.analytics ?? false,
  };
}

export function CookiePreferencesModal() {
  const { consent, preferencesOpen, closePreferences, savePreferences, acceptAll } =
    useCookieConsent();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<CookieChoices>(() => choicesFromConsent(consent));
  const resetDraft = () => setDraft(choicesFromConsent(consent));
  const handleClose = () => {
    resetDraft();
    closePreferences();
  };
  const handleAcceptAll = () => {
    resetDraft();
    acceptAll();
  };
  const handleSave = () => {
    savePreferences(draft);
    resetDraft();
  };

  useDialogKeyboardTrap(dialogRef, {
    enabled: preferencesOpen,
    onEscape: handleClose,
  });

  useEffect(() => {
    if (preferencesOpen) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [preferencesOpen, consent]);

  if (!preferencesOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="cookie-consent-dialog"
      aria-labelledby="cookie-preferences-title"
      onClose={handleClose}
    >
      <div className="cookie-consent-dialog-inner">
        <header className="cookie-consent-dialog-header">
          <div>
            <h2 id="cookie-preferences-title">Configuración de cookies</h2>
            <p className="cookie-consent-dialog-version">
              Versión {COOKIE_POLICY_VERSION} · Vigente al {COOKIE_POLICY_LAST_UPDATED}
            </p>
          </div>
          <button
            type="button"
            className="cookie-consent-dialog-close"
            onClick={handleClose}
            aria-label="Cerrar configuración de cookies"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <p className="cookie-consent-dialog-intro">
          Selecciona las categorías que autorizas. Las cookies estrictamente necesarias permanecen
          activas para que el sitio funcione. El detalle completo está en la{" "}
          <Link to={INFO_ROUTES.legalCookies} onClick={handleClose}>
            Política de cookies
          </Link>
          .
        </p>

        <ul className="cookie-consent-category-list">
          <li className="cookie-consent-category-item cookie-consent-category-item--locked">
            <div>
              <strong>{COOKIE_CATEGORY_META.essential.label}</strong>
              <p>{COOKIE_CATEGORY_META.essential.description}</p>
            </div>
            <span className="cookie-consent-always-on" aria-hidden="true">
              Siempre activas
            </span>
          </li>

          {OPTIONAL_CATEGORIES.map((id) => {
            const meta = COOKIE_CATEGORY_META[id];
            const checked = draft[id];
            const inactive = !meta.active;
            return (
              <li
                key={id}
                className={`cookie-consent-category-item${inactive ? " cookie-consent-category-item--inactive" : ""}`}
              >
                <div>
                  <label htmlFor={inactive ? undefined : `cookie-pref-${id}`}>
                    <strong>{meta.label}</strong>
                  </label>
                  <p>{meta.description}</p>
                  {inactive ? (
                    <p className="cookie-consent-category-inactive">No disponible en este sitio.</p>
                  ) : null}
                </div>
                <input
                  id={`cookie-pref-${id}`}
                  type="checkbox"
                  checked={checked}
                  disabled={inactive}
                  aria-disabled={inactive}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, [id]: e.target.checked }))
                  }
                />
              </li>
            );
          })}
        </ul>

        <footer className="cookie-consent-dialog-actions">
          <button type="button" className="btn-ghost" onClick={handleClose}>
            Cancelar
          </button>
          <button type="button" className="btn-ghost" onClick={handleAcceptAll}>
            Aceptar todas
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
          >
            Guardar preferencias
          </button>
        </footer>
      </div>
    </dialog>
  );
}
