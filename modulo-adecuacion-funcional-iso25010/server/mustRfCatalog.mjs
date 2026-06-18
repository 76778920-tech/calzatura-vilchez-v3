/**
 * Catálogo RF Must — alineado con scripts/iso25000-must-rf-manifest.mjs (25 RF).
 */
export const MUST_RF_CATALOG = [
  { codigo_rf: "RF-CAT-01", modulo: "Catálogo", nombre: "Listar productos con filtros taxonómicos", evidencia: "e2e/catalog-filter-marca.spec.ts" },
  { codigo_rf: "RF-CAT-02", modulo: "Catálogo", nombre: "Ficha producto con stock talla/color", evidencia: "e2e/catalog-cart.spec.ts" },
  { codigo_rf: "RF-AUT-01", modulo: "Auth", nombre: "Registro usuario validación DNI", evidencia: "e2e/register-validation.spec.ts" },
  { codigo_rf: "RF-AUT-02", modulo: "Auth", nombre: "Login logout Firebase Auth", evidencia: "e2e/smoke.spec.ts" },
  { codigo_rf: "RF-AUT-03", modulo: "Auth", nombre: "Perfil teléfono y direcciones", evidencia: "e2e/profile-save.spec.ts" },
  { codigo_rf: "RF-AUT-04", modulo: "Auth", nombre: "Sincronización perfil Supabase", evidencia: "e2e/idoneidad-journey.spec.ts" },
  { codigo_rf: "RF-CAR-01", modulo: "Carrito", nombre: "CRUD carrito talla/color", evidencia: "e2e/cart-stock-validation.spec.ts" },
  { codigo_rf: "RF-CHK-01", modulo: "Checkout", nombre: "Captura dirección y método de pago", evidencia: "e2e/checkout-cod-order.spec.ts" },
  { codigo_rf: "RF-PED-01", modulo: "Pedidos", nombre: "Crear pedido en Supabase", evidencia: "e2e/idoneidad-journey.spec.ts" },
  { codigo_rf: "RF-PAG-01", modulo: "Pagos", nombre: "Stripe checkout", evidencia: "e2e/checkout-stripe.spec.ts" },
  { codigo_rf: "RF-PED-03", modulo: "Pedidos", nombre: "Historial pedidos cliente", evidencia: "e2e/idoneidad-journey.spec.ts" },
  { codigo_rf: "RF-ADM-01", modulo: "Admin", nombre: "Dashboard indicadores negocio", evidencia: "e2e/admin-dashboard.spec.ts" },
  { codigo_rf: "RF-ADM-02", modulo: "Admin", nombre: "CRUD productos calzado", evidencia: "e2e/admin-products-filters.spec.ts" },
  { codigo_rf: "RF-ADM-03", modulo: "Admin", nombre: "Stock por talla y color", evidencia: "e2e/admin-stock-tallas.spec.ts" },
  { codigo_rf: "RF-ADM-05", modulo: "Admin", nombre: "Códigos únicos producto", evidencia: "e2e/admin-code-guards.spec.ts" },
  { codigo_rf: "RF-ADM-06", modulo: "Admin", nombre: "Finanzas producto costos/márgenes", evidencia: "e2e/admin-commercial-guards.spec.ts" },
  { codigo_rf: "RF-ADM-07", modulo: "Admin", nombre: "Cambio estado pedidos", evidencia: "e2e/admin-orders.spec.ts" },
  { codigo_rf: "RF-ADM-08", modulo: "Admin", nombre: "Ventas diarias y ganancias", evidencia: "e2e/admin-sales.spec.ts" },
  { codigo_rf: "RF-ADM-11", modulo: "Admin", nombre: "Gestión usuarios y roles", evidencia: "e2e/admin-users.spec.ts" },
  { codigo_rf: "RF-FAV-01", modulo: "Favoritos", nombre: "Favoritos por usuario", evidencia: "e2e/favorites-isolation.spec.ts" },
  { codigo_rf: "RF-IA-01", modulo: "IA", nombre: "Definición formal riesgo empresarial", evidencia: "e2e/admin-ire-dashboard.spec.ts" },
  { codigo_rf: "RF-IA-02", modulo: "IA", nombre: "Predicción demanda calzado", evidencia: "e2e/admin-predictions.spec.ts" },
  { codigo_rf: "RF-IA-04", modulo: "IA", nombre: "Límites sesgos y riesgos del modelo", evidencia: "documentacion/07-modulo-ia-riesgo-empresarial.md" },
  { codigo_rf: "RF-RN-01", modulo: "BD", nombre: "Restricciones comerciales en servidor", evidencia: "e2e/admin-commercial-guards.spec.ts" },
  { codigo_rf: "RF-RN-02", modulo: "BD", nombre: "RPC atómicos producto", evidencia: "e2e/admin-code-guards.spec.ts" },
];

export const MUST_RF_COUNT = MUST_RF_CATALOG.length;
