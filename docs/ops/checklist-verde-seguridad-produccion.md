# Checklist verde — seguridad en producción (~15 min)

Marca cada casilla tras verificar. Referencia de diseño: `calzatura-vilchez/supabase/RLS-MATRIX.md`, `bff/env.example`.

**Proyecto Supabase (ref):** `jdmcvsddnshukkcnzghq`  
**Web:** https://calzaturavilchez-ab17f.web.app  
**BFF:** URL en `VITE_BACKEND_API_URL` (Render)

---

## A. GitHub — evidencia CI (punto 10)

- [ ] **Actions → CI** en el último commit de `main`: jobs en success (lint, typecheck, unit, migraciones RLS).
- [ ] **Actions → CI Integration**: E2E y `supabase-remote-parity` en success (solo en `main`).
- [ ] **Actions → SonarQube Analysis**: success (si falló por HTTP 503, usar *Re-run failed jobs*).
- [ ] **Actions → Security — DevSecOps Gates**: success.

```bash
# Local (opcional, antes de push)
cd calzatura-vilchez
npm run lint && npm run typecheck && npm test
cd ..
node scripts/validate-supabase-migrations.mjs
node scripts/validate-supabase-rls-matrix.mjs
```

---

## B. Supabase remoto — RLS + PII + linter (puntos 6 y 7, capa DB)

Requiere CLI enlazado (`npx supabase login` + `npx supabase link --project-ref jdmcvsddnshukkcnzghq`).

- [ ] Migraciones locales = remotas:

```bash
cd calzatura-vilchez
npx supabase migration list
# Columnas Local y Remote alineadas hasta 20260531210000 (como mínimo)
```

- [ ] Aplicar pendientes:

```bash
npm run db:push
```

Migraciones de seguridad recientes (si faltan en Remote):

| Timestamp | Archivo |
|-----------|---------|
| 20260529140000 | `harden_anon_authenticated_data_plane.sql` |
| 20260530150000 | `auditoria_pii_enforce_at_insert.sql` |
| 20260531120000 | `fix_usuarios_seguro_security_invoker.sql` |
| 20260531200000 | `supabase_security_linter_remediation.sql` |
| 20260531210000 | `rls_service_role_policies_no_client.sql` |

- [ ] **Studio → Database → Security → Refresh**: 0 Errors, 0 Warnings, 0 Info (o solo lo acordado).

- [ ] Prueba rápida anon (SQL Editor, rol simulado o API con anon key del proyecto):

```sql
-- Debe fallar (permiso denegado o 0 filas por RLS)
INSERT INTO pedidos (id, "userId", estado, total) VALUES ('test-lint', 'x', 'pendiente', 1);
SELECT email, dni FROM usuarios LIMIT 1;
```

- [ ] Auditoría sin correo completo en filas nuevas:

```sql
SELECT "usuarioEmail", left("entidadNombre", 40), detalle
FROM auditoria
ORDER BY "realizadoEn" DESC
LIMIT 5;
-- Esperado: usuarioEmail tipo xx***@dominio; sin emails completos en detalle
```

---

## C. Render — BFF (puntos 1, 2, 3, 8, 9)

Servicio BFF en [dashboard.render.com](https://dashboard.render.com) → **Environment**.

### Obligatorios (sin ellos el BFF no arranca en prod — punto 9)

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — **solo aquí, nunca en Firebase/VITE**
- [ ] `DNI_LOOKUP_PROOF_SECRET` — valor largo aleatorio (no vacío)
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `AI_SERVICE_URL` + `AI_SERVICE_BEARER_TOKEN`
- [ ] `FIREBASE_WEB_API_KEY`
- [ ] Credencial Firebase Admin (`FIREBASE_SERVICE_ACCOUNT_JSON_BASE64` o equivalente)

### App Check DNI (punto 2)

En Render, con `RENDER=true`, App Check y proof secret se exigen aunque no pongas `REQUIRE_DNI_APPCHECK=true`.

- [ ] BFF desplegado y badge **Live**
- [ ] `GET https://<TU_BFF>/health` → `200` y cuerpo `ok`

```bash
curl -sS "https://TU_BFF_URL/health"
```

- [ ] `GET https://<TU_BFF>/health/security` → JSON (sin secretos en claro)

### Admin en servidor (punto 8)

- [ ] Sin token: `GET https://<TU_BFF>/admin/orders` → `401`
- [ ] Con token de cliente (no admin): → `403`

---

## D. Firebase / build web (punto 1 y proxy IA)

GitHub → **Settings → Secrets and variables → Actions** (deploy exige estos secrets).

- [ ] `VITE_SUPABASE_ANON_KEY` — sí en build
- [ ] **No** existe `VITE_SUPABASE_SERVICE_ROLE_KEY` ni similar en secrets de hosting
- [ ] `VITE_BACKEND_API_URL` → URL del BFF en Render
- [ ] `VITE_FIREBASE_APPCHECK_SITE_KEY` — definido para producción
- [ ] `VITE_AI_ADMIN_PROXY_URL` definido; **no** usar `VITE_AI_SERVICE_BEARER_TOKEN` en producción (el build lo rechaza)

Ver también: `calzatura-vilchez/docs/operaciones-credenciales.md`

---

## E. Stripe (punto 4)

Dashboard → [Stripe Webhooks](https://dashboard.stripe.com/webhooks)

- [ ] Endpoint: `POST https://<TU_BFF_URL>/stripeWebhook` (ruta exacta, sin barra final extra)
- [ ] Eventos mínimos: `checkout.session.completed`, `payment_intent.succeeded` (los que usa el BFF)
- [ ] **Signing secret** copiado a Render → `STRIPE_WEBHOOK_SECRET` (mismo valor)

Pruebas:

```bash
# Sin firma → debe ser 400 (no 500)
curl -sS -o /dev/null -w "%{http_code}\n" -X POST "https://TU_BFF_URL/stripeWebhook" -H "Content-Type: application/json" -d "{}"
```

- [ ] En Stripe: *Send test webhook* → respuesta **2xx** en el dashboard
- [ ] Logs Render del BFF sin errores de firma tras evento real de prueba

---

## F. Código + CI ya cubierto (solo confirmar una vez)

| Punto | Dónde está |
|-------|------------|
| 6 — sin mutaciones en `src` | `src/__tests__/supabaseDirectAccessGuard.test.js` |
| 6 — contrato RLS | `scripts/validate-supabase-rls-matrix.mjs` |
| 7 — PII auditoría | `bff/auditPii.cjs`, migración `20260530150000_*` |
| 7 — pedidos/usuarios enmascarados | `bff/privacy.cjs` |
| 8 — roles admin | `assertAdminRole` en `bff/server.cjs` |
| 9 — fail-closed | `validateProductionRuntimeConfig` → `process.exit(1)` |

---

## G. Resumen final

| Área | Listo |
|------|-------|
| A — CI / Sonar | ☐ |
| B — Supabase `db push` + Security vacío | ☐ |
| C — Render BFF secrets + health | ☐ |
| D — Firebase secrets (anon, App Check, sin service_role) | ☐ |
| E — Stripe webhook + secret | ☐ |

**Verde operativo** = todas las filas de la tabla G marcadas.

Si algo falla en B, ver `docs/ops/post-deploy-supabase-migrations.md` y `calzatura-vilchez/supabase/README.md` (`migration repair`).
