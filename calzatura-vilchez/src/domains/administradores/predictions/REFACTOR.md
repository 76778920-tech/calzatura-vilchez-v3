# AdminPredictions — refactor pendiente

`adminPredictionsLogic.tsx` (~3100 líneas) y `AdminPredictionsDashboardTabs.tsx` (~1300) concentran la lógica.

**Plan (fase 2, sin cambiar comportamiento):**

1. ~~Extraer `adminPredictionsTypes.ts` (tipos y constantes).~~ Hecho (2026-05).
2. Extraer `adminPredictionsCharts.ts` (cálculos de series).
3. Extraer `adminPredictionsCampaign.ts` (pestaña campañas).
4. Dejar `useAdminPredictionsModel.tsx` como orquestador (<400 líneas).

Mientras tanto, la UI sigue en `AdminPredictions.tsx` (shell) + dashboard; E2E: `e2e/admin-predictions.spec.ts`.
