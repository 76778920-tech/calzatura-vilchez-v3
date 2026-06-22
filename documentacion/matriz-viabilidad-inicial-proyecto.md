# Matriz de Viabilidad Inicial — Calzatura Vilchez

**Proyecto / tesis:** Sistema web de comercio electrónico con IA para predicción del riesgo empresarial  
**Empresa:** Calzatura Vilchez, Huancayo, Perú  
**Versión:** 1.0 · junio 2026  

**Regenerar Word:** `python scripts/generar_matriz_viabilidad_inicial.py`  
**Cuadro Excel:** `cuadros-excel/CU-T13-matriz-viabilidad-inicial.csv`  
**Entregable Word:** `Matriz_Viabilidad_Inicial_Calzatura_Vilchez.docx` (raíz y `documentacion/`)

---

## 1. Propósito

La **matriz de viabilidad inicial** responde: *¿Es factible ejecutar este proyecto de software en Calzatura Vilchez con los recursos, plazos y restricciones actuales?*

A diferencia de la matriz de propuesta de valor (CU-T12, VPC), esta matriz evalúa **factibilidad multidimensional** antes o durante la fase de inicio del proyecto, con evidencia retrospectiva del repositorio cuando el sistema ya está parcialmente implementado.

---

## 2. Marco metodológico TELOS ampliado

| Dimensión | Peso | Qué evalúa |
|-----------|------|------------|
| **T** — Técnica | 25% | Stack, arquitectura, ML desplegable, integraciones, calidad ISO 25010, seguridad |
| **E** — Económica | 15% | Costo infraestructura PYME, ROI digitalización, costo-beneficio vs SaaS |
| **L** — Legal | 10% | Ley 29571, Ley 29733, licencias OSS, autorización organización |
| **O** — Operativa | 20% | Alineación procesos retail, usabilidad admin/cliente, mantenibilidad, continuidad |
| **S** — Temporal | 10% | Cronograma tesis, metodología iterativa, plazo módulo IA, automatización pruebas |
| **Es** — Estratégica | 10% | Transformación digital PYME, ventaja competitiva e-commerce+IA, omnicanal |
| **C** — Científica | 10% | Estado del arte Q1, contribución IRE, metodología mixta, replicabilidad |

### Fundamento académico (Q1 / alto impacto)

- **TELOS / gestión proyectos TI:** Shen et al. (2018), *Information and Software Technology*; Kuhrmann et al. (2018), *IEEE Software*.
- **Transformación digital retail:** Verhoef et al. (2019), *Journal of Business Research*; Reinartz et al. (2019), *International Journal of Research in Marketing* (JIF ~7.2).
- **E-commerce + IA PYME:** Dai et al. (2024), *PLOS ONE* (art. 43 verificado).
- **Arquitectura / ML producción:** Jamshidi et al. (2018), *IEEE Software*; Paleyes et al. (2022), *ACM Computing Surveys*; Lwakatare et al. (2020), *IST*.
- **Operaciones / big data:** Choi et al. (2018), *Production and Operations Management*; Amba et al. (2017), *JBR*.
- **Seguridad / cumplimiento:** Buck et al. (2021), *Computers & Security*; normas peruanas Ley 29571 y Ley 29733.
- **Investigación / forecasting:** Makridakis et al. (2018), *PLOS ONE*; Duan et al. (2019), *International Journal of Information Management*; Haakman et al. (2021), *Empirical Software Engineering*.

---

## 3. Escala de puntuación

| Pts | Etiqueta | Interpretación |
|-----|----------|----------------|
| 5 | Muy viable | Evidencia implementada y verificable (repo, CI, gates, producción) |
| 4 | Viable | Evidencia sólida con reservas menores documentadas |
| 3 | Viable con reservas | Factible pero requiere mitigación explícita |
| 2 | Poco viable | Brechas significativas sin plan de cierre |
| 1 | No viable | Imposibilidad demostrada |

**Cálculo:** puntaje dimensión = media ponderada de criterios (peso relativo en CU-T13); puntaje global = Σ (puntaje_dim × peso_dim).

---

## 4. Veredicto global (junio 2026 — revisión auditada)

| Métrica | Valor |
|---------|-------|
| Criterios evaluados | 36 |
| Puntaje global | **4.45 / 5.00** |
| Veredicto | **VIABLE — proceder con reservas documentadas** |

> **Nota metodológica:** la evaluación es **ex post** (sistema parcialmente implementado). Los puntajes reflejan evidencia del repositorio, no solo intención inicial.

### Reservas principales

1. Validación empírica O₂ (encuesta Likert) en curso — VC-03 puntaje 3.  
2. Fiabilidad ISO checklist al **84%** en producción (DR/uptime pendientes).  
3. Gates `verify-interoperabilidad` y `verify-seguridad` en **ROJO** por desalineación del dashboard ISO (no por ausencia de integraciones/seguridad).  
4. Series históricas PYME limitadas para entrenamiento inicial del Random Forest.

### Auditoría de calidad (revisión junio 2026)

| Aspecto | Resultado |
|---------|-----------|
| DOI vs corpus 43+44–48 | 35/35 artículos verificados ✓ |
| Encaje artículo–criterio | Corregidos VL-03, VO-05 (antes encaje débil) |
| Coherencia puntaje–veredicto | Corregido (ya no todo «Alta viabilidad») |
| Evidencia vs gates ROJO | VT-02 y VT-06 rebajados a 4 con nota explícita |

---

## 5. Trazabilidad

Cada fila CU-T13 vincula:

- **Criterio_ID** (VT-*, VE-*, VL-*, VO-*, VTM-*, VEs-*, VC-*)
- **Evidencia_proyecto** (RF-*, gates, documentos)
- **Articulo_num** + **DOI** del corpus `referencias-estado-arte-43-verificadas.json`

---

## 6. Control de versiones

| Versión | Fecha | Cambio |
|---------|-------|--------|
| 1.0 | 2026-06-19 | Creación CU-T13 + Word + guía metodológica TELOS ampliado |
