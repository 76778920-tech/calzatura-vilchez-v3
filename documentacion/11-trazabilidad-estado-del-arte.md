# 11 — Trazabilidad entre el estado del arte y el sistema

## 1. Objetivo

Demostrar que los **20 artículos Q1** documentados en `estado_del_arte.md` **informan decisiones** de requisitos, diseño o evaluación del sistema Calzatura Vilchez, y no son solo contexto narrativo.

## 2. Artefactos

| Artefacto | Ubicación |
|-----------|-----------|
| Corpus principal | `estado_del_arte.md` (raíz del repo) |
| Matriz editable | `cuadros-excel/CU-T06-trazabilidad-articulo-requisito.csv` |
| Requisitos | `05-especificacion-requisitos-software-SRS.md` + `CU-T05` |

## 3. Identificadores de artículos (EDA)

Convención sugerida para filas CSV y tesis:

| ID artículo | Referencia en `estado_del_arte.md` |
|-------------|--------------------------------------|
| EDA-01 | Artículo 1 — Gefen et al. (2003) TAM+Trust |
| EDA-02 | Artículo 2 — Pavlou & Fygenson (2006) TPB e-commerce |
| … | … |
| EDA-20 | Artículo 20 — *(título según archivo)* |

*(Completar EDA-03…EDA-20 leyendo encabezados del `estado_del_arte.md`.)*

## 4. Procedimiento de mantenimiento (obligatorio)

1. **Al añadir** un nuevo requisito RF/RNF: crear fila en `CU-T05` y buscar ≥1 artículo EDA que justifique la necesidad (confianza, usabilidad, riesgo, etc.).  
2. **Al implementar:** anotar ruta de código o nombre de prueba en columna “Evidencia” de `CU-T06`.  
3. **Al escribir capítulo de discusión:** exportar `CU-T06` a Excel y copiar tabla a Word/LaTeX.  
4. **Revisión trimestral:** director marca columnas “Validado” en acta.

## 5. Matriz maestra (plantilla en Markdown)

> Copiar esta tabla al Excel oficial o mantener solo en CSV. Cada fila = un vínculo **artículo → decisión**.

| ID EDA | Constructo clave en EDA | RF / RNF / decisión diseño | Evidencia en producto o prueba | Estado |
|--------|-------------------------|----------------------------|----------------------------------|--------|
| EDA-01 | Confianza institucional | RF-CAT-02 políticas visibles en checkout | Captura políticas + URL | Pendiente |
| EDA-02 | Intención transaccional vs búsqueda | RF-CHK-01, RF-PED-01 | BPMN PR-11 / E2E | Pendiente |
| EDA-03 | Social commerce | RF-CAT-01 landings campaña | Rutas `campana` | Parcial |

*(Añadir filas hasta cubrir EDA-01…EDA-20; ningún artículo debe quedar sin fila “N/A justificado” si realmente no aplica — en ese caso columna decisión = “No aplicado al MVP” con argumento.)*

## 6. Matriz específica **tesis: IA y riesgo empresarial**

Los artículos 1–20 en el archivo actual están **fuertemente orientados a e-commerce**. Para el **título de tesis**, debe existir **literatura adicional** (capítulo aparte o anexo) sobre:

- Predicción de **default** / distress / early warning en PYME.  
- Series temporales de demanda como **proxy** de riesgo operativo.  
- MLOps / gobernanza de modelos.

**Acción:** crear filas EDA-B01… en `CU-T06` o nuevo CSV `CU-T09-literatura-riesgo-ia.csv` vinculadas a **RF-IA-01…RF-IA-05**.

## 7. Lista de chequeo pre-defensa

- [ ] 20/20 artículos EDA con al menos una fila en `CU-T06` o justificación explícita de no aplicación.  
- [ ] ≥2 referencias de respaldo para **cada** automatización (`CU-T08`).  
- [ ] RF-IA con experimentos y métricas en `07`.  
- [ ] Exportación PDF de matrices firmadas por director.

## 8. Historial de versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2026-05-01 | Versión inicial. |
