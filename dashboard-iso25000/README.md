# Dashboard de Cumplimiento ISO/IEC 25000 — Calzatura Vilchez

Dashboard unificado en **http://localhost:4321** que integra:

| Ruta | Contenido |
|------|-----------|
| `/` | Dashboard principal — **6 características** (calidad interna/externa, diagrama ISO 25000), gráficos, instrumentos |
| `/adecuacion-funcional/` | Módulo CF / COF / TECP (React, datos en vivo) |
| `/api/*` | API REST del módulo de adecuación funcional |

## Inicio rápido

Desde la raíz del repositorio:

```bash
npm run dashboard:iso:start
```

O manualmente:

```bash
cd modulo-adecuacion-funcional-iso25010 && npm run build
node dashboard-iso25000/server.mjs
```

Abre **http://localhost:4321**

> Puerto alternativo: `node dashboard-iso25000/server.mjs 5050`

## Qué incluye el dashboard principal (4321)

- **Resumen global** con anillo de cumplimiento y donut de distribución (cumple / parcial / no cumple)
- **Radar** y **barras** por las **6 características** (Funcionalidad, Fiabilidad, Usabilidad, Eficiencia, Mantenibilidad, Portabilidad)
- **Listas de cotejo** con evaluación en **3 niveles** (cotejo + casos de prueba + evidencias)
- **Barras agrupadas** con todas las subcaracterísticas
- **Correlación en vivo** con CF, COF y TECP (lee `/api/evaluaciones`)
- **Listas de cotejo expandibles** por subcaracterística — formato UNAM (tabla Sí / No / Observaciones)
- **Hub de evidencias** — documentación `.md`, fragmentos de código, gates `verify-*`, artefactos CU-T y diagrama SQuaRE (pestaña *Evidencias*)
- **Tablas detalladas** con evidencia del repositorio
- Enlace directo al **módulo CF/COF/TECP** en `/adecuacion-funcional/`

## Correlación 4321 ↔ módulo adecuación funcional

Los indicadores **CF**, **COF** y **TECP** se calculan en el módulo React y se muestran en el panel de correlación del dashboard principal. Solo cambian al modificar registros en el programa (pestañas CF, COF, TECP).

La característica **Funcionalidad** del modelo 25000 se vincula con:
- Subcaracterísticas estáticas en `data.json` (Idoneidad, Precisión, etc.)
- Indicadores dinámicos CF/COF/TECP en el módulo correlacionado

## Actualizar porcentajes estáticos

Edita **`data.json`** para las características y subcaracterísticas del modelo de calidad interna/externa (ver `documentacion/modelo-calidad-25010-alineacion.md`).

Los indicadores CF/COF/TECP **no** se editan en `data.json` — se gestionan en `/adecuacion-funcional/`.

## Listas de cotejo (formato académico)

Cada subcaracterística tiene una **lista de cotejo dicotómica** (Sí / No), según [UNAM Cap. 14](https://cuaed.unam.mx/publicaciones/libro-evaluacion/pdf/Capitulo-14-LISTA-DE-COTEJO.pdf):

| N° | Indicador | Sí | No | Observaciones |
|----|-----------|----|----|---------------|

El **%** = ítems marcados Sí ÷ total × 100. Los ítems están en `checklists-data.json`.

Regenerar tras cambiar porcentajes en `data.json`:

```bash
npm run dashboard:checklists
```

## Estructura

```
dashboard-iso25000/
├── server.mjs      # Servidor unificado (4321) — dashboard + API + módulo React
├── serve.cjs       # Alias → server.mjs
├── index.html      # Dashboard principal
├── app.js          # Gráficos, instrumentos, correlación
├── styles.css
├── data.json       # Modelo 6 características / 27 subcaracterísticas (SQuaRE 25000)
├── checklists-data.json
└── evaluation-levels.json  # Nivel 2 casos de prueba + Nivel 3 evidencias

modulo-adecuacion-funcional-iso25010/
├── dist/           # Build servido en /adecuacion-funcional/
└── server/handler.mjs  # API compartida
```

## Nota sobre puerto 4322

El puerto **4322** era el servidor standalone del módulo QC. Ahora todo corre en **4321**. Para desarrollo aislado del módulo: `cd modulo-adecuacion-funcional-iso25010 && npm run server` (solo dev).
