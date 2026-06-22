# Operacionalización de variables — trazabilidad

**Generación:** `python scripts/generar_matriz_operacionalizacion_variables.py`  
**Validación:** `python scripts/validar_matriz_operacionalizacion_variables.py`  
**Coherencia CU-T09:** `python scripts/validar_coherencia_matrices_tesis.py`  
**Word:** `Matriz_Operacionalizacion_Variables_v3_AUDITADA.docx`  
**CSV:** `documentacion/cuadros-excel/CU-T10-matriz-operacionalizacion-variables.csv`

## Estructura (norma académica LATAM)

| Columna | Contenido |
|---------|-----------|
| Variable | VI o VD |
| Definición conceptual | Base teórica (estado del arte / doc 07) |
| Definición operacional | Cómo se mide en **este** estudio |
| Dimensión | Faceta de la variable (4 VI + 4 VD) |
| Indicadores | 6 observables por dimensión |
| Escala / unidad | Nominal, ordinal, razón, intervalo |
| Técnica | Encuesta, entrevista, ML, CI… |
| Instrumento / fuente | Archivo, tabla Supabase, script |
| Sustento científico | Ejes estado del arte (42 Q1) |

## Mapeo Likert (24 ítems) ↔ VD

| Dimensión VD | Ítems cuestionario |
|--------------|-------------------|
| D1 Modelos predicción | 1–6 |
| D2 Exactitud / validación | 7–12 |
| D3 Componentes IRE | 13–18 (ítem 16: pesos 40/35/25) |
| D4 Impacto operativo | 19–24 |

## Coherencia con CU-T09

| Objetivo específico (CU-T09) | Dimensiones operacionalización |
|------------------------------|--------------------------------|
| ES1 Digitalización | VI-D1, VI-D3 |
| ES2 MAE/RMSE demanda | VI-D2, VD-D2/D3 |
| ES3 IRE / quiebres stock | VD-D1…D4 |

## Correcciones v2.1 (auditoría)

- VI-D1 indicador 6 = **Disponibilidad (%)** (CU-T09 ES1-6), no SUS
- SUS = anexo ISO usuarios finales (aparte del Likert empleados)
- Tabla validación: **48 = 8×6 indicadores** (no “24+24 Likert/técnicos”)
- Validador cruzado CU-T09 ↔ CU-T10 ↔ instrumento (24 chequeos)

## Correcciones v2 respecto a v1

- IRE **0–100** (no 0–1); alertas **≥51 / ≥76**
- **riesgo_ingresos** (nombre implementado)
- AUC-ROC **condicional** (VD-D2 ítem 6)
- **Supabase** (no Firestore)
- Horizonte **7, 15, 30** días
- Definiciones operacionales **distintas por dimensión**
- Tabla validación + script automático
