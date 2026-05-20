# Estado de cumplimiento — auditoría técnica (2026-05)

Referencia de cierre de ítems “a medias” / “mal o falta”. Actualizar al cambiar arquitectura.

| Ítem | Estado | Evidencia |
|------|--------|-----------|
| Stripe redirect BFF | Cerrado | `stripeCheckoutRedirect.ts`, BFF `/createCheckoutSession` |
| E2E Stripe (sin tarjeta real) | Cerrado | `e2e/checkout-stripe.spec.ts` (mock sesión) |
| E2E Stripe tarjeta real | Fuera de CI | Prueba manual Stripe Test Mode; ver `docs/05-pruebas/plan-pruebas.md` |
| RLS núcleo pedidos/usuarios | Cerrado | `20260518193000_*`, BFF |
| RLS productos catálogo | Cerrado | `20260518194000_*` (solo activos) |
| RLS favoritos | Cerrado | REVOKE + solo BFF |
| Finanzas anon | Cerrado | `20260518193500_*`, BFF `/admin/productFinanzas` |
| Matriz RLS documentada | Cerrado | `supabase/RLS-MATRIX.md` |
| xlsx CVE | Cerrado | `exceljs` + `utils/spreadsheet.ts`, límite 5 MB |
| Código muerto Stripe session | Cerrado | Eliminado `updateOrderStripeSession` |
| confirmCodOrder | Cerrado | BFF + Functions → HTTP 410 |
| pagado vs confirmado (docs clave) | Cerrado | SRS, API, plan pruebas, diseño BD, casos de uso |
| BPMN pedidos (PR-11–15) | Cerrado | `catalogo-mapas-procesos.md` |
| BPMN PR-01–10 | Cerrado (texto) | `catalogo-mapas-procesos.md` alineado a Supabase/BFF |
| firestore.rules | Legado | Comentario en archivo + negocio en Supabase |
| Dominio trabajadores | Cerrado | Rutas `/staff/*`, BFF `/staff/*`, RLS ventas/finanzas — ver `ISO-CUMPLIMIENTO-INTERNO.md` |
| Endurecimiento ISO trabajador | Cerrado | `20260519140000`, `20260519140100`, endpoints staff/admin separados |
| Matriz ISO interna | Cerrado | `docs/ISO-CUMPLIMIENTO-INTERNO.md` |
| Validación server-side ventas (min/max, activo) | Cerrado | BFF `validateDailySalesRegister` |
| Auditoría ventas tienda | Cerrado | `registrar_venta` / `devolver_venta` en tabla `auditoria` |
| Códigos producto vía BFF (staff) | Cerrado | `/staff/productCodes`, sin SELECT directo en ventas |
| AdminPredictions tamaño | Fase 1 cerrada | `adminPredictionsTypes.ts`; lógica UI en fase 2 (`predictions/REFACTOR.md`) |
| Vitest rutas/predictions | Cerrado | `staffRedirects.test.ts`, `adminPredictionsTypes.test.ts` + services/utils + E2E |
| DNI rate limit global | Cerrado (opt-in) | Upstash REST si `UPSTASH_REDIS_*`; si no, memoria por instancia |
