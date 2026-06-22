-- Datos de ejemplo — Calzatura Vilchez (evaluación Q2 2026)
-- CANÓNICO: npm run seed (modulo-adecuacion-funcional-iso25010) — 25 RF Must vía mustRfCatalog.mjs
-- Este SQL es referencia manual; puede estar desactualizado respecto al seed del repositorio.
-- Ejecutar después de schema.postgresql.sql

INSERT INTO qc_evaluaciones (id, codigo, titulo, sistema, periodo, evaluador, fecha_evaluacion, observaciones)
VALUES (
    'a1000000-0000-4000-8000-000000000001',
    'QC-AF-2026-Q2',
    'Evaluación Adecuación Funcional — Release junio 2026',
    'Sistema de Gestión de Calzados Calzatura Vilchez',
    '2026-Q2',
    'Ing. Calidad — Tesis UCV',
    '2026-06-16',
    'Evaluación basada en SRS v1.0, CU-T05 y matriz CU-T07. Indicadores ISO/IEC 25010.'
) ON CONFLICT (codigo) DO NOTHING;

-- Completitud Funcional — RF Must del catálogo e-commerce
INSERT INTO qc_funciones (evaluacion_id, codigo_rf, modulo, nombre, descripcion, requerida, implementada, evidencia) VALUES
('a1000000-0000-4000-8000-000000000001', 'RF-CAT-01', 'Catálogo', 'Listar productos con filtros', 'Filtros por marca, categoría, talla y color', TRUE, TRUE, 'e2e/catalog-filter-marca.spec.ts'),
('a1000000-0000-4000-8000-000000000001', 'RF-CAT-02', 'Catálogo', 'Ficha producto con stock', 'Detalle con talla, color y disponibilidad', TRUE, TRUE, 'e2e/catalog-cart.spec.ts'),
('a1000000-0000-4000-8000-000000000001', 'RF-AUT-01', 'Auth', 'Registro con validación DNI', 'Registro usuario con DNI peruano 8 dígitos', TRUE, TRUE, 'e2e/register-validation.spec.ts'),
('a1000000-0000-4000-8000-000000000001', 'RF-AUT-02', 'Auth', 'Login y logout Firebase', 'Sesión cliente y cierre seguro', TRUE, TRUE, 'e2e/smoke.spec.ts'),
('a1000000-0000-4000-8000-000000000001', 'RF-CAR-01', 'Carrito', 'CRUD carrito talla/color', 'Agregar, editar cantidad y eliminar', TRUE, TRUE, 'e2e/cart-stock-validation.spec.ts'),
('a1000000-0000-4000-8000-000000000001', 'RF-CHK-01', 'Checkout', 'Captura dirección y pago', 'Formulario checkout con métodos de pago', TRUE, TRUE, 'e2e/checkout-cod-order.spec.ts'),
('a1000000-0000-4000-8000-000000000001', 'RF-PED-01', 'Pedidos', 'Crear pedido en Supabase', 'Persistencia atómica con descuento stock', TRUE, TRUE, 'e2e/idoneidad-journey.spec.ts'),
('a1000000-0000-4000-8000-000000000001', 'RF-PAG-01', 'Pagos', 'Stripe Checkout', 'Redirección y confirmación Stripe', TRUE, TRUE, 'e2e/checkout-stripe.spec.ts'),
('a1000000-0000-4000-8000-000000000001', 'RF-ADM-02', 'Admin', 'CRUD productos calzado', 'Alta/edición zapatillas con variantes', TRUE, TRUE, 'e2e/admin-products-filters.spec.ts'),
('a1000000-0000-4000-8000-000000000001', 'RF-ADM-03', 'Admin', 'Stock por talla y color', 'Gestión inventario multi-talla', TRUE, TRUE, 'e2e/admin-stock-tallas.spec.ts'),
('a1000000-0000-4000-8000-000000000001', 'RF-ADM-07', 'Admin', 'Cambio estado pedidos', 'Flujo pendiente → enviado → entregado', TRUE, TRUE, 'e2e/admin-orders.spec.ts'),
('a1000000-0000-4000-8000-000000000001', 'RF-IA-02', 'IA', 'Predicción demanda calzado', 'Modelo FastAPI combinado admin', TRUE, FALSE, 'Pendiente: ampliar dataset temporada escolar')
ON CONFLICT DO NOTHING;

-- Corrección Funcional — transacciones de negocio calzado
INSERT INTO qc_transacciones_funcionales (evaluacion_id, codigo, modulo, descripcion, evaluada, correcta, observaciones) VALUES
('a1000000-0000-4000-8000-000000000001', 'TX-COF-001', 'Checkout', 'Pedido COD talla 42 — total S/ 189.90 con IGV correcto', TRUE, TRUE, NULL),
('a1000000-0000-4000-8000-000000000001', 'TX-COF-002', 'Carrito', 'Bloqueo cantidad > stock sandalia dama talla 37', TRUE, TRUE, NULL),
('a1000000-0000-4000-8000-000000000001', 'TX-COF-003', 'Admin', 'Código único CV-SEED-1 rechazado al duplicar', TRUE, TRUE, NULL),
('a1000000-0000-4000-8000-000000000001', 'TX-COF-004', 'Ventas', 'Venta tienda descuenta stock zapatilla hombre', TRUE, TRUE, NULL),
('a1000000-0000-4000-8000-000000000001', 'TX-COF-005', 'Checkout', 'Stripe webhook confirma pago y marca pedido pagado', TRUE, FALSE, 'Timeout simulado en entorno staging'),
('a1000000-0000-4000-8000-000000000001', 'TX-COF-006', 'Admin', 'Margen mínimo bloqueado en producto outlet', TRUE, TRUE, NULL),
('a1000000-0000-4000-8000-000000000001', 'TX-COF-007', 'Pedidos', 'Restauración stock al cancelar pedido COD', TRUE, TRUE, NULL),
('a1000000-0000-4000-8000-000000000001', 'TX-COF-008', 'Libro reclamaciones', 'Registro hoja virtual Ley 29571', TRUE, TRUE, NULL),
('a1000000-0000-4000-8000-000000000001', 'TX-COF-009', 'IA', 'Predicción riesgo con datos incompletos', TRUE, FALSE, 'Respuesta 422 esperada pero mensaje poco claro'),
('a1000000-0000-4000-8000-000000000001', 'TX-COF-010', 'Favoritos', 'Aislamiento favoritos entre usuarios', TRUE, TRUE, NULL)
ON CONFLICT DO NOTHING;

-- Casos de prueba — TECP (CU-T07 representativos)
INSERT INTO qc_casos_prueba (evaluacion_id, codigo, nombre, modulo, descripcion, ejecutado, aprobado) VALUES
('a1000000-0000-4000-8000-000000000001', 'TC-IDON-001', 'Flujo compra integrador', 'Idoneidad', 'Catálogo → carrito → checkout COD → historial', TRUE, TRUE),
('a1000000-0000-4000-8000-000000000001', 'TC-PREC-001', 'Stock carrito no excede disponible', 'Precisión', 'Producto mock stock=3', TRUE, TRUE),
('a1000000-0000-4000-8000-000000000001', 'TC-SEG-001', 'Rutas admin exigen login', 'Seguridad', '9 rutas /admin/* sin sesión', TRUE, TRUE),
('a1000000-0000-4000-8000-000000000001', 'TC-CMP-001', 'Libro reclamaciones Ley 29571', 'Cumplimiento', 'Página legal plazos 3/15 días', TRUE, TRUE),
('a1000000-0000-4000-8000-000000000001', 'TC-PROD-001', 'Código duplicado bloqueado', 'Admin productos', 'CV-SEED-1 activo', TRUE, TRUE),
('a1000000-0000-4000-8000-000000000001', 'TC-INT-002', 'Stripe createCheckoutSession', 'Interoperabilidad', 'Redirect checkout.stripe.com', TRUE, TRUE),
('a1000000-0000-4000-8000-000000000001', 'TC-DASH-004', 'KPIs dashboard coherentes', 'Admin dashboard', 'Mocks REST 2 productos', TRUE, TRUE),
('a1000000-0000-4000-8000-000000000001', 'TC-AUT-REG-001', 'DNI inválido bloqueado', 'Registro', 'Menos de 8 dígitos', TRUE, TRUE),
('a1000000-0000-4000-8000-000000000001', 'TC-ADM-STOCK-NEW', 'Import Excel tallas EU/US', 'Datos', 'Plantilla importación masiva', TRUE, FALSE),
('a1000000-0000-4000-8000-000000000001', 'TC-MOBILE-01', 'Checkout responsive móvil', 'UX móvil', 'Viewport 390px iPhone', FALSE, NULL)
ON CONFLICT DO NOTHING;
