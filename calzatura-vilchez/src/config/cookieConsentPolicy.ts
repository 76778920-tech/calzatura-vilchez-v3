/** Versión de la política de cookies; al cambiar, el banner vuelve a mostrarse. */
export const COOKIE_POLICY_VERSION = "1.1";

export const COOKIE_POLICY_LAST_UPDATED = "26 de mayo de 2026";

export const COOKIE_CONSENT_STORAGE_KEY = "calzatura_cookie_consent";

export type CookieCategoryId = "essential" | "functional" | "security" | "analytics";

export type CookieChoices = {
  functional: boolean;
  security: boolean;
  analytics: boolean;
};

export type CookieConsentRecord = {
  version: string;
  timestamp: string;
  choices: CookieChoices;
};

/** Fila orientada al usuario (sin nombres técnicos internos). */
export type CookieRegistryRow = {
  name: string;
  provider: string;
  purpose: string;
  duration: string;
  category: CookieCategoryId;
};

export const COOKIE_CATEGORY_META: Record<
  CookieCategoryId,
  {
    label: string;
    description: string;
    policyDetail: string;
    required: boolean;
    active: boolean;
  }
> = {
  essential: {
    label: "Estrictamente necesarias",
    description:
      "Permiten que el sitio funcione, recordar tu elección de privacidad y proteger la navegación. No se pueden desactivar.",
    policyDetail:
      "Esta categoría incluye cookies y almacenamientos imprescindibles para mostrar el sitio, mantener la seguridad perimetral, recordar si aceptaste o rechazaste otras categorías, y guardar preferencias básicas de visualización. Sin ellas, el servicio de navegación solicitado no puede prestarse de forma adecuada.",
    required: true,
    active: true,
  },
  functional: {
    label: "Funcionales",
    description:
      "Permiten iniciar sesión, guardar tu carrito, completar compras y recordar preferencias de la tienda en línea.",
    policyDetail:
      "Se activan cuando autorizas esta categoría en el panel de cookies. Permiten asociar tu sesión de usuario, conservar los productos del carrito entre páginas o visitas, y completar el proceso de pago con tarjeta a través del proveedor de pagos integrado. Si las rechazas, la experiencia de compra en línea puede verse limitada.",
    required: false,
    active: true,
  },
  security: {
    label: "Seguridad y prevención de fraude",
    description:
      "Ayudan a verificar que eres una persona real al registrarte y a proteger la tienda contra usos indebidos.",
    policyDetail:
      "Se utilizan para validar operaciones sensibles, como la creación de cuenta o consultas que requieran verificación antiabuso, y para reforzar la protección del sitio frente a accesos automatizados. Solo se activan con tu consentimiento expreso en el panel de configuración.",
    required: false,
    active: true,
  },
  analytics: {
    label: "Medición y personalización comercial",
    description:
      "En este momento no utilizamos herramientas de medición de audiencia ni publicidad personalizada en el sitio.",
    policyDetail:
      "Comprende cookies de analítica web, publicidad comportamental o personalización comercial basada en tu navegación. Calzatura Vilchez no tiene activa esta categoría en la versión actual del sitio. Si en el futuro la incorporamos, te informaremos y solicitaremos consentimiento previo antes de su instalación.",
    required: false,
    active: false,
  },
};

/** Registro público: lenguaje de negocio, sin exponer implementación interna. */
export const COOKIE_REGISTRY: CookieRegistryRow[] = [
  {
    name: "Preferencias de privacidad",
    provider: "Calzatura Vilchez",
    purpose: "Recordar las categorías de cookies que autorizaste.",
    duration: "12 meses",
    category: "essential",
  },
  {
    name: "Preferencias de visualización",
    provider: "Calzatura Vilchez",
    purpose: "Recordar tema claro u oscuro del sitio.",
    duration: "Persistente en tu navegador",
    category: "essential",
  },
  {
    name: "Seguridad de la conexión",
    provider: "Proveedor de alojamiento",
    purpose: "Protección técnica contra tráfico automatizado malicioso.",
    duration: "Sesión o corto plazo",
    category: "essential",
  },
  {
    name: "Sesión de cuenta",
    provider: "Proveedor de autenticación",
    purpose: "Mantener tu sesión iniciada de forma segura.",
    duration: "Hasta cerrar sesión o según configuración del navegador",
    category: "functional",
  },
  {
    name: "Carrito de compras",
    provider: "Calzatura Vilchez",
    purpose: "Conservar los productos que agregaste durante tu visita.",
    duration: "Duración de la visita",
    category: "functional",
  },
  {
    name: "Procesamiento de pago",
    provider: "Proveedor de pagos con tarjeta",
    purpose: "Gestionar el pago cuando eliges tarjeta en el checkout.",
    duration: "Según política del proveedor de pagos",
    category: "functional",
  },
  {
    name: "Verificación de registro",
    provider: "Proveedor de servicios de seguridad",
    purpose: "Validación antiabuso al crear cuenta o consultar identidad.",
    duration: "Según política del proveedor",
    category: "security",
  },
];

export const ACCEPT_ALL_CHOICES: CookieChoices = {
  functional: true,
  security: true,
  analytics: false,
};

export const REJECT_NON_ESSENTIAL_CHOICES: CookieChoices = {
  functional: false,
  security: false,
  analytics: false,
};
