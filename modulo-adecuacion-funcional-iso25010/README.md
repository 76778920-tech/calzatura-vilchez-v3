# Módulo de Evaluación — Adecuación Funcional (ISO/IEC 25010)

Sistema de medición de calidad para **Calzatura Vilchez** (e-commerce de calzado). Implementa la característica **Adecuación Funcional** con tres indicadores medibles y trazables.

## Indicadores

| Indicador | Fórmula ISO | Tabla |
|-----------|-------------|-------|
| **CF** Completitud Funcional | `(Funciones implementadas / Funciones requeridas) × 100` | `qc_funciones` |
| **COF** Corrección Funcional | `(Transacciones correctas / Transacciones evaluadas) × 100` | `qc_transacciones_funcionales` |
| **TECP** Tasa Éxito Casos | `(Casos aprobados / Casos ejecutados) × 100` | `qc_casos_prueba` |

### Escala de clasificación

| Rango | Nivel |
|-------|-------|
| 90% – 100% | Excelente |
| 80% – 89% | Bueno |
| 70% – 79% | Aceptable |
| &lt; 70% | Deficiente |

## Arquitectura

```
modulo-adecuacion-funcional-iso25010/
├── database/           # ER, schema PostgreSQL, seed SQL
├── server/             # API REST + repositorio + métricas + PDF
├── src/                # UI React (formularios + dashboard)
└── data/qc-db.json     # Fallback local (solo si no hay Supabase)
```

**Persistencia (sin huecos):**

| Modo | Cuándo | Almacén |
|------|--------|---------|
| `supabase` (auto) | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` en env | Tablas `qc_*` en PostgreSQL |
| `json` | Sin credenciales Supabase o `QC_PERSISTENCE=json` | `data/qc-db.json` |

Variables (mismas que el BFF):

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
# Opcional: forzar backend
QC_PERSISTENCE=auto   # auto | supabase | json
```

El servidor carga automáticamente `calzatura-vilchez/bff/.env`, `.env.local` y `.env` del monorepo.

**Capas:**
1. **Datos** — modelo relacional normalizado (4 tablas + vista de métricas).
2. **Negocio** — `server/metrics.mjs` calcula CF, COF, TECP y clasificación.
3. **API** — REST JSON + endpoint PDF.
4. **Presentación** — dashboard con barras de progreso, gráfico SVG y formularios por indicador.

## Cómo ejecutar

### Producción local (UI + API)

```bash
cd modulo-adecuacion-funcional-iso25010
npm install
npm run start
```

Abre **http://localhost:4321/adecuacion-funcional/** (integrado en el dashboard ISO 25000).

> Desarrollo standalone (solo este módulo): `npm run server` → http://localhost:4322

### Desarrollo (hot reload)

Terminal 1:
```bash
npm run server
```

Terminal 2:
```bash
npm run dev
```

Abre **http://localhost:5174** (proxy API → 4322)

### Cargar datos de ejemplo Calzatura Vilchez

Botón **«Cargar ejemplo»** en el dashboard, o:

```bash
npm run seed
```

**Resultados esperados con el seed (25 RF Must):**
- CF = **100%** (25/25 funciones) — Excelente
- COF = **100%** (10/10 transacciones) — Excelente
- TECP = **100%** (10/10 casos) — Excelente

Verifica backend activo: `GET /api/health` → `{ persistence: "supabase" | "json" }`.

## Base de datos

| Archivo | Uso |
|---------|-----|
| `database/modelo-entidad-relacion.md` | Diagrama ER (Mermaid) |
| `database/schema.postgresql.sql` | `CREATE TABLE` + vista + RLS |
| `database/seed-calzatura-vilchez.sql` | Datos reales del proyecto |
| `calzatura-vilchez/supabase/migrations/20260616143000_create_qc_adecuacion_funcional.sql` | Despliegue Supabase |

## API REST

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/evaluaciones` | Lista con métricas |
| POST | `/api/evaluaciones` | Nueva evaluación |
| GET | `/api/evaluaciones/:id` | Detalle + hijos + métricas |
| GET | `/api/evaluaciones/:id/reporte.pdf` | Reporte PDF |
| POST | `/api/evaluaciones/:id/funciones` | Registrar función (CF) |
| POST | `/api/evaluaciones/:id/transacciones` | Registrar transacción (COF) |
| POST | `/api/evaluaciones/:id/casos-prueba` | Registrar caso (TECP) |
| POST | `/api/seed` | Reset con datos ejemplo |

## Reportes PDF

Generados con **jsPDF** + **jspdf-autotable**. Incluyen metadatos de evaluación, tabla de indicadores con fórmulas, clasificación y escala.

Descarga desde el botón **«Descargar PDF»** en la vista de evaluación.

## Buenas prácticas aplicadas

- **Separación de capas** (datos / negocio / API / UI).
- **Fórmulas centralizadas** en `metrics.mjs` (única fuente de verdad).
- **Vista SQL** `qc_v_metricas_evaluacion` para reporting en PostgreSQL.
- **RLS** en Supabase: solo `service_role` (patrón BFF del proyecto).
- **IDs únicos** por evaluación (`codigo_rf`, `codigo` TC/TX).
- **UI accesible**: barras con `role="progressbar"`, contraste por nivel.
- **Datos de ejemplo** alineados al SRS y CU-T07 de Calzatura Vilchez.

## Relación con dashboard ISO 25000

El `dashboard-iso25000/` existente muestra **estimaciones documentales** de las 6 características ISO. Este módulo es el **instrumento operativo** para medir cuantitativamente la subcaracterística **Adecuación Funcional** con fórmulas explícitas y evidencia registrable.
