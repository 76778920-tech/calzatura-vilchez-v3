import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";

const repoRoot = path.resolve(process.cwd(), "..");
const outDir = path.resolve(repoRoot, "artifacts", "matrices");
const outFile = path.join(outDir, "Matriz_Registro_Web_Calzatura_Vilchez.xlsx");

fs.mkdirSync(outDir, { recursive: true });

function readJson(file, encoding = "utf8") {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(repoRoot, file), encoding));
  } catch {
    return null;
  }
}

const stress2000 = readJson("artifacts/load-tests/autocannon-home-c2000-20260528-231905.json");
const stress500 = readJson("artifacts/load-tests/summary-500.json");
const stress1000 = readJson("artifacts/load-tests/summary-1000.json");

const workbook = new ExcelJS.Workbook();
workbook.creator = "Codex";
workbook.lastModifiedBy = "Codex";
workbook.created = new Date();
workbook.modified = new Date();
workbook.properties.date1904 = false;

const colors = {
  green: "FFB7E1CD",
  amber: "FFFFE599",
  red: "FFF4CCCC",
  blue: "FFD9EAF7",
  darkBlue: "FF1F4E78",
  gray: "FFE7E6E6",
  white: "FFFFFFFF",
};

function normalizeStatus(value) {
  const text = String(value || "").toUpperCase();
  if (text.includes("ROJO")) return "red";
  if (text.includes("AMBAR") || text.includes("ÁMBAR")) return "amber";
  if (text.includes("VERDE")) return "green";
  return null;
}

function statusFill(value) {
  const key = normalizeStatus(value);
  if (!key) return null;
  return { type: "pattern", pattern: "solid", fgColor: { argb: colors[key] } };
}

function addSheet(name, columns, rows, options = {}) {
  const ws = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { defaultRowHeight: 18 },
  });
  ws.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width ?? 22,
    style: { alignment: { vertical: "top", wrapText: true } },
  }));
  ws.getRow(1).font = { bold: true, color: { argb: colors.white } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.darkBlue } };
  ws.getRow(1).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  ws.getRow(1).height = 24;
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  for (const row of rows) {
    const added = ws.addRow(row);
    for (let i = 1; i <= columns.length; i += 1) {
      const cell = added.getCell(i);
      cell.border = {
        top: { style: "thin", color: { argb: "FFD9D9D9" } },
        left: { style: "thin", color: { argb: "FFD9D9D9" } },
        bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
        right: { style: "thin", color: { argb: "FFD9D9D9" } },
      };
      const fill = statusFill(cell.value);
      if (fill) cell.fill = fill;
    }
  }

  if (options.note) {
    ws.addRow([]);
    const noteRow = ws.addRow([options.note]);
    ws.mergeCells(noteRow.number, 1, noteRow.number, columns.length);
    noteRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.gray } };
    noteRow.getCell(1).font = { italic: true };
  }

  return ws;
}

function metric(json, name, value = "p(95)") {
  return json?.metrics?.[name]?.values?.[value] ?? "";
}

function thresholdOk(json, name) {
  const thresholds = json?.metrics?.[name]?.thresholds;
  if (!thresholds) return "";
  return Object.values(thresholds).every((entry) => entry?.ok === true) ? "Cumple" : "No cumple";
}

const portadaRows = [
  { campo: "Proyecto", valor: "Calzatura Vilchez - apartado web" },
  { campo: "Tipo de matriz", valor: "Matriz de registro, trazabilidad, pruebas, riesgos, APIs, BD, ISO y stress" },
  { campo: "Fecha de emision", valor: "2026-05-29" },
  { campo: "Descripcion general verificable", valor: "Portal web de comercio electronico para Calzatura Vilchez con catalogo, carrito, checkout, pedidos, panel administrativo, ventas fisicas, importacion/exportacion Excel, auditoria, Supabase, BFF, Firebase, Stripe e IA para prediccion/analitica." },
  { campo: "Fuente de descripcion", valor: "README.md, SRS documentacion/05-especificacion-requisitos-software-SRS.md, codigo fuente y pruebas automatizadas del apartado web" },
  { campo: "Alcance", valor: "Web publica, e-commerce, administracion, ventas, pedidos, auditoria, Excel, IA, BFF, Supabase, CI/CD" },
  { campo: "Modulos fuera de matriz", valor: "No se incorporan areas ajenas al alcance web comercial" },
  { campo: "Semaforo", valor: "VERDE = control implementado y con evidencia; AMBAR = funcional con dependencia operativa o evidencia parcial; ROJO = fallo critico abierto" },
  { campo: "Estado global", valor: "VERDE / AMBAR OPERATIVO: hallazgos de codigo cerrados; quedan verificaciones productivas de infraestructura cuando apliquen" },
];

const modules = [
  ["PUB-01", "Publico", "Home / Hero / destacados", "/", "src/domains/publico/pages/HomePage.tsx", "Cliente", "VERDE", "Hero accesible, imagenes con alt, reduced motion, estados de carga/error"],
  ["PUB-02", "Publico", "Libro de reclamaciones", "/libro-reclamaciones", "src/domains/publico/services/libroReclamaciones.ts", "Cliente", "VERDE", "BFF, validaciones y constancia; no usa escritura directa sensible"],
  ["CAT-01", "Catalogo", "Listado de productos", "/productos", "src/domains/productos/pages/ProductsPage.tsx", "Cliente", "VERDE", "Filtros, paginacion/browse, estados vacios, BFF catalogo publico"],
  ["CAT-02", "Catalogo", "ProductCard", "Component", "src/domains/productos/components/ProductCard.tsx", "Cliente", "VERDE", "Links y controles separados; selector de tallas accesible"],
  ["CAT-03", "Catalogo", "Detalle producto", "/producto/:id", "src/domains/productos/pages/ProductDetailPage.tsx", "Cliente", "VERDE", "Revalida producto activo/stock antes de agregar"],
  ["FAV-01", "Favoritos", "Favoritos por cuenta", "/favoritos", "src/domains/favoritos/context/FavoritesContext.tsx", "Cliente", "VERDE", "Aislamiento por usuario y rollback optimista"],
  ["CAR-01", "Carrito", "Carrito lateral y pagina", "/carrito", "src/domains/carrito/context/CartContext.tsx", "Cliente", "VERDE", "SessionStorage, no persistencia por UID en equipos compartidos"],
  ["CHK-01", "Checkout", "Checkout contra entrega", "/checkout", "src/domains/carrito/pages/CheckoutPage.tsx", "Cliente", "VERDE", "Validacion server-side de precio/stock y ubicacion"],
  ["CHK-02", "Checkout", "Checkout Stripe", "/checkout", "bff/server.cjs", "Cliente", "VERDE / AMBAR OPERATIVO", "Flujo seguro; depende de webhook real y secrets en produccion"],
  ["PED-01", "Pedidos cliente", "Pedido exitoso / historial", "/pedido-exitoso/:id", "src/domains/pedidos/pages/OrderSuccessPage.tsx", "Cliente", "VERDE", "No confirma pedido si fetch devuelve null; polling para pago pendiente"],
  ["USR-01", "Usuarios", "Login / registro / perfil", "/login / /registro / /perfil", "src/domains/usuarios", "Cliente/Admin", "VERDE", "DNI/App Check preparado; PII minimizada; perfil validado"],
  ["ADM-01", "Admin", "Dashboard", "/admin", "src/domains/administradores/pages/AdminDashboard.tsx", "Admin", "VERDE", "KPIs, auditoria reciente, errores y reintento"],
  ["ADM-02", "Admin", "Productos", "/admin/productos", "src/domains/productos/pages/AdminProducts.tsx", "Admin", "VERDE", "RPC/BFF, dialogos accesibles, stock/tallas/codigos"],
  ["ADM-03", "Admin", "Pedidos", "/admin/pedidos", "src/domains/administradores/pages/AdminOrders.tsx", "Admin", "VERDE", "Estados por maquina server-side, UI con errores/reintento"],
  ["ADM-04", "Admin", "Ventas fisicas", "/admin/ventas", "src/domains/ventas", "Admin/Trabajador", "VERDE", "Operacion atomica, devolucion con motivo, control financiero por rol"],
  ["ADM-05", "Admin", "Usuarios", "/admin/usuarios", "src/domains/administradores/pages/AdminUsers.tsx", "Admin", "VERDE", "Roles validados server-side; PII enmascarada en tablas"],
  ["ADM-06", "Admin", "Fabricantes", "/admin/fabricantes", "src/domains/administradores/pages/AdminManufacturers.tsx", "Admin", "VERDE", "Dialogo accesible y auditoria sin nombres personales innecesarios"],
  ["ADM-07", "Admin", "Datos Excel", "/admin/datos", "src/domains/administradores/pages/AdminData.tsx", "Admin", "VERDE", "Import/export actualizado a reglas comerciales y sanitizacion spreadsheet"],
  ["IA-01", "IA", "Predicciones / IRE", "/admin/predicciones", "src/domains/administradores/predictions", "Admin", "VERDE / AMBAR GOBIERNO", "Funcional; controles medibles, backtesting y evidencia operativa"],
  ["AUD-01", "Auditoria", "Rastro de auditoria", "/admin/auditoria", "src/services/audit.ts + bff/server.cjs", "Admin", "VERDE", "BFF/service_role, RLS/revoke, PII redactada"],
  ["BFF-01", "BFF/API", "API segura", "Render/BFF", "calzatura-vilchez/bff/server.cjs", "Servidor", "VERDE", "Auth Firebase, roles, fail-closed, service_role solo servidor"],
  ["DB-01", "Supabase", "RLS/RPC/migraciones", "Supabase", "supabase/migrations", "Servidor/BD", "VERDE", "RLS, revoke, RPC admin via BFF/service_role"],
  ["OPS-01", "DevOps", "CI/CD / Produccion", "GitHub Actions", ".github/workflows", "DevOps", "VERDE / AMBAR OPERATIVO", "CI fuerte; deploy y secrets deben mantenerse activos"],
];

const functionalRows = [
  ["RF-001", "Home", "Mostrar marca, promociones y destacados", "Cargar home", "GET catalogo/destacados", "Hero y productos visibles", "HomePage.tsx, HomeHeroSection.tsx", "smoke.spec.ts", "VERDE", "Accesibilidad de carrusel corregida"],
  ["RF-002", "Catalogo", "Buscar, filtrar y navegar productos", "Entrar a /productos", "Query/filtros", "Listado filtrado y navegable", "ProductsPage.tsx", "catalog-filter-marca.spec.ts", "VERDE", "Sin controles anidados invalidos"],
  ["RF-003", "Detalle", "Agregar producto con talla y stock", "Seleccionar talla", "id/talla/cantidad", "Carrito actualizado", "ProductDetailPage.tsx", "cart-stock-validation.spec.ts", "VERDE", "Revalidacion contra producto activo"],
  ["RF-004", "Favoritos", "Guardar favoritos por usuario", "Click favorito", "Firebase token", "Favorito aislado por cuenta", "FavoritesContext.tsx", "favorites-isolation.spec.ts", "VERDE", "Rollback ante error"],
  ["RF-005", "Carrito", "Mantener carrito de sesion", "Agregar producto", "sessionStorage", "Carrito visible sin exponer preferencias por UID", "CartContext.tsx", "catalog-cart.spec.ts", "VERDE", "Privacidad mejorada"],
  ["RF-006", "Checkout COD", "Crear pedido contra entrega", "Confirmar checkout", "items/direccion/contacto", "Pedido creado y stock validado", "CheckoutPage.tsx, server.cjs", "checkout-cod-order.spec.ts", "VERDE", "Idempotency key"],
  ["RF-007", "Checkout Stripe", "Crear pedido y redirigir pago", "Metodo tarjeta", "items + payment method", "Checkout session creada", "server.cjs", "checkout-stripe.spec.ts", "VERDE / AMBAR OPERATIVO", "Requiere webhook Stripe activo en produccion"],
  ["RF-008", "Pedidos", "Ver exito/historial y estado pago", "Abrir pedido", "orderId", "Estado real o error con reintento", "OrderSuccessPage.tsx", "checkout-stripe.spec.ts", "VERDE", "No confirma si order null"],
  ["RF-009", "Admin productos", "CRUD productos, tallas, imagenes y codigos", "Crear/editar/eliminar", "Payload producto", "RPC atomica", "AdminProducts.tsx, adminProductsBff.ts", "admin-products-filters.spec.ts", "VERDE", "Dialogos accesibles"],
  ["RF-010", "Admin ventas", "Registrar venta fisica y devolucion", "Agregar lineas", "producto/talla/cantidad/motivo", "Venta/devolucion atomica", "ventas/services", "admin-sales.spec.ts", "VERDE", "Control de stock y motivo"],
  ["RF-011", "Admin pedidos", "Cambiar estado permitido", "Seleccionar estado", "orderId/estado", "Transicion valida o rechazo", "AdminOrders.tsx, orderStatusPolicy", "admin-orders.spec.ts", "VERDE", "Servidor fuente de verdad"],
  ["RF-012", "Admin usuarios", "Gestionar roles y usuarios", "Cambiar rol", "uid/rol", "Rol actualizado si autorizado", "AdminUsers.tsx, server.cjs", "admin-users.spec.ts", "VERDE", "Admin no puede degradarse accidentalmente"],
  ["RF-013", "Admin fabricantes", "Crear/editar/eliminar marcas/fabricantes", "Formulario admin", "marca/datos", "Fabricante actualizado", "AdminManufacturers.tsx", "admin-manufacturers.spec.ts", "VERDE", "Confirm accesible"],
  ["RF-014", "Excel", "Importar/exportar productos, finanzas y ventas", "Subir/descargar XLSX", "Archivo Excel", "Registros validados o errores claros", "AdminData.tsx, importRules.ts", "admin-data.spec.ts, importRules.test.ts", "VERDE", "Reglas comerciales alineadas"],
  ["RF-015", "IA", "Prediccion, IRE y metricas", "Solicitar prediccion", "ventas/modelo", "Prediccion o estado insuficiente", "predictions", "admin-predictions.spec.ts", "VERDE / AMBAR GOBIERNO", "Gobierno formal debe mantenerse"],
  ["RF-016", "Auditoria", "Registrar acciones relevantes", "Operacion real", "accion/entidad/detalle", "Evento sin PII sensible", "audit.ts, auditPii.cjs", "admin-audit-trail.spec.ts", "VERDE", "BFF/service_role"],
];

const securityRows = [
  ["SEG-001", "Service role Supabase", "Exposicion de clave privilegiada", "SUPABASE_SERVICE_ROLE_KEY", "Solo Render/BFF/Functions; nunca VITE ni frontend", "server.cjs", "ISO 27001 A.5/A.8", "VERDE", "Verificado: frontend usa anon key"],
  ["SEG-002", "DNI", "Consulta abusiva o PII", "DNI", "App Check, proof secret, rate limit, hash/masked", "lookupDni.cjs, server.cjs", "ISO 27001 / ISO 27701", "VERDE OPERATIVO", "Usuario confirmo secrets en Render"],
  ["SEG-003", "Stripe", "Webhook falso marca pedido pagado", "Pedido/pago", "Firma STRIPE_WEBHOOK_SECRET y transiciones server-side", "server.cjs", "ISO 27001", "VERDE / AMBAR OPERATIVO", "Verificar endpoint activo en Stripe Dashboard"],
  ["SEG-004", "Auditoria", "Eventos arbitrarios o PII", "nombres, DNI, email, telefono", "Allowlist rol/accion, BFF, redaccion PII, RLS/revoke", "audit.ts, auditPii.cjs, migrations", "ISO 27001 / ISO 27701", "VERDE", "Historial redacted por migracion"],
  ["SEG-005", "Pedidos", "Stock antes de pago o pago manual indebido", "stock/pago", "Descuento atomico y bloqueo manual Stripe", "server.cjs, orderStatusPolicy", "ISO 25010 integridad", "VERDE", "Estados finales respetados"],
  ["SEG-006", "Supabase cliente", "Escrituras directas sensibles", "productos/ventas/auditoria", "CI anti-regresion y BFF para mutaciones", "supabaseDirectAccessGuard.test.js", "ISO 27001 privilegio minimo", "VERDE", "Guard activo"],
  ["SEG-007", "Perfil", "Cambio identidad sin validacion", "nombres/apellidos/DNI", "Bloqueo si identidad legal requiere lookup", "server.cjs", "ISO 27701 minimizacion", "VERDE", "PII en displayName eliminada"],
  ["SEG-008", "Excel", "Formula injection y datos invalidos", "celdas XLSX", "Sanitizacion y reglas comerciales", "spreadsheet.ts, importRules.ts", "ISO 27001 integridad", "VERDE", "Tests agregados"],
  ["SEG-009", "Cloudinary", "Abuso de upload/signature", "public_id/firma", "Firma BFF admin y limites esperados", "cloudinarySign.cjs", "ISO 27001", "VERDE / AMBAR OPERATIVO", "Cuotas dependen de proveedor"],
  ["SEG-010", "Errores", "Filtrar informacion tecnica", "errores API", "Mensajes controlados y logs servidor", "bffClient.ts, server.cjs", "ISO 25010 seguridad", "VERDE", "E2E cubre RLS/timeout"],
];

const dbRows = [
  ["productos", "Catalogo publico y admin", "Publica solo activos", "BFF/RPC admin", "RLS catalog read", "Si", "VERDE", "Producto activo/colorStock/campana"],
  ["productoFinanzas", "Costos, utilidad, margen", "Admin/BFF", "BFF/RPC", "Revoke anon/authenticated", "Si", "VERDE", "No expuesto a cliente"],
  ["productoCodigos", "Codigos unicos", "No publico", "BFF/RPC", "Revoke lectura publica", "Si", "VERDE", "Unicidad protegida"],
  ["pedidos", "Pedidos ecommerce", "Cliente propio/admin", "BFF", "RLS + BFF service_role", "Si", "VERDE", "Idempotency key"],
  ["pedido_items", "Lineas de pedido", "Cliente propio/admin", "BFF", "RLS", "Si", "VERDE", "Stock atomico"],
  ["usuarios", "Perfil y roles", "Propio/admin limitado", "BFF/admin", "RLS y views enmascaradas", "Si", "VERDE", "DNI hash/masked"],
  ["favoritos", "Favoritos usuario", "Propio", "Cliente/BFF segun flujo", "Aislamiento usuario", "Parcial", "VERDE", "Privacidad por cuenta"],
  ["ventasDiarias", "Ventas tienda fisica", "BFF/admin", "RPC atomica", "Revoke cliente", "Si", "VERDE", "Devolucion con motivo"],
  ["fabricantes", "Marcas/proveedores", "Publico/admin", "BFF/admin", "RLS segun uso", "Si", "VERDE", "Auditoria sin PII personal"],
  ["auditoria", "Rastro de acciones", "Admin via BFF", "BFF/service_role", "RLS + revoke", "Si", "VERDE", "Redaccion en insert"],
  ["modeloEstado", "Estado IA", "Admin/BFF", "service_role", "service_role only", "Si", "VERDE", "Gobierno IA"],
  ["ire_historial", "Historial riesgo empresarial", "Admin", "BFF/IA", "RLS/admin", "Si", "VERDE / AMBAR GOBIERNO", "Evidencia de modelo"],
  ["campanas_detectadas", "Campanas IA/comercial", "Admin", "service_role", "service_role policy", "Si", "VERDE", "Feedback controlado"],
  ["reclamaciones", "Libro de reclamaciones", "Cliente estado propio/BFF", "BFF", "BFF/service_role", "Si", "VERDE", "Ley consumidor"],
];

const apiRows = [
  ["GET", "/health", "Disponibilidad BFF", "Publica controlada", "Rate/security headers", "Ninguna/health", "VERDE", "Usado en carga k6"],
  ["GET", "/public/catalog/active", "Catalogo activo", "Publica", "Cache/BFF, solo activos", "productos", "VERDE", "Cubre catalogo lectura"],
  ["GET", "/public/catalog", "Catalogo paginado", "Publica", "limit/page/filtros", "productos", "VERDE", "Reduce carga"],
  ["GET", "/public/catalog/family-counts", "Badges familias", "Publica", "Solo agregados", "productos", "VERDE", "Sin PII"],
  ["POST", "/orders", "Crear pedido", "Firebase Auth", "Idempotencia, stock/precio server-side", "pedidos, pedido_items, RPC stock", "VERDE", "No confia en clientProduct"],
  ["PATCH", "/orders/:id/status", "Cambiar estado pedido", "Admin/staff", "Maquina estados server-side", "pedidos/RPC stock", "VERDE", "Bloquea pagado manual Stripe"],
  ["POST", "/stripe/webhook", "Confirmar pago Stripe", "Firma Stripe", "raw body + STRIPE_WEBHOOK_SECRET", "pedidos/stock", "VERDE / AMBAR OPERATIVO", "Depende de endpoint activo en Stripe"],
  ["POST", "/lookup-dni", "Consulta DNI", "Firebase + App Check", "Rate limit, proof secret", "usuarios/pending", "VERDE OPERATIVO", "Secrets en Render confirmados por usuario"],
  ["POST", "/audit", "Auditoria controlada", "Firebase Auth + rol/allowlist", "Sanitizacion PII", "auditoria", "VERDE", "BFF service_role"],
  ["GET", "/audit/recent", "Listar auditoria reciente", "Admin", "Rol admin", "auditoria", "VERDE", "No anon"],
  ["POST", "/admin/products", "Crear producto", "Admin", "Reglas comerciales, imagenes, codigos", "productos/RPC", "VERDE", "Atomicidad"],
  ["PATCH", "/admin/products/:id", "Editar producto", "Admin", "Reglas comerciales y coherencia stock", "productos/RPC", "VERDE", "Cache invalidation"],
  ["DELETE", "/admin/products/:id", "Eliminar producto", "Admin", "Dialogo UI + RPC", "productos/RPC", "VERDE", "Auditable"],
  ["POST", "/admin/sales", "Registrar venta fisica", "Admin/trabajador", "Stock/talla/precio", "ventasDiarias/RPC", "VERDE", "Operacion atomica"],
  ["POST", "/admin/data/import", "Importar Excel", "Admin", "Validaciones y sanitizacion", "productos/ventas/finanzas", "VERDE", "Actualizado"],
  ["GET", "/ai/*", "Predicciones/IRE", "Admin/superadmin segun ruta", "Bearer interno, timeout/error", "IA/modelo", "VERDE / AMBAR GOBIERNO", "Controles medibles"],
];

const excelRows = [
  ["XLS-001", "productos.xlsx", "productos", "codigo,nombre,categoria,tipo,precio,stock,tallas,material,estilo,colorStock,activo,descuento,campana,imagen,imagenes", "Categoria/tipo/material/estilo validos; precio/stock positivos; codigos unicos", "Si", "Si", "VERDE", "Plantilla actualizada"],
  ["XLS-002", "producto_finanzas.xlsx", "productoFinanzas", "productId,costo,precio,utilidad,margen", "productId existente; numeros validos", "Si", "Si", "VERDE", "No expone finanzas al cliente"],
  ["XLS-003", "ventas_diarias.xlsx", "ventasDiarias", "productoId,codigo,nombre,color,talla,cantidad,fecha,canal,encargado", "productoId existente; cantidad positiva; fecha valida", "Si", "Si", "VERDE", "Alineado a ventas fisicas"],
  ["XLS-004", "escenario_prueba.zip/xlsx", "productos + finanzas + ventas", "Datos generados", "Reglas comerciales actuales", "Si", "Si", "VERDE", "Genera 3 archivos y limpia finanzas/codigos"],
  ["XLS-005", "export_admin.xlsx", "multiples", "Columnas por entidad", "Sanitizacion contra formulas", "Si", "N/A", "VERDE", "sanitizeSpreadsheetCellValue"],
  ["XLS-006", "errores_importacion", "validacion", "fila,campo,error", "Mensajes claros", "N/A", "Si", "VERDE", "No inserta datos invalidos"],
];

const testRows = [
  ["TST-001", "Unit", "Excel", "Reglas de importacion", "src/__tests__/importRules.test.ts", "npm run test -- importRules.test.ts", "VERDE", "Pasado en validacion previa"],
  ["TST-002", "Unit", "Excel", "Sanitizacion spreadsheet", "src/__tests__/spreadsheet.test.ts", "npm run test -- spreadsheet.test.ts", "VERDE", "Formula injection controlada"],
  ["TST-003", "E2E", "Admin Datos", "Carga y plantilla; borrado con dialogo", "e2e/admin-data.spec.ts", "npm run test:e2e -- e2e/admin-data.spec.ts", "VERDE", "3 casos pasados"],
  ["TST-004", "E2E", "Catalogo", "Card accesible y carrito", "e2e/catalog-cart.spec.ts", "npm run test:e2e -- e2e/catalog-cart.spec.ts", "VERDE", "Teclado y flujo detalle"],
  ["TST-005", "E2E", "Checkout COD", "Crear pedido", "e2e/checkout-cod-order.spec.ts", "npm run test:e2e", "VERDE", "Pedido creado via BFF"],
  ["TST-006", "E2E", "Checkout Stripe", "Redirect a Stripe mock", "e2e/checkout-stripe.spec.ts", "npm run test:e2e", "VERDE", "Mock BFF"],
  ["TST-007", "E2E", "Admin ventas", "Venta/devolucion", "e2e/admin-sales.spec.ts", "npm run test:e2e", "VERDE", "Operacion atomica"],
  ["TST-008", "E2E", "Admin pedidos", "Filtros/estado", "e2e/admin-orders.spec.ts", "npm run test:e2e", "VERDE", "Transiciones"],
  ["TST-009", "E2E", "Admin productos", "CRUD/dialogos", "e2e/admin-product-delete.spec.ts", "npm run test:e2e", "VERDE", "Dialogo accesible"],
  ["TST-010", "E2E", "Admin usuarios", "Roles/errores", "e2e/admin-users.spec.ts", "npm run test:e2e", "VERDE", "RLS y permisos"],
  ["TST-011", "E2E", "Auditoria", "Crear/editar/eliminar registra eventos", "e2e/admin-audit-trail.spec.ts", "npm run test:e2e", "VERDE", "Trazabilidad"],
  ["TST-012", "Unit/Guard", "Supabase", "Bloqueo escrituras directas sensibles", "supabaseDirectAccessGuard.test.js", "npm run test", "VERDE", "Anti-regresion"],
  ["TST-013", "Unit/Guard", "BFF", "Politicas auditoria/secrets", "bffAuditEndpointPolicy.test.js", "npm run test", "VERDE", "Fail closed"],
  ["TST-014", "Typecheck", "Web", "Tipos TypeScript", "tsconfig", "npm run typecheck", "VERDE", "Validado previamente"],
  ["TST-015", "Lint", "Web", "ESLint/Sonar preflight", "eslint.config.js", "npm run lint", "VERDE", "Validado previamente"],
  ["TST-016", "E2E", "Smoke publico", "Home/catalogo/carrito", "e2e/smoke.spec.ts", "npm run test:e2e", "VERDE", "Smoke tienda"],
];

const stressRows = [
  ["STR-001", "Web estatica local", "autocannon-home-c2000", "2000 conexiones concurrentes", "http://127.0.0.1:4173/", `${stress2000?.errors ?? "N/D"} errores; ${stress2000?.non2xx ?? "N/D"} non-2xx; ${stress2000?.requests?.total ?? "N/D"} requests`, `${stress2000?.latency?.average ?? "N/D"} ms avg; ${stress2000?.latency?.p99 ?? "N/D"} ms p99`, "VERDE", "Valida hosting/render local, no pagos ni BD"],
  ["STR-002", "Catalogo/Supabase lectura", "k6 mixed500", "500 VUs lectura mixta", "Supabase/BFF segun config", `p95 catalogo ${metric(stress500, "http_req_duration{name:supabase_catalog_list}")} ms; productos ${stress500?.metrics?.volume_productos_total?.values?.value ?? "N/D"}`, thresholdOk(stress500, "http_req_duration{name:supabase_catalog_list}"), "VERDE / AMBAR", "Latencias cumplen; checks globales incluyen rechazos esperados/seguridad"],
  ["STR-003", "BFF catalogo cache", "k6 mixed1000", "1000 VUs objetivo/script", "BFF catalog active/page", `p95 active ${metric(stress1000, "http_req_duration{name:bff_catalog_active}")} ms`, thresholdOk(stress1000, "http_req_duration{name:bff_catalog_active}"), "VERDE", "Evidencia de BFF catalog cache en artifact"],
  ["STR-004", "Lectura mixta 2000", "read-mixed-2000.js", "2000 VUs script: 1400 catalogo, 350 browse, 200 BFF, 50 hosting", "Staging recomendado", "Script y thresholds definidos", "Pendiente ejecucion productiva autorizada", "AMBAR OPERATIVO", "No ejecutar en produccion sin ventana aprobada"],
  ["STR-005", "Checkout/Pagos", "No destructivo en carga", "N/A", "Stripe/BFF", "No se ejecutan pagos masivos reales", "Requiere sandbox/staging", "AMBAR OPERATIVO", "Por seguridad no se simulan pagos reales en produccion"],
  ["STR-006", "IA", "readAiHealth parcial en k6", "10% de BFF worker", "AI health", "Health incluido si AI_SERVICE_URL configurado", "Depende de servicio IA", "VERDE / AMBAR", "Predicciones masivas requieren escenario dedicado"],
  ["STR-007", "Admin", "E2E funcional", "No stress destructivo", "Admin CRUD", "No se cargan escrituras masivas contra produccion", "Requiere staging", "VERDE / AMBAR", "Correcto por seguridad de datos"],
];

const isoRows = [
  ["Publico/Home", "ISO/IEC 25010", "Usabilidad/accesibilidad", "Hero sin role application, controles navegables, reduced motion", "VERDE", "Mantener E2E smoke"],
  ["Catalogo/ProductCard", "ISO/IEC 25010", "Accesibilidad/compatibilidad", "Controles separados, dialogo tallas accesible", "VERDE", "Guard catalogAccessibility"],
  ["Carrito/Checkout", "ISO/IEC 25010 / 27001", "Integridad transaccional", "BFF valida stock/precio, idempotencia", "VERDE", "Webhook productivo"],
  ["Pedidos/Stripe", "ISO/IEC 27001", "No repudio/integridad", "Firma webhook, maquina estados, auditoria", "VERDE / AMBAR OPERATIVO", "Ver dashboard Stripe"],
  ["Usuarios/DNI", "ISO/IEC 27701", "Minimizacion PII", "DNI hash/masked, App Check, proof secret", "VERDE OPERATIVO", "Secrets Render confirmados"],
  ["Auditoria", "ISO/IEC 27001", "Trazabilidad", "RLS/revoke, BFF service_role, redaccion PII", "VERDE", "Migracion historica"],
  ["Supabase", "ISO/IEC 27001", "Privilegio minimo", "RLS, revoke, RPC admin service_role", "VERDE", "CI anti-regresion"],
  ["Excel", "ISO/IEC 25012", "Calidad de datos", "Reglas comerciales, validacion, formula injection", "VERDE", "Matriz import/export"],
  ["IA", "ISO/IEC 42001 / ISO 25012", "Gobierno de IA y datos", "Backtesting, data quality, IRE, model metrics", "VERDE / AMBAR GOBIERNO", "Formalizar model card si se requiere certificacion"],
  ["DevOps", "ISO/IEC 27001 / 22301", "Continuidad y despliegue", "CI, secrets gate, restore drill, readiness", "VERDE / AMBAR OPERATIVO", "Evidencias productivas periodicas"],
  ["Pruebas", "ISO/IEC/IEEE 29119", "Cobertura y trazabilidad", "Unit, E2E, stress scripts, guards", "VERDE", "Mantener suite en CI"],
];

const findingsRows = [
  ["H-001", "BFF pedidos/Stripe", "clientProduct, stock antes de pago, pago manual Stripe", "Critico", "Eliminado/endurecido", "VERDE", "server.cjs, orderStatusPolicy, tests"],
  ["H-002", "Auditoria", "Eventos arbitrarios y PII", "Alto", "Allowlist, BFF, RLS, redaccion", "VERDE", "audit.ts, auditPii.cjs, migrations"],
  ["H-003", "DNI/PII", "App Check/secrets/identidad legal", "Alto", "Secrets Render, hash/masked, bloqueo cambios", "VERDE OPERATIVO", "server.cjs, lookupDni.cjs"],
  ["H-004", "ProductCard", "HTML interactivo anidado y selector incompleto", "Medio", "Card accesible y dialogo", "VERDE", "ProductCard.tsx, catalog-cart.spec.ts"],
  ["H-005", "Carrito", "localStorage por UID", "Medio", "sessionStorage y guest key", "VERDE", "CartContext.tsx, cartStorageGuards"],
  ["H-006", "Admin ventas/productos", "confirm nativo/dialogos/foco", "Medio", "Dialogos accesibles", "VERDE", "admin-*.spec.ts"],
  ["H-007", "Excel", "Desactualizado frente a reglas comerciales", "Medio", "Plantilla/import/export actualizados", "VERDE", "AdminData.tsx, importRules.ts"],
  ["H-008", "Supabase directo", "Escrituras sensibles desde src", "Alto", "CI anti-regresion", "VERDE", "supabaseDirectAccessGuard.test.js"],
  ["H-009", "IA/DevOps", "Controles solo documentales", "Medio", "Backtest/readiness/restore evidenciables", "VERDE / AMBAR OPERATIVO", "ops-controls, ai-backtest"],
  ["H-010", "Stress", "Capacidad no documentada", "Medio", "Matriz stress y artifacts", "VERDE / AMBAR OPERATIVO", "artifacts/load-tests"],
];

const evidenceRows = [
  ["EV-001", "Commit reciente", "ad24717", "test(web/admin): cover spreadsheet formula sanitization", "Git log", "VERDE"],
  ["EV-002", "Commit reciente", "553c6e8", "feat(web/admin): validacion de reglas comerciales en importacion de Excel", "Git log", "VERDE"],
  ["EV-003", "Stress 2000 local", "artifacts/load-tests/autocannon-home-c2000-20260528-231905.json", "0 errores / 0 non-2xx", "Artifact", "VERDE"],
  ["EV-004", "Stress k6 500", "artifacts/load-tests/summary-500.json", "Latencias catalogo cumplen; checks globales incluyen rechazos esperados", "Artifact", "VERDE / AMBAR"],
  ["EV-005", "Stress k6 1000", "artifacts/load-tests/summary-1000.json", "BFF catalog active p95 bajo threshold", "Artifact", "VERDE"],
  ["EV-006", "Stress 2000 script", "load-tests/scenarios/read-mixed-2000.js", "Escenario definido para 2000 VUs lectura", "Codigo", "AMBAR OPERATIVO"],
  ["EV-007", "CI", ".github/workflows/ci.yml", "Lint/test/typecheck/build/E2E segun workflow", "Workflow", "VERDE"],
  ["EV-008", "Deploy", ".github/workflows/deploy-production.yml", "Gate secrets/CI", "Workflow", "VERDE / AMBAR OPERATIVO"],
  ["EV-009", "RLS", "supabase/migrations", "RLS/revoke/service_role", "Migraciones", "VERDE"],
  ["EV-010", "BFF", "bff/server.cjs", "Fail-closed y secretos servidor", "Codigo", "VERDE"],
];

addSheet("00 Portada", [
  { header: "Campo", key: "campo", width: 28 },
  { header: "Valor", key: "valor", width: 110 },
], portadaRows);

addSheet("01 Inventario Web", [
  { header: "Codigo", key: "codigo", width: 12 },
  { header: "Area", key: "area", width: 18 },
  { header: "Modulo", key: "modulo", width: 32 },
  { header: "Ruta", key: "ruta", width: 26 },
  { header: "Archivo principal", key: "archivo", width: 48 },
  { header: "Usuario", key: "usuario", width: 18 },
  { header: "Estado", key: "estado", width: 22 },
  { header: "Observacion", key: "observacion", width: 70 },
], modules.map(([codigo, area, modulo, ruta, archivo, usuario, estado, observacion]) => ({ codigo, area, modulo, ruta, archivo, usuario, estado, observacion })));

addSheet("02 Matriz Funcional", [
  { header: "Codigo", key: "codigo", width: 12 },
  { header: "Area", key: "area", width: 18 },
  { header: "Requisito", key: "requisito", width: 36 },
  { header: "Flujo", key: "flujo", width: 28 },
  { header: "Entrada", key: "entrada", width: 26 },
  { header: "Salida esperada", key: "salida", width: 34 },
  { header: "Evidencia codigo", key: "codigoEvid", width: 42 },
  { header: "Evidencia prueba", key: "prueba", width: 36 },
  { header: "Estado", key: "estado", width: 20 },
  { header: "Observacion", key: "obs", width: 50 },
], functionalRows.map(([codigo, area, requisito, flujo, entrada, salida, codigoEvid, prueba, estado, obs]) => ({ codigo, area, requisito, flujo, entrada, salida, codigoEvid, prueba, estado, obs })));

addSheet("03 Seguridad Privacidad", [
  { header: "Codigo", key: "codigo", width: 12 },
  { header: "Area", key: "area", width: 22 },
  { header: "Riesgo", key: "riesgo", width: 34 },
  { header: "Dato/activo", key: "dato", width: 24 },
  { header: "Control aplicado", key: "control", width: 48 },
  { header: "Evidencia", key: "evidencia", width: 34 },
  { header: "ISO", key: "iso", width: 26 },
  { header: "Estado", key: "estado", width: 22 },
  { header: "Observacion", key: "obs", width: 54 },
], securityRows.map(([codigo, area, riesgo, dato, control, evidencia, iso, estado, obs]) => ({ codigo, area, riesgo, dato, control, evidencia, iso, estado, obs })));

addSheet("04 Base de Datos", [
  { header: "Tabla/RPC", key: "tabla", width: 24 },
  { header: "Proposito", key: "proposito", width: 36 },
  { header: "Lectura", key: "lectura", width: 28 },
  { header: "Escritura", key: "escritura", width: 28 },
  { header: "RLS/Revoke", key: "rls", width: 28 },
  { header: "BFF/service_role", key: "bff", width: 18 },
  { header: "Estado", key: "estado", width: 22 },
  { header: "Observacion", key: "obs", width: 54 },
], dbRows.map(([tabla, proposito, lectura, escritura, rls, bff, estado, obs]) => ({ tabla, proposito, lectura, escritura, rls, bff, estado, obs })));

addSheet("05 APIs BFF", [
  { header: "Metodo", key: "metodo", width: 10 },
  { header: "Endpoint", key: "endpoint", width: 34 },
  { header: "Uso", key: "uso", width: 32 },
  { header: "Auth", key: "auth", width: 24 },
  { header: "Validaciones", key: "validaciones", width: 44 },
  { header: "Tablas/RPC", key: "tablas", width: 34 },
  { header: "Estado", key: "estado", width: 22 },
  { header: "Evidencia/observacion", key: "obs", width: 52 },
], apiRows.map(([metodo, endpoint, uso, auth, validaciones, tablas, estado, obs]) => ({ metodo, endpoint, uso, auth, validaciones, tablas, estado, obs })));

addSheet("06 Excel Import Export", [
  { header: "Codigo", key: "codigo", width: 12 },
  { header: "Archivo", key: "archivo", width: 28 },
  { header: "Hoja/entidad", key: "hoja", width: 24 },
  { header: "Columnas", key: "columnas", width: 70 },
  { header: "Validaciones", key: "validaciones", width: 54 },
  { header: "Exporta", key: "exporta", width: 12 },
  { header: "Importa", key: "importa", width: 12 },
  { header: "Estado", key: "estado", width: 18 },
  { header: "Observacion", key: "obs", width: 44 },
], excelRows.map(([codigo, archivo, hoja, columnas, validaciones, exporta, importa, estado, obs]) => ({ codigo, archivo, hoja, columnas, validaciones, exporta, importa, estado, obs })));

addSheet("07 Pruebas", [
  { header: "Codigo", key: "codigo", width: 12 },
  { header: "Tipo", key: "tipo", width: 14 },
  { header: "Area", key: "area", width: 22 },
  { header: "Caso", key: "caso", width: 42 },
  { header: "Archivo", key: "archivo", width: 42 },
  { header: "Comando", key: "comando", width: 34 },
  { header: "Estado", key: "estado", width: 18 },
  { header: "Resultado/observacion", key: "obs", width: 52 },
], testRows.map(([codigo, tipo, area, caso, archivo, comando, estado, obs]) => ({ codigo, tipo, area, caso, archivo, comando, estado, obs })));

addSheet("08 Stress Capacidad", [
  { header: "Codigo", key: "codigo", width: 12 },
  { header: "Apartado", key: "apartado", width: 26 },
  { header: "Prueba", key: "prueba", width: 32 },
  { header: "Carga", key: "carga", width: 30 },
  { header: "Objetivo", key: "objetivo", width: 34 },
  { header: "Resultado", key: "resultado", width: 46 },
  { header: "Metrica", key: "metrica", width: 36 },
  { header: "Estado", key: "estado", width: 22 },
  { header: "Alcance/limite", key: "limite", width: 58 },
], stressRows.map(([codigo, apartado, prueba, carga, objetivo, resultado, metrica, estado, limite]) => ({ codigo, apartado, prueba, carga, objetivo, resultado, metrica, estado, limite })));

addSheet("09 Matriz ISO", [
  { header: "Area", key: "area", width: 28 },
  { header: "ISO", key: "iso", width: 28 },
  { header: "Control esperado", key: "control", width: 36 },
  { header: "Evidencia", key: "evidencia", width: 54 },
  { header: "Estado", key: "estado", width: 22 },
  { header: "Accion / riesgo residual", key: "accion", width: 60 },
], isoRows.map(([area, iso, control, evidencia, estado, accion]) => ({ area, iso, control, evidencia, estado, accion })));

addSheet("10 Hallazgos Correcciones", [
  { header: "ID", key: "id", width: 12 },
  { header: "Area", key: "area", width: 24 },
  { header: "Hallazgo", key: "hallazgo", width: 44 },
  { header: "Riesgo", key: "riesgo", width: 16 },
  { header: "Correccion", key: "correccion", width: 44 },
  { header: "Estado", key: "estado", width: 22 },
  { header: "Evidencia", key: "evidencia", width: 52 },
], findingsRows.map(([id, area, hallazgo, riesgo, correccion, estado, evidencia]) => ({ id, area, hallazgo, riesgo, correccion, estado, evidencia })));

addSheet("11 Evidencias", [
  { header: "Codigo", key: "codigo", width: 12 },
  { header: "Tipo", key: "tipo", width: 22 },
  { header: "Referencia", key: "ref", width: 48 },
  { header: "Resultado", key: "resultado", width: 56 },
  { header: "Fuente", key: "fuente", width: 20 },
  { header: "Estado", key: "estado", width: 22 },
], evidenceRows.map(([codigo, tipo, ref, resultado, fuente, estado]) => ({ codigo, tipo, ref, resultado, fuente, estado })));

addSheet("12 Validacion Matriz", [
  { header: "Control", key: "control", width: 40 },
  { header: "Resultado", key: "resultado", width: 80 },
  { header: "Estado", key: "estado", width: 18 },
], [
  { control: "No incluye modulos fuera de alcance comercial web", resultado: "La matriz se limita al sistema web comercial y administrativo", estado: "VERDE" },
  { control: "Incluye stress", resultado: "Hoja 08 documenta artifacts reales y scripts k6", estado: "VERDE" },
  { control: "Incluye Excel import/export", resultado: "Hoja 06 detalla archivos, columnas y validaciones", estado: "VERDE" },
  { control: "Incluye APIs/BFF", resultado: "Hoja 05 detalla endpoints, auth y controles", estado: "VERDE" },
  { control: "Incluye ISO", resultado: "Hoja 09 enlaza areas con ISO 25010, 27001, 27701, 25012, 42001, 22301 y 29119", estado: "VERDE" },
  { control: "Semaforo honesto", resultado: "Los puntos dependientes de infraestructura productiva quedan como VERDE / AMBAR OPERATIVO, no como garantia falsa", estado: "VERDE" },
]);

for (const ws of workbook.worksheets) {
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
    });
  });
}

await workbook.xlsx.writeFile(outFile);
console.log(outFile);
