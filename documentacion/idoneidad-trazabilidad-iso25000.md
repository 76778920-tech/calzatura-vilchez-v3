# Idoneidad funcional — trazabilidad RF Must ↔ pruebas (ISO/IEC 25000 / 9126-1)

**Proyecto:** Calzatura Vilchez  
**Característica:** Funcionalidad · **Subcaracterística:** Idoneidad (9126 §6.1.1)  
**Índice Funcionalidad:** `documentacion/funcionalidad-trazabilidad-iso25000.md`  
**Criterio:** cada requisito funcional **Must** del SRS tiene implementación verificable y al menos un caso de prueba automatizado o acta manual con resultado **Pasado**.

**Fuente SRS:** `documentacion/05-especificacion-requisitos-software-SRS.md`  
**Matriz editable:** `documentacion/cuadros-excel/CU-T07-matriz-pruebas-requisitos.csv`  
**Última revisión:** 2026-06-16  
**Verificación repetible:** `node scripts/verify-idoneidad-iso25000.mjs` (añadir `--run-e2e` para ejecutar Playwright).

## Resumen de cobertura Must

| Módulo | RF Must | Con prueba automatizada | Estado idoneidad |
|--------|---------|-------------------------|------------------|
| Catálogo | RF-CAT-01, RF-CAT-02 | Sí | Cumple |
| Auth / perfil | RF-AUT-01, RF-AUT-02, RF-AUT-03, RF-AUT-04 | Sí | Cumple |
| Carrito / checkout / pedidos | RF-CAR-01, RF-CHK-01, RF-PED-01, RF-PED-03 | Sí | Cumple |
| Pagos | RF-PAG-01, RF-PED-02 | Sí | Cumple |
| Favoritos | RF-FAV-01 | Sí | Cumple |
| Administración | RF-ADM-01 … RF-ADM-08, RF-ADM-11 | Sí (E2E admin) | Cumple |
| Reglas de negocio | RF-RN-01, RF-RN-02 | Sí | Cumple |
| IA / riesgo | RF-IA-01, RF-IA-02, RF-IA-04 | Sí | Cumple |

**Recorrido integrador (flujo de compra Must):** `calzatura-vilchez/e2e/idoneidad-journey.spec.ts` — **TC-IDON-001**.

## Matriz detallada

| RF | Enunciado (resumen) | Evidencia de prueba | Tipo |
|----|---------------------|---------------------|------|
| RF-CAT-01 | Listar productos con filtros | `e2e/catalog-filter-marca.spec.ts` (TC-MARCA-001…004), `e2e/smoke.spec.ts` | E2E |
| RF-CAT-02 | Ficha producto con stock/talla | `e2e/catalog-cart.spec.ts`, `e2e/product-detail-hidden.spec.ts`, TC-IDON-001 | E2E |
| RF-AUT-01 | Registro + validación identidad | `e2e/register-validation.spec.ts` (TC-AUT-REG-001/002), `authCredentialsComplexity.test.ts`, `isoP0SecurityGuards.test.js` | E2E + unit |
| RF-AUT-02 | Login / logout Firebase | `e2e/smoke.spec.ts` (redirect sin sesión), `e2e/profile-save.spec.ts` | E2E |
| RF-AUT-03 | Perfil teléfono | `e2e/profile-save.spec.ts` (TC-PERF-001…005) | E2E |
| RF-AUT-04 | Perfil en Supabase | `e2e/helpers/mockClientAuth.ts` + `mirrorUsersMe` en checkout/idoneidad | E2E |
| RF-CAR-01 | Carrito add/update/remove | `e2e/cart-stock-validation.spec.ts` (TC-CART-001…004), `e2e/catalog-cart.spec.ts` | E2E |
| RF-CHK-01 | Checkout dirección y pago | `e2e/checkout-cod-order.spec.ts` (TC-CHK-01), TC-IDON-001 | E2E |
| RF-PED-01 | Pedido en Supabase vía BFF | `e2e/checkout-cod-order.spec.ts`, `e2e/checkout-stripe.spec.ts`, TC-IDON-001 | E2E |
| RF-PED-02 | Contra entrega | `e2e/checkout-cod-order.spec.ts`, TC-IDON-001 | E2E |
| RF-PED-03 | Historial del cliente | `e2e/idoneidad-journey.spec.ts` (TC-IDON-001) | E2E |
| RF-PAG-01 | Pago Stripe | `e2e/checkout-stripe.spec.ts` (TC-CHK-STRIPE-01) | E2E |
| RF-FAV-01 | Favoritos por cuenta | `e2e/favorites-isolation.spec.ts` (TC-FAV-001) | E2E |
| RF-ADM-01 | Dashboard KPIs | `e2e/admin-dashboard.spec.ts` (TC-DASH-001…005) | E2E |
| RF-ADM-02 | CRUD productos | `e2e/admin-products-filters.spec.ts`, `admin-product-delete.spec.ts` | E2E |
| RF-ADM-03 | Stock por talla | `e2e/admin-stock-tallas.spec.ts`, TC-PROD-008 | E2E |
| RF-ADM-05 | Códigos únicos | `e2e/admin-code-guards.spec.ts` | E2E |
| RF-ADM-06 | Finanzas de producto | `e2e/admin-commercial-guards.spec.ts` (cv_guard_producto_finanzas) | E2E |
| RF-ADM-07 | Estado de pedidos | `e2e/admin-orders.spec.ts` (TC-ORD-001…003) | E2E |
| RF-ADM-08 | Ventas diarias | `e2e/admin-sales.spec.ts` (TC-SALE-001…004) | E2E |
| RF-ADM-11 | Usuarios y roles | `e2e/admin-users.spec.ts` (TC-USR-001…004) | E2E |
| RF-ADM-13 | Campaña en producto | `e2e/admin-campana.spec.ts` | E2E |
| RF-RN-01 | Guardrails BD | `e2e/admin-commercial-guards.spec.ts`, `src/__tests__/variantCreation.test.ts` | E2E + unit |
| RF-RN-02 | RPC atómicos | `e2e/admin-code-guards.spec.ts`, payloads RPC en admin productos | E2E |
| RF-IA-01 | Definición de R (IRE) | `documentacion/07-modulo-ia-riesgo-empresarial.md`, `e2e/admin-ire-dashboard.spec.ts` | Doc + E2E |
| RF-IA-02 | Atributos del modelo | `ai-service/tests/`, `e2e/admin-predictions.spec.ts` | Pytest + E2E |
| RF-IA-04 | Límites y sesgos documentados | `documentacion/07-modulo-ia-riesgo-empresarial.md` §6 | Documental |

## Criterio de cierre al 100 %

Se considera **Idoneidad al 100 %** cuando:

1. Todos los RF **Must** del SRS tienen fila en esta matriz con prueba **Pasada** o evidencia documental cerrada (IA).
2. Existe al menos un **recorrido E2E integrador** del flujo de compra (TC-IDON-001).
3. La matriz CU-T07 se mantiene alineada tras cada release relevante.
4. `node scripts/verify-idoneidad-iso25000.mjs --run-e2e` termina en **VERDE** antes de actualizar el dashboard.

**Brecha residual (Should/Could):** RF-CAT-03 (familias), RF-ADM-04/09/12/14 y RF-IA-03/05 tienen cobertura parcial o documental; no bloquean Idoneidad Must.
