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

export const ADMIN_ROUTES = {
  root: "/admin/*",
  dashboard: "/admin",
  products: "/admin/productos",
  orders: "/admin/pedidos",
  sales: "/admin/ventas",
  users: "/admin/usuarios",
  manufacturers: "/admin/fabricantes",
  predictions: "/admin/predicciones",
  data: "/admin/datos",
} as const;

export const ROUTE_GROUPS = {
  publico: PUBLIC_ROUTES,
  informacion: INFO_ROUTES,
  clientes: CLIENT_ROUTES,
  administradores: ADMIN_ROUTES,
} as const;
