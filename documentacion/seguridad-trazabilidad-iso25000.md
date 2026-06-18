# Seguridad funcional — trazabilidad y evidencia (ISO/IEC 25010)

**Proyecto:** Calzatura Vilchez  
**Subcaracterística:** Confidencialidad, Integridad, Autenticidad, Responsabilidad, No repudio (**Seguridad** · ISO/IEC 25010 · característica de primer nivel)  
**Marco:** calidad del **producto software** (SQuaRE 25010), **no** SGSI ISO/IEC 27001.

**Criterio 25010 (resumen):** el software protege información y datos de modo que cada actor tenga solo el acceso autorizado (confidencialidad, integridad, autenticidad, trazabilidad).

**Última revisión:** 2026-06-16  
**Verificación repetible:** `node scripts/verify-seguridad-iso25000.mjs` (añadir `--run-tests` para RLS + Vitest + E2E + ZAP guard).

## Dimensiones 25010 → evidencia

| Dimensión 25010 | Qué exige | Evidencia principal |
|-----------------|-----------|---------------------|
| Confidencialidad | Solo lectura autorizada | RLS + `validate-supabase-rls-matrix.mjs`, `bff/privacy.cjs`, `bffPrivacy.test.ts`, enmascaramiento DNI/email |
| Integridad | Sin mutaciones no autorizadas | `supabaseDirectAccessGuard.test.js`, triggers `cv_guard_*`, BFF `assertStoredTotals` / `precisionBffGuards` |
| Autenticidad | Identidad verificable | Firebase Auth, `verifyIdToken` BFF, App Check DNI, roles en `usuarios` |
| Trazabilidad / Responsabilidad | Acciones registradas | `auditoria`, `isoP0SecurityGuards.test.js`, `admin-audit-trail.spec.ts` |
| **No repudio** | Imposibilidad de negar una acción o evento | Tabla `auditoria`, trigger `trg_audit_pedido_insert`, webhook Stripe firmado + `logAuditFn` (`source: stripe_webhook`), idempotencia `idempotencyKey` |
| Control de acceso (RNF-SEG-01) | Rutas restringidas sin sesión | `e2e/seguridad-access-guards.spec.ts` (TC-SEG-001…003), `accessControl.test.ts` |
| Secretos (RNF-SEG-02) | 0 credenciales en Git/bundle | `vite.config.ts` guard bearer IA, Gitleaks CI, `isoP0SecurityGuards` |
| Superficie HTTP | Headers y CSP | `firebase.json`, `securityHostingHeaders.guard.test.js`, BFF headers en `isoP0SecurityGuards` |
| Abuso / rate limit | Límites por superficie | `securitySurfaces.guard.test.js`, `publicRateLimit.cjs`, `securityMonitor.cjs` |
| DAST producción | Sin altas/críticas abiertas | `zap-production-report-v2.json`, `securityZapProduction.guard.test.js`, `seguridad-riesgos-residuales-dast.md` |

## Matriz de casos de prueba

| Caso | Requisito | Prueba | Tipo |
|------|-----------|--------|------|
| TC-SEG-001 | RNF-SEG-01 — rutas `/admin/*` | `e2e/seguridad-access-guards.spec.ts` | E2E |
| TC-SEG-002 | RNF-SEG-01 — rutas `/staff/*` | `e2e/seguridad-access-guards.spec.ts` | E2E |
| TC-SEG-003 | Rutas cliente autenticadas | `e2e/seguridad-access-guards.spec.ts` | E2E |
| TC-SEG-004 | BFF admin fail-closed | `isoP0SecurityGuards.test.js`, `bffAuditEndpointPolicy.test.js` | Vitest guard |
| TC-SEG-005 | ZAP prod sin altas + residuales documentados | `securityZapProduction.guard.test.js` | Vitest guard |
| TC-AUT-REG-001 | Validación identidad registro | `e2e/register-validation.spec.ts` | E2E |
| TC-AUD-001 | No repudio — auditoría admin | `e2e/admin-audit-trail.spec.ts` | E2E |
| TC-ORD-IDEM | No repudio — idempotencia pedido | `checkout-cod-order.spec.ts`, `bff/server.cjs` | E2E + BFF |
| PT-RLS-01 | Contrato RLS migraciones | `scripts/validate-supabase-rls-matrix.mjs` | Script |

## No repudio (ISO/IEC 25010)

El producto cumple **no repudio operativo** mediante evidencia verificable en tres capas:

1. **Auditoría persistente:** tabla `auditoria` + BFF `POST /audit` con allowlist y redacción PII.
2. **Eventos de pedido automáticos:** trigger `trg_audit_pedido_insert` (`20260503100000_audit_pedidos_trigger.sql`) en cada INSERT en `pedidos`.
3. **Pagos no repudiables vía tercero de confianza:** webhook Stripe con firma (`STRIPE_WEBHOOK_SECRET`) + `logAuditFn` con `source: stripe_webhook` al confirmar `pagado`.
4. **Idempotencia:** `idempotencyKey` en BFF/Cloud Functions evita duplicar pedidos ante reintentos.
5. **Firma PKCS#7 (no repudio criptográfico):** `functions/orderNonRepudiation.cjs` firma un payload canónico del pedido (SHA-256 + SignedData PKCS#7) y persiste `nrPkcs7Signature` en `pedidos`. Se re-firma en creación, pago Stripe y cambio de estado. Verificación: `GET /admin/verifyOrderNonRepudiation?orderId=…`.

Claves de producción (Render secrets): `ORDER_NR_PRIVATE_KEY_PEM` + `ORDER_NR_CERT_PEM` (generar con `node scripts/generate-order-nr-keypair.mjs`).

## Criterio de cierre al 100 %

1. Las **9 dimensiones** anteriores tienen archivos de evidencia presentes.
2. `node scripts/validate-supabase-rls-matrix.mjs` en verde.
3. `node scripts/verify-seguridad-iso25000.mjs --run-tests` termina en **VERDE**.
4. Riesgos DAST medios restantes solo los de `seguridad-riesgos-residuales-dast.md`.

## Brecha residual (no bloquea cierre Seguridad 25010)

- Checklist operativo Render/Stripe remoto (`docs/ops/checklist-verde-seguridad-produccion.md`) es manual post-deploy.
- E2E no ejecutan ZAP contra producción en cada CI (evidencia ZAP es snapshot versionado).

## Referencia cruzada (opcional tesis)

Algunos guards citan controles ISO/IEC 27001 como **mapeo ilustrativo**; la evaluación del dashboard sigue **ISO/IEC 25010** producto.
