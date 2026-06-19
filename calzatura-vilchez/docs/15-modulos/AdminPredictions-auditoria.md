# Auditoría del módulo AdminPredictions

| Campo | Valor |
|---|---|
| Módulo | AdminPredictions (`src/domains/administradores/pages/AdminPredictions.tsx`) |
| Requisito relacionado | RF administración — panel de predicciones IA |
| Fecha de auditoría | 2026-05-03 |
| Commit base | `4f6ce4c` (rama `main`) |
| Auditado por | Revisión interna + análisis estático + E2E |

---

## Alcance del módulo

Panel de predicciones de demanda usando el servicio IA externo (Render). Llama a `/api/predict/combined` con timeout de 45 s, maneja AbortError (cold start), errores de sesión y fallos genéricos. Muestra tabla de predicciones por producto con estado de stock, tendencia, días hasta agotarse, importancia de features (Random Forest) y gráficos de proyección semanal. Incluye asistente de chat (`PromptInputBox`) y botones de Reintentar.

Ruta de acceso al servicio IA: `aiAdminFetch` → **directo** (`VITE_AI_SERVICE_URL` + Firebase ID token) o **proxy** (`VITE_AI_ADMIN_PROXY_URL` → Cloud Function/BFF `aiAdminProxy`). Sin `VITE_AI_SERVICE_BEARER_TOKEN` en el bundle (Option B; `vite.config.ts` lo rechaza). La ruta está cargada con `lazy()` en App.tsx para no inflar el bundle inicial.

Contrato e intercambiabilidad: `docs/04-api/api-referencia.md` §2.0 · `npm run ops:verify-intercambiabilidad`.

---

## Fuentes de datos

| Fetch | Destino | Fallo si cae |
|---|---|---|
| `fetchAI("/api/predict/combined")` | Servicio IA en Render | `pred-error-card` con mensaje + Reintentar |
| `aiAdminFetch` | Proxy BFF o directo | Error descrito por `describeAIError` |

---

## Hallazgos y estado

### PR-01 — Sin E2E del panel IA (A5)

**Severidad:** Media (cobertura)

**Antes:** No había ningún test E2E del módulo de predicciones.

**Después:**
- Nuevo spec `e2e/admin-predictions.spec.ts` mockeando el servicio IA:

| ID | Descripción | Estado |
|---|---|---|
| TC-PRED-001 | AbortError (timeout 45 s) muestra mensaje de cold start + botón Reintentar | ✅ |
| TC-PRED-002 | Respuesta exitosa renderiza al menos una fila de predicción en la tabla | ✅ |

**Estado:** ✅ Cerrado

---

### PR-02 — Sin informe de módulo (A8)

**Severidad:** Baja (documentación)

**Antes:** No existía `AdminPredictions-auditoria.md`.

**Después:** Este documento.

**Estado:** ✅ Cerrado

---

## Riesgos aceptados (no corregidos en este sprint)

| Riesgo | Descripción | Recomendación |
|---|---|---|
| Auth IA (A1) | **Cerrado (Option B):** el web admin envía Firebase ID token; el build rechaza `VITE_AI_SERVICE_BEARER_TOKEN`. Alternativa proxy: `VITE_AI_ADMIN_PROXY_URL`. | Mantener alineado con `api-referencia.md` §1.1 y gate `ops:verify-intercambiabilidad`. |
| Mantenibilidad (A6) | El componente supera las 2 400 líneas: predicciones, chat, gráficos, importancia de features, drift. | Principal deuda técnica del admin. Extraer `PredictionTable`, `PredictionDetailModal` y `AIChatPanel` como componentes separados cuando haya capacidad. |
| Cold start de Render (A7) | El plan gratuito de Render puede tardar 20–30 s en cold start. El timeout de 45 s mitiga el bloqueo, pero no elimina la espera del usuario. | Monitorizar en Render Dashboard; considerar plan de pago o warm-up periódico si el uso lo justifica. |
| Cobertura E2E parcial (A5) | Los tests mockean el servicio IA con JSON mínimo. No se prueban el chat, los filtros de predicción ni el scroll de detalle. | Ampliar cuando se tenga mock estable del contrato JSON de `/api/predict/combined`. |
