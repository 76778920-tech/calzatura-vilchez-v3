# BFF — Despliegue en Render

**Proyecto:** Calzatura Vilchez  
**Componente:** Backend-for-Frontend (BFF) — `calzatura-vilchez/bff/server.cjs`  
**Plataforma:** [Render.com](https://render.com) · Web Service (Node.js)  
**ISO ref:** ISO/IEC 9126-1 Portabilidad — Cumplimiento ítem 5 ("Despliegue BFF Render documentado")  
**Última revisión:** 2026-06-26

---

## 1. Resumen del servicio

El BFF actúa como proxy intermedio entre el frontend SPA (Firebase Hosting) y los servicios backend (Supabase, Firebase Functions, servicio IA en Render). Evita exponer claves de servidor al cliente y aplica rate-limiting, caché Upstash y seguridad de cabeceras.

| Parámetro | Valor |
|-----------|-------|
| Runtime | Node.js 20 |
| Entrypoint | `calzatura-vilchez/bff/server.cjs` |
| Puerto | `process.env.PORT` (Render lo inyecta; local `3001`) |
| Health check | `GET /health` → `{"status":"ok"}` |

---

## 2. Variables de entorno requeridas

Configurar en **Render → Environment → Secret Files / Environment Variables**:

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto HTTP (Render lo inyecta automáticamente) |
| `STRIPE_SECRET_KEY` | Clave secreta Stripe (sk_live_…) |
| `STRIPE_WEBHOOK_SECRET` | Secreto webhook Stripe (whsec_…) |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service-role Supabase |
| `AI_SERVICE_URL` | URL del servicio IA en Render (https://…) |
| `AI_SERVICE_BEARER_TOKEN` | Token Bearer para el servicio IA |
| `UPSTASH_REDIS_REST_URL` | URL REST de Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Token Upstash Redis |
| `FIREBASE_PROJECT_ID` | ID del proyecto Firebase |
| `ALLOWED_ORIGINS` | Orígenes CORS (ej. `https://calzaturavilchez-ab17f.web.app`) |

---

## 3. Configuración del Web Service en Render

1. **New Web Service** → conectar repositorio GitHub `calzatura-vilchez-v3`.
2. **Root Directory**: `calzatura-vilchez/bff`
3. **Build Command**: `npm ci`
4. **Start Command**: `node server.cjs`
5. **Instance Type**: Free (o Starter para ≥ 512 MB RAM).
6. **Health Check Path**: `/health`
7. Añadir todas las variables de entorno del §2.

> El despliegue se activa automáticamente desde `.github/workflows/deploy-production.yml`
> (job `deploy-bff`) tras CI Integration verde en rama `main`.

---

## 4. Verificación post-despliegue

```bash
# Health check
curl https://<bff-slug>.onrender.com/health
# → {"status":"ok","uptime":…}

# Catálogo público (sin auth)
curl https://<bff-slug>.onrender.com/public/catalog/products?limit=3
# → {"products":[…]}
```

---

## 5. CI/CD pipeline

```
push → main
  └─ ci-integration.yml  (tests + build)
       └─ deploy-production.yml
            ├─ Firebase Hosting (SPA)
            └─ Render deploy hook (BFF)  ← render_deploy_hook_url secret
```

El deploy hook de Render se configura como secret `RENDER_DEPLOY_HOOK_URL` en GitHub Actions.

---

## 6. Estructura de carpetas del BFF

```
calzatura-vilchez/bff/
  server.cjs          ← entrypoint principal
  package.json        ← dependencias (express, @upstash/redis, stripe…)
  .env.example        ← plantilla de variables de entorno
```

---

## 7. Referencia normativa

Esta documentación cierra el ítem 5 de la lista de cotejo "Cumplimiento de la Portabilidad" (ISO/IEC 9126-1 §6.6 / SQuaRE 25000). Complementa `documentacion/09-implementacion-despliegue-ci.md` §5 y el `docker-compose.yml` (entorno local equivalente).
