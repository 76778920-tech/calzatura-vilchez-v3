# AI Service — Documentación técnica

## Qué hace el motor

Detecta automáticamente campañas comerciales analizando ventas diarias con:

- **Uplift ajustado por día de semana (DOW)**: compara ventas recientes contra el
  promedio histórico por día de la semana, evitando falsos positivos en días de
  menor actividad habitual.
- **Z-score**: mide cuántas desviaciones estándar están las ventas recientes sobre
  la media baseline.
- **Consistencia**: requiere al menos `MIN_CONSISTENT_DAYS` días consecutivos
  con ventas elevadas para confirmar campaña.
- **Detección focalizada**: si el global no supera el umbral pero una categoría
  o producto sí lo hace, se detecta `scope=focalizada`.

---

## Campos clave de la respuesta

| Campo | Tipo | Significado |
|-------|------|-------------|
| `campaign_detected` | bool | `True` si hay campaña activa |
| `nivel` | str | `normal`, `observando`, `baja`, `media`, `alta` |
| `scope` | str\|None | `global`, `focalizada`, o `None` |
| `foco_tipo` | str\|None | `global`, `categoria`, `producto` |
| `foco_nombre` | str\|None | Nombre de la categoría o producto focal |
| `foco_uplift` | float\|None | Uplift del foco específico |
| `estado` | str | Estado del ciclo de vida en DB (ver abajo) |
| `riesgo_stock` | bool | `True` si hay productos sin stock o stock crítico en campaña activa |
| `impacto_estimado_soles` | float | Soles extra globales sobre baseline |
| `impacto_estimado_soles_focalizado` | float | Soles extra del foco (categoría/producto) |
| `top_productos[i].impacto_soles` | float | Soles extra de ese producto |
| `categorias_afectadas[i].impacto_soles` | float | Soles extra de esa categoría |

---

## Ciclo de vida de campaña (`estado`)

```
         ┌─────────────────────────────────────────────┐
         │                                             │
[inicio] → [activa] ⇄ [en_riesgo_stock] → [finalizando] → [finalizada]
                                                   ↘ [descartada]  (admin)
```

| Estado | Cuándo ocurre |
|--------|--------------|
| `inicio` | Nueva campaña detectada, sin riesgo de stock |
| `en_riesgo_stock` | Nueva campaña con stock crítico, o transición desde activa |
| `activa` | Campaña confirmada con stock OK |
| `finalizando` | Primera detección de ventas normales después de campaña activa |
| `finalizada` | Segunda detección normal consecutiva, o `cierre_estado=finalizada` |
| `descartada` | Admin descarta manualmente desde el panel |

La lógica vive en `main.py`:

- `decide_next_state(result, last, today_iso, metricas)` — función pura, devuelve un dict de decisión sin tocar BD.
- `apply_state_transition(decision, result)` — ejecuta los efectos DB y muta `result`.
- `_advance_state(...)` — wrapper fino: llama a ambas en secuencia.

---

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/predict/campaign-detection` | Bearer | Detecta campaña, persiste evento y avanza estado |
| GET | `/api/campaign/active` | Bearer | Campaña activa + últimas 10 del historial |
| POST | `/api/campaign/feedback` | Bearer | Admin confirma, descarta o añade nota |
| GET | `/api/predict/combined` | Bearer | Demanda + ingresos + IRE en una sola llamada |
| GET | `/api/predict/stock-alert` | Bearer | Productos en riesgo de agotarse |
| GET | `/api/ire/historial` | Bearer | Historial de IRE (últimos N días) |
| POST | `/api/cache/invalidate` | Bearer | Fuerza recarga de datos desde Supabase |

### Autenticación

Todas las rutas (excepto `/` y `/api/health`) requieren:

```
Authorization: Bearer <AI_SERVICE_BEARER_TOKEN>
```

El token se configura en Render como variable de entorno `AI_SERVICE_BEARER_TOKEN`.

### Probar desde terminal

```bash
TOKEN="cv_ai_v3_..."
BASE="https://calzatura-vilchez-v3.onrender.com"

# Salud
curl "$BASE/api/health"

# Detección de campaña
curl -H "Authorization: Bearer $TOKEN" \
     "$BASE/api/predict/campaign-detection?recent_days=7&baseline_days=60"

# Campaña activa
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/campaign/active"

# Feedback (confirmar)
curl -X POST -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"campana_id":1,"accion":"confirmar"}' \
     "$BASE/api/campaign/feedback"
```

---

## Variables de entorno (Render)

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | Sí | Service role key (no la anon key) |
| `AI_SERVICE_BEARER_TOKEN` | Sí | Token secreto para autenticar llamadas del frontend |
| `PORT` | No | Puerto (Render lo inyecta automáticamente) |
| `ALLOWED_ORIGINS` | No | Orígenes CORS adicionales, separados por coma |

---

## Migraciones Supabase

Las migraciones están en SQL puro y se aplican via MCP o Supabase CLI.

### Rollback manual de la tabla de campañas

```sql
-- Elimina las tablas del modelo de campaña (irreversible)
DROP TABLE IF EXISTS campana_metricas_diarias CASCADE;
DROP TABLE IF EXISTS campana_productos CASCADE;
DROP TABLE IF EXISTS campana_feedback CASCADE;
DROP TABLE IF EXISTS campanas_detectadas CASCADE;
```

### Tablas principales

| Tabla | Propósito |
|-------|-----------|
| `campanas_detectadas` | Una fila por campaña detectada |
| `campana_productos` | Top productos de cada campaña (snapshot diario) |
| `campana_metricas_diarias` | Uplift/ventas por día de campaña |
| `campana_feedback` | Historial de acciones del admin |

---

## Tests

```bash
cd ai-service
python -m pytest -v                          # todos los tests
python -m pytest tests/test_state_machine.py # solo máquina de estados
python -m pytest tests/test_campaign.py      # solo detector
```

Suite actual: **219 tests, 0 fallos**.

### Estructura de tests de la máquina de estados

- `TestNuevaCampana` — nueva campaña `last=None`
- `TestTransicionesConRiesgo` — transiciones `riesgo_stock` en campaña existente
- `TestCierreCampana` — cierre gradual (`finalizando → finalizada`)
- `TestDecideNextState` — prueba `decide_next_state` directamente, sin mocks (función pura)
