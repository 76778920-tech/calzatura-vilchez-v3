export const PUBLIC_ROUTES = {
  home: "/",
  products: "/productos",
  productDetail: "/producto/:id",
  stores: "/tiendas",
  cart: "/carrito",
  login: "/login",
  register: "/registro",
  verifyEmail: "/verificar-correo",
} as const;

export const INFO_ROUTES = {
  corporativoQuienesSomos: "/corporativo/quienes-somos",
  corporativoNuestraHistoria: "/corporativo/nuestra-historia",
  corporativoMundoVilchez: "/corporativo/mundo-vilchez",
  tesisIso25001: "/tesis/iso-25001-calidad",
  legalTerminos: "/legal/terminos-condiciones",
  legalPrivacidad: "/legal/politica-privacidad",
  legalLibroReclamaciones: "/legal/libro-reclamaciones",
  ayudaContacto: "/ayuda/contactanos",
  ayudaRastreoPedido: "/ayuda/rastreo-pedido",
  ayudaPreguntasFrecuentes: "/ayuda/preguntas-frecuentes",
  ayudaCambios: "/ayuda/cambios-devoluciones",
  beneficiosClubVilchez: "/beneficios/club-vilchez",
  beneficiosCuotas: "/beneficios/cuotas-sin-intereses",
} as const;

export const CLIENT_ROUTES = {
  checkout: "/checkout",
  orderSuccess: "/pedido-exitoso/:id",
  orderHistory: "/mis-pedidos",
  profile: "/perfil",
  favorites: "/favoritos",
} as const;

function ensureLeadingSlash(raw: string): string {
  const trimmed = raw.replace(/^\/+/, "");
  return `/${trimmed}`;
}

const _AP = ensureLeadingSlash(import.meta.env.VITE_ADMIN_PATH ?? "/admin");

export const ADMIN_ROUTES = {
  root: `${_AP}/*`,
  dashboard: _AP,
  products: `${_AP}/productos`,
  orders: `${_AP}/pedidos`,
  sales: `${_AP}/ventas`,
  users: `${_AP}/usuarios`,
  manufacturers: `${_AP}/fabricantes`,
  predictions: `${_AP}/predicciones`,
  data: `${_AP}/datos`,
} as const;

const _SP = ensureLeadingSlash(import.meta.env.VITE_STAFF_PATH ?? "/staff");

/** Panel operativo tienda (rol trabajador). */
export const STAFF_ROUTES = {
  root: `${_SP}/*`,
  home: _SP,
  orders: `${_SP}/pedidos`,
  sales: `${_SP}/ventas`,
} as const;

export const ROUTE_GROUPS = {
  publico: PUBLIC_ROUTES,
  informacion: INFO_ROUTES,
  clientes: CLIENT_ROUTES,
  administradores: ADMIN_ROUTES,
  trabajadores: STAFF_ROUTES,
} as const;
