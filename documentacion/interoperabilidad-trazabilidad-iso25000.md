# Interoperabilidad funcional — trazabilidad y evidencia (ISO/IEC 25010)

**Proyecto:** Calzatura Vilchez  
**Subcaracterística:** Interoperabilidad (**Compatibilidad** · ISO/IEC 25010 · familia SQuaRE 25000)  
**Criterio:** cada integración externa del sistema (auth, datos, pagos, IA, geocodificación, identidad, CDN, caché) tiene **contrato verificable**, prueba automatizada y documentación de frontera API.

**Última revisión:** 2026-06-16  
**Verificación repetible:** `node scripts/verify-interoperabilidad-iso25000.mjs` (añadir `--run-tests` para Vitest + E2E + RLS + Functions + Pytest contrato IA).

## Dominios de integración cubiertos

| # | Integración | Frontera / protocolo | Evidencia principal |
|---|-------------|----------------------|---------------------|
| 1 | Firebase Auth | JWT ID token → BFF y servicio IA | `bffClient.test.ts`, `e2e/profile-save.spec.ts`, `ai-service/tests/test_firebase_verifier.py` |
| 2 | Supabase PostgREST + RLS | Lectura anon; mutaciones vía BFF/RPC | `supabaseDirectAccessGuard.test.js`, `scripts/validate-supabase-rls-matrix.mjs`, `e2e/checkout-cod-order.spec.ts` |
| 3 | BFF Node (Render) | REST HTTPS: pedidos, perfil, catálogo, entrega | `interoperabilityBffGuards.test.js`, `bffOrderStatusPolicy.test.js`, TC-INT-001 |
| 4 | Stripe Checkout + webhook | `createCheckoutSession` + Cloud Functions | `checkout-stripe.spec.ts`, `functions/__tests__/stripeLegacyGuards.test.js`, TC-INT-002 |
| 5 | Servicio IA FastAPI | `/api/predict/*`, `/api/ire/*`, Bearer/Firebase | `interoperabilityAiClientGuard.test.ts`, `ai-service/tests/test_api_contract.py`, `e2e/admin-predictions.spec.ts`, TC-INT-003 |
| 6 | Geocodificación / rutas | BFF `/delivery/*` (Nominatim, ORS, Google, OSRM) | `deliveryOpenRouteErrors.test.ts`, `deliveryGeocodeHousenumber.test.ts`, `bff/delivery.cjs` |
| 7 | API DNI (APISPERU) | BFF `POST /lookup-dni` + App Check | `bffAuditEndpointPolicy.test.js`, `e2e/register-validation.spec.ts`, TC-INT-004 |
| 8 | Cloudinary CDN | URLs públicas + firma upload admin | `imageAssetsIntegrity.test.js`, `interoperabilityCloudinarySign.test.js` |
| 9 | Upstash (caché / rate limit) | Catálogo público BFF + límites por superficie | `securitySurfaces.guard.test.js`, `catalogCache.cjs`, `publicRateLimit.cjs` |

## Matriz detallada

| Caso | Integración | Prueba | Tipo |
|------|-------------|--------|------|
| TC-INT-001 | BFF ↔ Supabase (pedido COD) | `e2e/checkout-cod-order.spec.ts` | E2E |
| TC-INT-002 | BFF ↔ Stripe Checkout | `e2e/checkout-stripe.spec.ts` | E2E |
| TC-INT-003 | Frontend ↔ Servicio IA | `e2e/admin-predictions.spec.ts` (TC-PRED-002) | E2E |
| TC-INT-004 | BFF ↔ APISPERU DNI | `e2e/register-validation.spec.ts` (TC-AUT-REG-002) | E2E |
| TC-INT-005 | Firebase ↔ Supabase perfil | `e2e/profile-save.spec.ts` (TC-PERF-001) | E2E |
| PT-INT-04 | IA ↔ Supabase datos | `ai-service/tests/test_supabase_client.py` | Pytest |
| PT-INT-03 | Stripe webhook ↔ stock RPC | `functions/__tests__/orderStockRpc.test.js` | Vitest (functions) |

## Criterio de cierre al 100 %

1. Los **9 dominios** tienen archivos de evidencia presentes y guards/contratos en verde.
2. El contrato RLS Supabase pasa `node scripts/validate-supabase-rls-matrix.mjs`.
3. `node scripts/verify-interoperabilidad-iso25000.mjs --run-tests` termina en **VERDE** antes de mantener Interoperabilidad al 100 % en `dashboard-iso25000/data.json`.

## Brecha residual (no bloquea 100 % interoperabilidad Must)

- E2E mockean servicios externos en CI (no golpean Stripe/APISPERU/Render reales) — contrato validado por mocks + guards estáticos + Pytest contrato IA.
- App móvil Flutter consume las mismas APIs pero no tiene suite E2E en este gate web (documentado en `docs/03-sdd/arquitectura-sistema.md`).
