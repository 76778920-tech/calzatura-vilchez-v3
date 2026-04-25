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
  clientes: CLIENT_ROUTES,
  administradores: ADMIN_ROUTES,
} as const;
