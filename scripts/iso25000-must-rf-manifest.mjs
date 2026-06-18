/**
 * Manifest compartido — RF Must del SRS (Idoneidad + Cumplimiento funcional).
 * Fuente canónica: documentacion/05-especificacion-requisitos-software-SRS.md
 */
export const MUST_RF_IDS = [
  "RF-CAT-01",
  "RF-CAT-02",
  "RF-AUT-01",
  "RF-AUT-02",
  "RF-AUT-03",
  "RF-AUT-04",
  "RF-CAR-01",
  "RF-CHK-01",
  "RF-PED-01",
  "RF-PAG-01",
  "RF-PED-03",
  "RF-ADM-01",
  "RF-ADM-02",
  "RF-ADM-03",
  "RF-ADM-05",
  "RF-ADM-06",
  "RF-ADM-07",
  "RF-ADM-08",
  "RF-ADM-11",
  "RF-FAV-01",
  "RF-IA-01",
  "RF-IA-02",
  "RF-IA-04",
  "RF-RN-01",
  "RF-RN-02",
];

export const LEGAL_RF_IDS = ["RF-LEG-01", "RF-LEG-02", "RF-LEG-03", "RF-LEG-04"];

/** Evidencia Idoneidad Must — reutilizada por Cumplimiento (trazabilidad SRS). */
export const MUST_RF_EVIDENCE = {
  "RF-CAT-01": [
    "calzatura-vilchez/e2e/catalog-filter-marca.spec.ts",
    "calzatura-vilchez/e2e/smoke.spec.ts",
  ],
  "RF-CAT-02": [
    "calzatura-vilchez/e2e/catalog-cart.spec.ts",
    "calzatura-vilchez/e2e/idoneidad-journey.spec.ts",
  ],
  "RF-AUT-01": [
    "calzatura-vilchez/e2e/register-validation.spec.ts",
    "calzatura-vilchez/src/__tests__/authCredentialsComplexity.test.ts",
    "calzatura-vilchez/src/__tests__/isoP0SecurityGuards.test.js",
  ],
  "RF-AUT-02": [
    "calzatura-vilchez/e2e/smoke.spec.ts",
    "calzatura-vilchez/e2e/profile-save.spec.ts",
  ],
  "RF-AUT-03": ["calzatura-vilchez/e2e/profile-save.spec.ts"],
  "RF-AUT-04": [
    "calzatura-vilchez/e2e/helpers/mockClientAuth.ts",
    "calzatura-vilchez/e2e/idoneidad-journey.spec.ts",
  ],
  "RF-CAR-01": [
    "calzatura-vilchez/e2e/cart-stock-validation.spec.ts",
    "calzatura-vilchez/e2e/catalog-cart.spec.ts",
  ],
  "RF-CHK-01": [
    "calzatura-vilchez/e2e/checkout-cod-order.spec.ts",
    "calzatura-vilchez/e2e/idoneidad-journey.spec.ts",
  ],
  "RF-PED-01": [
    "calzatura-vilchez/e2e/checkout-cod-order.spec.ts",
    "calzatura-vilchez/e2e/checkout-stripe.spec.ts",
    "calzatura-vilchez/e2e/idoneidad-journey.spec.ts",
  ],
  "RF-PAG-01": ["calzatura-vilchez/e2e/checkout-stripe.spec.ts"],
  "RF-PED-03": ["calzatura-vilchez/e2e/idoneidad-journey.spec.ts"],
  "RF-ADM-01": ["calzatura-vilchez/e2e/admin-dashboard.spec.ts"],
  "RF-ADM-02": [
    "calzatura-vilchez/e2e/admin-products-filters.spec.ts",
    "calzatura-vilchez/e2e/admin-product-delete.spec.ts",
  ],
  "RF-ADM-03": ["calzatura-vilchez/e2e/admin-stock-tallas.spec.ts"],
  "RF-ADM-05": ["calzatura-vilchez/e2e/admin-code-guards.spec.ts"],
  "RF-ADM-06": ["calzatura-vilchez/e2e/admin-commercial-guards.spec.ts"],
  "RF-ADM-07": ["calzatura-vilchez/e2e/admin-orders.spec.ts"],
  "RF-ADM-08": ["calzatura-vilchez/e2e/admin-sales.spec.ts"],
  "RF-ADM-11": ["calzatura-vilchez/e2e/admin-users.spec.ts"],
  "RF-FAV-01": ["calzatura-vilchez/e2e/favorites-isolation.spec.ts"],
  "RF-IA-01": [
    "documentacion/07-modulo-ia-riesgo-empresarial.md",
    "calzatura-vilchez/e2e/admin-ire-dashboard.spec.ts",
  ],
  "RF-IA-02": [
    "ai-service/tests/test_demand.py",
    "ai-service/tests/test_risk.py",
    "calzatura-vilchez/e2e/admin-predictions.spec.ts",
  ],
  "RF-IA-04": ["documentacion/07-modulo-ia-riesgo-empresarial.md"],
  "RF-RN-01": [
    "calzatura-vilchez/e2e/admin-commercial-guards.spec.ts",
    "calzatura-vilchez/src/__tests__/variantCreation.test.ts",
  ],
  "RF-RN-02": ["calzatura-vilchez/e2e/admin-code-guards.spec.ts"],
};

export const LEGAL_RF_EVIDENCE = {
  "RF-LEG-01": [
    "calzatura-vilchez/src/domains/publico/content/legal/infoLegalLibroReclamaciones.ts",
    "calzatura-vilchez/src/__tests__/libroReclamaciones.test.ts",
    "calzatura-vilchez/src/__tests__/complaintLegalPlazos.test.ts",
    "calzatura-vilchez/e2e/cumplimiento-funcional-legal.spec.ts",
  ],
  "RF-LEG-02": [
    "calzatura-vilchez/src/domains/publico/content/legal/data/privacidad.json",
    "calzatura-vilchez/e2e/cumplimiento-funcional-legal.spec.ts",
  ],
  "RF-LEG-03": [
    "calzatura-vilchez/src/domains/publico/content/legal/infoLegalPoliticaCookies.ts",
    "calzatura-vilchez/e2e/cookie-consent.spec.ts",
  ],
  "RF-LEG-04": [
    "calzatura-vilchez/src/domains/publico/content/legal/data/terminos.json",
    "calzatura-vilchez/e2e/cumplimiento-funcional-legal.spec.ts",
  ],
};
