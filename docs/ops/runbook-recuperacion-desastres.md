# Runbook — recuperación ante desastres (DR)

**Proyecto:** Calzatura Vilchez  
**Alcance:** Supabase (datos), Firebase (auth/hosting), BFF Render, servicio IA, Stripe  
**RTO objetivo:** ≤ 60 min · **RPO objetivo:** ≤ 24 h (PITR Supabase)

---

## 1. Activación

| Severidad | Síntoma | Acción inmediata |
|-----------|---------|------------------|
| P1 | Supabase inaccesible o datos corruptos | §2 Restauración BD |
| P1 | BFF caído > 15 min | §3 BFF Render |
| P2 | Firebase Hosting no sirve SPA | §4 Hosting |
| P2 | Servicio IA caído | §5 IA FastAPI |
| P3 | Stripe webhooks fallando | §6 Pagos |

**Owner:** DevOps / responsable técnico tesis.  
**Comunicación:** notificar admin comercial; modo mantenimiento en checkout si aplica.

---

## 2. Restauración base de datos (Supabase)

1. Confirmar incidente en [Supabase Status](https://status.supabase.com/) y dashboard del proyecto `jdmcvsddnshukkcnzghq`.
2. **No escribir** en producción hasta decidir PITR vs branch restore.
3. Crear **branch efímera** o restaurar PITR al punto anterior al incidente (consola Supabase → Database → Backups).
4. Validar esquema: `cd calzatura-vilchez && npx supabase migration list` (local vs remoto).
5. Validar lecturas críticas: `productos`, `pedidos`, `ventas_diarias`, `ireHistorial`.
6. Si branch OK → promover o re-apuntar BFF `SUPABASE_URL` según procedimiento acordado.
7. Registrar evidencia en `docs/ops/restore-drill-evidence.template.json` y validar:

```bash
node scripts/restore-drill-check.mjs --evidence docs/ops/restore-drill-evidence.json --output artifacts/restore-drill/summary.json
```

**Rollback:** eliminar branch efímera; producción sin cambios si no se enrutó tráfico.

---

## 3. BFF (Render)

1. Dashboard Render → servicio BFF → último deploy exitoso → **Rollback**.
2. Verificar `GET /health` y `GET /public/catalog/active`.
3. Revisar secrets: `SUPABASE_*`, `STRIPE_*`, `UPSTASH_*`, `FIREBASE_*`.
4. Logs: errores 5xx post-restore.

---

## 4. Firebase Hosting

1. `firebase hosting:channel:list` / consola → último release estable.
2. Rollback a versión anterior si build corrupto.
3. Verificar headers en `firebase.json` y carga de `index.html`.

---

## 5. Servicio IA

1. Render o Docker según entorno; revisar `VITE_AI_SERVICE_URL` en frontend.
2. `GET /health` del servicio IA.
3. Panel admin predicciones debe mostrar warnings si datos insuficientes (no fallo silencioso).

---

## 6. Stripe

1. Dashboard Stripe → Webhooks → reintentos fallidos.
2. Verificar `STRIPE_WEBHOOK_SECRET` en BFF coincide con endpoint producción.
3. Idempotencia: pedidos ya `pagado` no deben duplicar stock (webhook reintento).

---

## 7. Verificación post-recuperación

- [ ] Catálogo público carga (< 3 s p95 en smoke manual).
- [ ] Login Firebase + checkout COD de prueba.
- [ ] Admin pedidos lista y transición de estado permitida.
- [ ] Restore drill check en VERDE.
- [ ] `node scripts/verify-recuperacion-iso25000.mjs` en VERDE.

---

## 8. Evidencia y mejora continua

| Artefacto | Ubicación |
|-----------|-----------|
| Plantilla evidencia restore | `docs/ops/restore-drill-evidence.template.json` |
| Fixture CI | `docs/ops/restore-drill-evidence.ci.json` |
| Gate restore | `scripts/restore-drill-check.mjs` |
| Gate recuperación ISO | `scripts/verify-recuperacion-iso25000.mjs` |

**Frecuencia recomendada:** drill de restauración trimestral en staging/branch efímera; actualizar evidencia real y archivar en `artifacts/restore-drill/`.
