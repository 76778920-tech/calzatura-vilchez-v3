# Mantenibilidad — trazabilidad y evidencia (ISO/IEC 9126-1 / familia 25000)

**Proyecto:** Calzatura Vilchez  
**Característica:** Mantenibilidad  
**Subcaracterísticas:** Analizabilidad · Cambiabilidad · Estabilidad · Pruebabilidad · Cumplimiento de mantenibilidad  

**Última revisión:** 2026-06-19  
**Gate:** `npm run ops:verify-mantenibilidad:ci`

---

## 1. Analizabilidad (100 %)

| N° | Indicador | Evidencia |
|----|-----------|-----------|
| 1 | SonarQube Cloud | `sonar-project.properties`, workflow `sonarqube.yml` |
| 2 | ESLint 0 errores | `calzatura-vilchez/eslint-report.json` |
| 3 | ESLint 0 warnings | idem |
| 4 | Issues críticos resueltos | SonarCloud QG passing |
| 5 | Deuda técnica visible | `docs/SONAR_SEGUIMIENTO.md`, `docs/TECH-DEBT-BACKLOG.md` |

**Medida ISO 25023 (MAn):** diagnóstico de fallos vía análisis estático automatizado.

---

## 2. Cambiabilidad (100 %)

**Arquitectura:** `calzatura-vilchez/src/domains/` — 11 dominios con README por área.

**Matriz de impacto localizado (MMd-2 — modifiability capability):**

| Dominio | Cambio típico | Archivos acotados | Regresión |
|---------|---------------|-------------------|-----------|
| `carrito` | Checkout COD/Stripe | `domains/carrito/pages/checkout/*`, `bff/server.cjs` createOrder | `checkout-cod-order.spec.ts`, `checkoutStock.test.ts` |
| `pedidos` | Estado de pedido | `domains/pedidos/services/orders.ts`, `bff/server.cjs` updateOrderStatus | `admin-orders.spec.ts`, `orderUtils.test.ts` |
| `productos` | Catálogo/filtros | `domains/productos/utils/*`, `shared/catalogPublicFilter.ts` | `catalog-cart.spec.ts`, `catalogUtils.test.ts` |
| `ventas` | Registro venta diaria | `domains/ventas/*`, BFF `/admin/dailySales` | `admin-sales.spec.ts`, `finance.test.ts` |
| `administradores` | Panel IA | `domains/administradores/predictions/*` | `admin-predictions.spec.ts`, `adminDashboardMetrics.test.ts` |
| `clientes` | Favoritos | `domains/clientes/services/favorites.ts` | `favorites.test.ts`, `favorites-isolation.spec.ts` |
| `usuarios` | Perfil/roles | `domains/usuarios/services/users.ts` | `usersService.test.ts`, `profile-save.spec.ts` |

**Rutas:** `src/routes/paths.ts` — único registro de paths públicos, cliente y admin.

**BFF:** endpoints agrupados por dominio en `bff/server.cjs` (pedidos, ventas, catálogo, favoritos, admin).

---

## 3. Estabilidad (100 %)

| N° | Indicador | Evidencia |
|----|-----------|-----------|
| 1 | ≥ 34 specs E2E | 37 archivos, 132 tests Chromium |
| 2 | Vitest en CI | `.github/workflows/ci.yml` → `npm test` |
| 3 | Regresión pre-merge | `on: pull_request` + push `main` |
| 4 | Sin flaky críticos | CI verde run `74275c8` |
| 5 | Smoke en PR | `npm run test:e2e:smoke` en PR; suite completa en push `main` |

---

## 4. Pruebabilidad (100 %)

**Umbrales Vitest** (scope `vitest.config.ts` — utils/services/security/routes):

| Métrica | Umbral | Evidencia CI |
|---------|--------|--------------|
| Líneas | ≥ 60 % | Job Vitest Coverage |
| Funciones | ≥ 60 % | idem |
| Ramas | ≥ 50 % | idem |

**Medida ISO 25023 MTe-2:** code coverage sobre elementos estructurales del scope declarado.

**Dominios críticos con tests dedicados:**

| Dominio | Unit / guard | E2E |
|---------|--------------|-----|
| carrito | `checkoutStock.test.ts`, `checkoutDireccionValidation.test.ts` | `checkout-cod-order.spec.ts`, `checkout-stripe.spec.ts` |
| pedidos | `orderUtils.test.ts`, `bffOrderStatusPolicy.test.js` | `admin-orders.spec.ts` |
| productos | `catalogUtils.test.ts`, `productsPageCatalogModel.test.ts` | `catalog-cart.spec.ts` |
| ventas | `finance.test.ts`, `adminSalesRegisterLogic.test.ts` | `admin-sales.spec.ts` |
| administradores | `adminDashboardMetrics.test.ts` | `admin-predictions.spec.ts`, `admin-smoke.spec.ts` |

**Mocks/fixtures (MTe-3 testable dependency):**

| Integración | Mock / fixture |
|-------------|----------------|
| Supabase | `src/__tests__/setup.ts` |
| Firebase Auth | `e2e/helpers/mockFirebaseAuth.ts`, `mockClientAuth.ts` |
| BFF admin | `e2e/helpers/mockAdminBff.ts`, `mirrorAdminDataRoutes.ts` |
| Servicio IA | `e2e/helpers/mockAdminAI.ts` |
| Checkout | `e2e/helpers/checkoutTestUtils.ts` |

---

## 5. Cumplimiento de la mantenibilidad (100 %)

| N° | Indicador | Evidencia |
|----|-----------|-----------|
| 1 | Sonar QG | `sonarqube.yml` success |
| 2 | Política CI PR→main | Workflows `ci.yml`, `sonarqube.yml` en PR |
| 3 | CODEOWNERS | `.github/CODEOWNERS` |
| 4 | Docs por release | `CHANGELOG.md`, `documentacion/13-checklist-cierre-defensa.md` |
| 5 | Deuda triaged | `docs/TECH-DEBT-BACKLOG.md` |

---

## Verificación reproducible

```bash
npm run ops:verify-mantenibilidad -- --run-coverage
npm run ops:verify-mantenibilidad:ci
cd calzatura-vilchez && npm run test:e2e:smoke
```
