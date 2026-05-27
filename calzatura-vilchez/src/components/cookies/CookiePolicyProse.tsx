import {
  COOKIE_CATEGORY_META,
  COOKIE_POLICY_LAST_UPDATED,
  COOKIE_POLICY_VERSION,
  COOKIE_REGISTRY,
  type CookieCategoryId,
} from "@/config/cookieConsentPolicy";

const CATEGORY_ORDER: CookieCategoryId[] = ["essential", "functional", "security", "analytics"];

export function CookiePolicyProse() {
  return (
    <div className="cookie-policy-prose">
      <p className="cookie-policy-prose-lead">
        Detalle por categoría (versión {COOKIE_POLICY_VERSION}, {COOKIE_POLICY_LAST_UPDATED}):
      </p>

      {CATEGORY_ORDER.map((categoryId) => {
        const meta = COOKIE_CATEGORY_META[categoryId];
        const rows = COOKIE_REGISTRY.filter((row) => row.category === categoryId);

        return (
          <section key={categoryId} className="cookie-policy-prose-block">
            <h3>{meta.label}</h3>
            <p>{meta.policyDetail}</p>
            {rows.length > 0 ? (
              <>
                <p className="cookie-policy-prose-inventory-label">
                  Elementos incluidos en esta categoría:
                </p>
                <ul>
                  {rows.map((row) => (
                    <li key={`${row.name}-${row.provider}`}>
                      <strong>{row.name}</strong> — Proveedor: {row.provider}. Finalidad:{" "}
                      {row.purpose} Conservación estimada: {row.duration}.
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="cookie-policy-prose-empty">
                En la versión actual del sitio no se instalan cookies ni tecnologías equivalentes
                dentro de esta categoría.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
