# Matriz de consistencia — trazabilidad y coherencia vertical

**Proyecto:** Calzatura Vilchez — Tesis UCV  
**Título:** Sistema web de comercio electrónico con modelo de IA para la predicción del riesgo empresarial en la empresa Calzatura Vilchez, Huancayo, 2026  
**Generación:** `python scripts/generar_matriz_consistencia_mejorada.py`  
**Salida:** `Matriz_Consistencia_Calzatura_Vilchez_MEJORADA.docx` · `documentacion/cuadros-excel/CU-T09-matriz-consistencia.csv`

---

## 1. Función de la matriz (norma académica)

La matriz de consistencia verifica la **coherencia vertical** entre:

| Rubro | Debe alinearse con |
|-------|-------------------|
| Problema (general y específicos) | Mismas variables e indicadores que objetivos e hipótesis |
| Objetivos | Solución directa al problema formulado |
| Hipótesis | Proposición comprobable con los indicadores declarados |
| Variables | VI (intervención) y VD (IRE) — ver matriz operacionalización |
| Dimensiones | Subconjunto coherente por objetivo específico |
| Indicadores | Medibles, con escala e instrumento definidos |
| Metodología | Tipo, diseño, población, muestra, técnicas e instrumentos |

**Referencias metodológicas:** URP Anexo 6 · UNCP Guía plan y tesis · Carrasco (2018) citado en UNE Módulo 4 matrices.

---

## 2. Variables del estudio (fuente única)

| Variable | Definición operativa | Documento |
|----------|---------------------|-----------|
| **VI** | Sistema web e-commerce + microservicio IA (React/Vite, Supabase, Firebase Auth, FastAPI, RandomForestRegressor demanda + IRE) | `09-implementacion-despliegue-ci.md` |
| **VD** | Predicción del riesgo empresarial comercial-operativo mediante **IRE (0–100)** | `07-modulo-ia-riesgo-empresarial.md` |

**Fórmula IRE (implementada):**

```text
IRE = 0,40 × riesgo_stock + 0,35 × riesgo_ingresos + 0,25 × riesgo_demanda
```

Niveles: 0–25 bajo · 26–50 moderado · **51–75 alto** · **76–100 crítico**.

---

## 3. Coherencia por fila

| Fila | Problema ↔ Objetivo ↔ Hipótesis | VI / VD | Evidencia repo |
|------|----------------------------------|---------|----------------|
| General | Influencia del sistema en predicción del riesgo | VI + VD completas | Dashboard ISO + `ai-service/` |
| Específico 1 | Digitalización ventas e inventario | VI-D1, VI-D3 | Catálogo, checkout, admin, Supabase |
| Específico 2 | Precisión pronóstico demanda (MAE/RMSE) | VI-D2 → VD-D2/D3 | `ai-service/models/demand/` RF + fallback |
| Específico 3 | IRE y reducción riesgo operativo | VD-D1…D4 | `AdminPredictions`, `ireHistorial` |

---

## 4. Instrumentos (no confundir)

| Instrumento | Población | Uso en matriz | Archivo |
|-------------|-----------|---------------|---------|
| Entrevista semiestructurada | Empleadores / directivos | Diagnóstico, validación cualitativa requisitos e IRE | `plantillas/guia-entrevista-empleadores-PLANTILLA.md` |
| Cuestionario Likert 24 ítems | Personal directivo y operativo CV | Pre/post percepción IRE y utilidad | `Instrumento_Investigacion_Calzatura_Vilchez_MEJORADO.docx` |
| SUS | Usuarios finales web | Usabilidad (ISO) — **no sustituye** encuesta empleadores | `plantillas/instrumento-sus-calzatura-vilchez.md` |
| Métricas ML | Datos Supabase | MAE, RMSE, sMAPE, R² | `ai-service/evaluate.py` |
| Dashboard IRE | Admin | Valor IRE y componentes | Panel predicciones |

---

## 5. Correcciones respecto a versiones anteriores

| Error previo | Corrección |
|--------------|------------|
| Firebase **Firestore** como BD principal | **Supabase (PostgreSQL)** + Firebase Auth/Hosting |
| IRE umbral **≥ 0,70** (escala 0–1) | IRE **0–100**; alerta operativa **≥ 51** (alto) o **≥ 76** (crítico) |
| AUC-ROC garantizado | Solo si hay eventos etiquetados; validación principal = consistencia interna + MAE/RMSE + pre/post |
| Solo encuesta | **Mixto:** entrevistas + encuesta + métricas objetivas |

---

## 6. Matrices relacionadas

| Matriz | Relación |
|--------|----------|
| `Matriz_Operacionalizacion_Variables_...docx` | Desagrega dimensiones e indicadores (24+24) |
| `Matriz_Operacionalizacion_Instrumento_v2_VALIDADA.docx` | CU-T11: items Likert ↔ dimensiones VD |
| `CU-T05-requisitos.csv` | RF/RNF del software |
| `CU-T07-matriz-pruebas-requisitos.csv` | Pruebas ↔ requisitos |
| Dashboard ISO 9126 | Calidad del producto (complementario, no sustituye matriz consistencia) |

---

## 7. Criterios de rigor antes de jurado

- [ ] Mismos indicadores en problema específico, objetivo, hipótesis y operacionalización.  
- [ ] Stack tecnológico coincide con `09-implementacion-despliegue-ci.md`.  
- [ ] IRE descrito en escala 0–100 con pesos 40/35/25.  
- [ ] Entrevistas con acta anonimizada (n ≥ 3 directivos).  
- [ ] Encuesta pre/post aplicada con alfa ≥ 0,70.  
- [ ] Hipótesis 2 comprobada con `evaluate.py` o reporte MAE/RMSE.  
- [ ] Hipótesis 3 con conteo quiebres de stock pre/post en Supabase.
