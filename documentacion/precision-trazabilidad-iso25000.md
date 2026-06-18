# Precisión funcional — trazabilidad y evidencia (ISO/IEC 25010)

**Proyecto:** Calzatura Vilchez  
**Subcaracterística:** Precisión (Funcionalidad · familia ISO/IEC 25000)  
**Criterio:** los cálculos y resultados del sistema (stock, precios, totales, finanzas, predicción IA) son **correctos** y se validan en cliente, BFF y base de datos; con pruebas automatizadas que impiden regresiones.

**Última revisión:** 2026-06-16  
**Verificación repetible:** `node scripts/verify-precision-iso25000.mjs` (añadir `--run-tests` para Vitest + E2E de precisión).

## Dominios de precisión cubiertos

| Dominio | Qué debe ser exacto | Evidencia principal |
|---------|---------------------|---------------------|
| Stock por talla/color | Cantidades no negativas; suma tallaStock coherente | `stock.test.ts`, `adminProductStockCoherence.test.ts`, `e2e/cart-stock-validation.spec.ts` |
| Checkout vs catálogo vivo | Precio/stock del servidor, no del carrito obsoleto | `checkoutStock.test.ts`, `checkout-cod-order.spec.ts`, TC-IDON-001 |
| Pedidos BFF | Subtotal/total recalculados; precios vivos; stock finito | `precisionBffGuards.test.js`, `isoAuditFixesGuards.test.js`, `bff/server.cjs` |
| Variantes de producto | Códigos, tallaStock y stock por color | `variantCreation.test.ts` |
| Reglas comerciales BD | Triggers cv_guard_* rechazan datos inválidos | `commercialGuards.test.ts`, `e2e/admin-commercial-guards.spec.ts` |
| Finanzas y márgenes | calculatePriceRange redondeo y límites | `finance.test.ts`, `financeService.test.ts` |
| Ventas tienda | Cantidad ≤ stock; errores de concurrencia legibles | `adminSalesRegisterLogic.test.ts`, `e2e/admin-sales.spec.ts` |
| Importación Excel | Rechazo NaN y totales inconsistentes | `importRules.test.ts` |
| Predicción / IRE | Sanitización numérica; datos insuficientes enmascarados | `predictionDataQuality.test.ts`, `ai-service/tests/test_safe_limits.py`, `test_risk.py` |

## Criterio de cierre al 100 %

1. Los **9 dominios** anteriores tienen al menos un test automatizado (unit/E2E/guard) en verde.
2. El BFF **no confía** en totales del cliente (`assertStoredTotals`, `assertLivePrices`, `buildOrderDraft`).
3. `node scripts/verify-precision-iso25000.mjs --run-tests` termina en **VERDE** antes de mantener Precisión al 100 % en `dashboard-iso25000/data.json`.

## Brecha residual (no bloquea Precisión Must)

- Pedido `pendiente` creado en cliente antes de validación BFF (ruido de datos si falla validación) — documentado en `docs/security-audit.md` S1.
- Calibración predictiva vs eventos reales de quiebre — condicionada a etiquetado empresarial (`07-modulo-ia-riesgo-empresarial.md`).
