# Pruebas de carga y estrés (lectura) — Calzatura Vilchez

Suite **k6** para validar que el sistema aguanta **hasta 2.000 usuarios concurrentes** en **lecturas** (catálogo Supabase, detalle, BFF, hosting), alineado con **RNF-CAP-02**.

## Requisito previo

Instalar [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/):

```powershell
choco install k6
# o: winget install k6 --source winget
```

## Configuración

1. Copia `load-tests/config.env.example` → `load-tests/config.env`
2. Rellena `SUPABASE_URL` y `SUPABASE_ANON_KEY` (**preferir proyecto staging**, no producción con clientes reales).
3. Opcional: `BFF_BASE_URL`, `HOSTING_URL`, `AI_SERVICE_URL`

## Ejecución (Windows)

Desde la raíz del repo:

```powershell
.\scripts\run-load-test.ps1 -Scenario smoke
.\scripts\run-load-test.ps1 -Scenario catalog
.\scripts\run-load-test.ps1 -Scenario mixed1000
.\scripts\run-load-test.ps1 -Scenario mixed1000 -StartLocalBff
.\scripts\run-load-test.ps1 -Scenario mixed2000
```

O manualmente:

```powershell
$env:LOAD_ENV = "staging"
$env:SUPABASE_URL = "https://..."
$env:SUPABASE_ANON_KEY = "..."
k6 run load-tests/scenarios/smoke-read.js
```

## Escenarios

| Script | VUs pico | Qué mide |
|--------|----------|----------|
| `smoke-read.js` | 20 | Scripts OK, credenciales, latencia base |
| `read-catalog-stress.js` | 1400 (default) | Catálogo BFF (`/public/catalog/*`) + detalle Supabase |
| `read-mixed-1000.js` | 1000 total | Meta prioridad 1: catálogo BFF caché + lecturas auxiliares |
| `read-mixed-500.js` | 500 total | Mix lectura (BFF catálogo + Supabase meta) |
| `read-mixed-2000.js` | 2000 total | Mix 70/17.5/10/2.5 % catálogo / browse / BFF / hosting |

### Lecturas simuladas (igual que el frontend)

- `GET {BFF}/public/catalog/active` — catálogo activo (caché Upstash, como `fetchPublicProducts`)
- `GET {BFF}/public/catalog?page=&limit=` — catálogo paginado
- `GET {BFF}/public/catalog/family-counts` — badges de familia
- `GET /rest/v1/productos?...` — fallback si no hay `BFF_BASE_URL`
- Detalle por `id`, conteos `id,familiaId`, destacados
- `GET {BFF}/health`, `GET {BFF}/delivery/quote`
- `GET {HOSTING}/`

**No incluye** (fase siguiente): checkout autenticado, POST pedidos, panel admin con token Firebase.

## Meta RNF-CAP-02 (criterios de éxito)

| Métrica | Umbral en scripts |
|---------|-------------------|
| Errores HTTP (5xx / fallos check) | &lt; 2 % |
| p95 catálogo listado | &lt; 3 s |
| p95 detalle producto | &lt; 2,5 s |
| p95 BFF health | &lt; 1,5 s |

Si no se cumple: revisar plan Supabase, índices, caché BFF, réplicas Render (ver documentación § RNF-CAP-02).

## Seguridad

- Por defecto **bloquea** URLs de producción (`web.app`, `onrender.com`, `supabase.co`) salvo `ALLOW_PROD_LOAD=true`.
- No ejecutar `mixed2000` contra producción en horario comercial sin autorización.
- Los 429 en `/delivery/quote` indican **rate limit** (diseño), no necesariamente caída del sistema.
- Para **carga BFF catálogo** sin falsos 429: `npm run load:mixed1000:bff` (BFF local + `LOAD_TEST_TOKEN` + misma BD Supabase). En Render remoto, definir `LOAD_TEST_TOKEN` solo en ventana aprobada.

## Evidencias

Los reportes JSON se guardan en `artifacts/load-tests/` (gitignored salvo `.gitkeep`).

## Fases recomendadas

1. `npm run load:smoke` — validar credenciales  
2. `npm run load:mixed500` — 500 VUs lectura mixta (~8 min con ramp 2m+5m+1m)  
3. `npm run load:mixed1000` — 1.000 VUs; p95 catálogo BFF &lt; 2 s, errores &lt; 1 %  
3. Subir a `catalog` 1000 → 1400 VUs solo catálogo  
4. `mixed2000` con `npm run load:mixed2000:bff` (BFF local + LOAD_TEST_TOKEN; catálogo vía `/public/catalog/active`)  

## Interpretar resultados (500 VUs — ejecución real)

| Lectura | Resultado típico |
|---------|------------------|
| Catálogo listado/detalle Supabase | Debe mantener p95 &lt; 3–4 s |
| Catálogo paginado | Requiere columnas `imagen` (no `imagenUrl`) |
| `productoFinanzas` anon | **403 esperado** (seguridad, no fallo) |
| `/delivery/quote` masivo | Muchos **429** desde una IP (rate limit BFF) |
| Volumen datos (setup) | Gauges `volume_*` en consola k6 |

Con pocos productos (~40) el sistema puede aguantar 500 lectores; con miles de filas hará falta **paginación + caché** antes de repetir la prueba.
