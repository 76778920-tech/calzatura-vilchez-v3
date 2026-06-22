# Operacionalizacion del instrumento — trazabilidad (CU-T11)

**Generacion:** `python scripts/generar_matriz_operacionalizacion_instrumento.py`  
**Validacion:** `python scripts/validar_matriz_operacionalizacion_instrumento.py`  
**Coherencia global:** `python scripts/validar_coherencia_matrices_tesis.py`  
**Word:** `Matriz_Operacionalizacion_Instrumento_v3_AUDITADA.docx`  
**CSV:** `documentacion/cuadros-excel/CU-T11-matriz-operacionalizacion-instrumento.csv`  
**Fuente unica items:** `scripts/datos_instrumento_likert.py`

## Funcion academica

La matriz de operacionalizacion del **instrumento** desagrega *como se mide* cada indicador de la VD mediante reactivos (items Likert). Complementa:

| Matriz | Que responde |
|--------|--------------|
| CU-T09 Consistencia | Problema, objetivos, hipotesis, metodologia |
| CU-T10 Variables | Dimensiones e indicadores VI/VD |
| **CU-T11 Instrumento** | Item a item: reactivo, escala, validacion |
| Anexo 04 | Cuestionario aplicable (pre/post) |

## Fuentes metodologicas consultadas

| Fuente | Aporte |
|--------|--------|
| [UNE Modulo 4 — Matrices](https://www.une.edu.pe/Pedagogia/wp-content/uploads/2026/01/Modulo-4-Tipos-de-matrices-de-investigacion-OK.pdf) | Indicadores construyen items; coherencia vertical |
| [ULima repositorio](https://repositorio.ulima.edu.pe/handle/20.500.12724/22103) | Matriz operacionalizacion: indicadores (que mide) + items (como mide) |
| [SciELO Cuba](http://scielo.sld.cu/scielo.php?pid=S2218-36202021000500586) | Indicador -> item; Likert; Cronbach |
| [Tesify operacionalizacion](https://tesify.es/operacionalizacion-de-variables-ejemplo-guia-paso-a-paso) | Columnas: dimension, indicador, item, escala |
| [Tesify instrumento LATAM](https://tesify.es/instrumento-recoleccion-datos-tesis-tipos-ejemplos-latam-2026) | V de Aiken >= 0.70; Cronbach >= 0.70; 3-5 items/indicador |

## Correcciones v2.1 (auditoria semantica)

- **1:1 estricto** con indicadores CU-T10 VD (item N = indicador N de cada dimension)
- Item 3: horizonte **7, 15, 30** dias (antes mal mapeado)
- Item 13: **IRE compuesto 0-100** (antes decia solo riesgo_stock en ind. 1)
- Item 17: alertas **>= 51 / >= 76** en redaccion del reactivo
- D4: items 19-24 alineados (quiebres stock, dashboard, ahorro inventario)
- Columna **Definicion conceptual** anadida (norma UNE/Tesify)
- Tildes y nomenclatura `riesgo_ingresos` corregida

## Mapeo item <-> CU-T10 (VD)

| Dimension | Items | Indicadores CU-T10 |
|-----------|-------|-------------------|
| VD-D1 Modelos prediccion | 1–6 | ind. 1–6 |
| VD-D2 Exactitud / validacion | 7–12 | ind. 1–6 |
| VD-D3 Componentes IRE | 13–18 | ind. 1–6 (item 16: pesos 40/35/25) |
| VD-D4 Impacto operativo | 19–24 | ind. 1–6 |

## Validacion del instrumento

- **Validez de contenido:** juicio de expertos (min. 3), V de Aiken >= 0.70  
- **Confiabilidad:** alfa de Cronbach >= 0.70 por dimension y total  
- **Prueba piloto:** 10% de la muestra antes de aplicacion definitiva  

## Instrumentos que NO son este cuestionario

| Instrumento | Poblacion |
|-------------|-----------|
| Entrevista empleadores | Directivos (cualitativo) |
| SUS | Usuarios finales web (ISO usabilidad) |
| evaluate.py / test_risk.py | Metricas objetivas ML/IRE |
