# 09 — Implementación, despliegue y automatización (CI/CD)

## 1. Stack tecnológico verificado (2026)

| Capa | Tecnología | Versión (referencia) |
|------|------------|----------------------|
| Runtime | Node.js | Ver CI / local |
| Framework UI | React | `package.json` |
| Build | Vite | `package.json` |
| Lenguaje | TypeScript | estricto proyecto |
| Datos | Supabase (@supabase/supabase-js) | `package.json` |
| Auth / hosting | Firebase (auth, app hosting) | `package.json` |
| Pagos | Stripe | `@stripe/stripe-js` |
| Tests | Vitest, Playwright | `package.json` |

## 2. Estructura de repositorio (alto nivel)

```
Cazatura Vilchez V3/
  estado_del_arte.md          # Corpus Q1
  documentacion/              # Este paquete ISO/tesis
  calzatura-vilchez/          # SPA + migraciones Supabase
    src/
    supabase/migrations/
    e2e/
  ai-service/                   # Servicio IA (si aplica al despliegue)
```

## 3. Variables de entorno (solo nombres)

Documentar en `.env.example` si existe; **nunca** valores reales en Markdown.

| Variable | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | URL proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima |
| `VITE_*` | Otras configuraciones front |

Firebase: configuración en `src/firebase/config.ts` (claves públicas de cliente).

## 4. Migraciones de base de datos

- Ubicación: `calzatura-vilchez/supabase/migrations/`.  
- Orden cronológico por prefijo `YYYYMMDDHHMMSS_*.sql`.  
- Procedimiento de aplicación: Supabase CLI `db push` o SQL Editor.  
- **Checklist pre-producción:** duplicados códigos resueltos antes de índice único.

## 5. Scripts NPM relevantes

| Script | Comando | Propósito |
|--------|---------|-----------|
| Calidad | `npm run quality` | test + lint + typecheck + build |
| Tests unit | `npm run test` | Vitest |
| E2E | `npm run test:e2e` | Playwright |

## 6. Integración continua (CI)

### 6.1 Estado — GitHub Actions (activo)

| Archivo | Disparadores | Pasos resumidos |
|---------|--------------|-----------------|
| `.github/workflows/ci.yml` | `push` y `pull_request` a `main` | `actions/checkout`, Node 20, `npm ci` en `calzatura-vilchez/`, `npm test`, `npm run typecheck`, `npm run build` con secretos `VITE_*` inyectados. |

Evidencia: pestaña **Actions** del repositorio remoto; filas detalladas con **dos respaldos** normativos en `cuadros-excel/CU-T08-automatizacion-respaldos.csv`.

### 6.2 Tabla de automatización y **dos respaldos** mínimos

**Archivo maestro:** `cuadros-excel/CU-T08-automatizacion-respaldos.csv` (incluye filas CI + calidad local + E2E + migraciones + lint).

## 7. Despliegue

### 7.1 Frontend

- Build: `npm run build` → artefacto estático.  
- Hosting: Firebase Hosting u otro; documentar **proyecto** y **pasos** en anexo operativo.

### 7.2 Supabase

- Proyecto dev/staging/prod separados recomendados.  
- Rotación de claves: procedimiento en `10-operacion-y-seguridad.md`.

### 7.3 Servicio IA

- Docker / cloud — puertos, variables, healthcheck.

## 8. Historial de versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2026-05-01 | Versión inicial. |
| 1.1 | 2026-05-02 | CI GitHub Actions documentado; CU-T08 actualizado con jobs reales. |
