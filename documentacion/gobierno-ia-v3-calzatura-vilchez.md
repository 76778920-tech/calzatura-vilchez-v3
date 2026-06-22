# Gobierno IA V3 — Calzatura Vilchez

**Archivo:** `artifacts/matrices/Plantilla_Gobierno_IA_V3_CALZATURA_VILCHEZ.xlsx`  
**Regenerar:** `python scripts/generar_gobierno_ia_v3.py`  
**Documento IA técnico:** `07-modulo-ia-riesgo-empresarial.md` **v1.2**

---

## Versión actual (junio 2026)

| Nivel | Valor | Notas |
|-------|-------|-------|
| **Estructura plantilla** | **V3** | 18 hojas · celdas con wrap, anchos y alturas 42px |
| **Contenido plantilla** | **1.2** | Versiones web por MP/bolt + hoja VERSIONES_WEB |
| **Sistema web (calzatura-vilchez)** | **1.9.0** | 10 releases documentados 1.0.0 → 1.9.0 |
| **Módulo IA (doc)** | **1.2** | `07-modulo-ia-riesgo-empresarial.md` |
| **Bolts registrados** | **59** | 55 web + 4 ai-service |
| **Requisitos gobierno** | **18** | 8 RF + 10 RNF (incl. explicabilidad, data_sufficient, human-in-the-loop) |

### Hojas del Excel

| Hoja | Filas (aprox.) | Rol |
|------|----------------|-----|
| METADATA | 9 | Versión plantilla/contenido, normas, regeneración |
| PROCESOS | 16 | Macroprocesos MP-01…MP-16 |
| ACTIVIDADES_BPMN | 59 | Bolts → actividades |
| FLUJO_BPMN | 10 | Pipeline IA (cold start → IRE → admin) |
| REQUERIMIENTOS | 18 | RF/RNF trazados a bolts |
| CONTROL_VERSIONES | 59 | Versionado por bolt |
| AI_DLC | 6 | Ciclo vida IA por componente (con refs Q1 en texto) |
| DEPENDENCIAS | 9 | Grafo datos/servicios IA |
| MERGES / HISTORIAL | — | Integración Git |
| ARTEFACTOS | 24 | SRS, código, ZAP, backtest, matrices |
| PMV | 6 | Producto mínimo viable |
| DASHBOARD | — | KPIs + controles 42001 + Q1 |
| **RESPALDO_Q1** | **17** | Artículos Q1 por dimensión gobierno |
| **CONTROLES_ISO42001** | **20** | Controles AIMS operacionalizados |
| **RIESGOS_IA** | **8** | Riesgos + mitigación + DOI |
| **MODEL_CARD** | **10** | Ficha del modelo IRE + RF |
| **VERSIONES_WEB** | **10** | Línea de releases 1.0.0 → 1.9.0 |

---

## Línea de versiones del sistema web (hoja VERSIONES_WEB)

| Versión | Fecha | Hito |
|---------|-------|------|
| 1.0.0 | 2026-05-01 | Bootstrap catálogo, auth, pedidos |
| 1.1.0 | 2026-05-14 | Stock y ventas admin |
| 1.2.0 | 2026-05-16 | ventasDiarias + ireHistorial |
| 1.3.0 | 2026-05-19 | Pedidos hardened RLS |
| 1.4.0 | 2026-05-22 | Roles y auditoría |
| 1.5.0 | 2026-05-26 | Legal Perú (Ley 29571) |
| 1.6.0 | 2026-05-31 | Supabase hardening |
| 1.7.0 | 2026-06-08 | IA campañas + modelo_estado |
| 1.8.0 | 2026-06-12 | Admin pedidos: mapas, búsqueda |
| **1.9.0** | **2026-06-16** | **ISO 25000, PKCS#7, qc_*, gates** |

Cada **macroproceso** (MP-01…MP-16) y cada **bolt** (59) tiene en PROCESOS / CONTROL_VERSIONES la versión web de su última iteración, no un genérico «1.0».

---

## Revisión: qué estaba básico (v1.0) y qué se mejoró (v1.1)

| Aspecto | v1.0 (antes) | v1.1 (ahora) |
|---------|--------------|--------------|
| Respaldo bibliográfico Q1 | Ausente | Hoja **RESPALDO_Q1** (17 artículos DOI verificados) |
| ISO/IEC 42001 | Solo mención en MP-12 | **20 controles** con evidencia repo + artículo |
| Riesgos IA | No registrados | **8 riesgos** alineados a `07-modulo-ia` §9 |
| Model card | No existía | Hoja **MODEL_CARD** |
| AI_DLC | Texto genérico CRISP-ML repetido | Detalle **por bolt** + citas Q1 en diseño/QA |
| Requisitos IA | 4 RNF | **10 RNF** (explicabilidad, trazabilidad, supervisión humana) |
| Versión / fecha | Todo 1.0 @ 2026-05-28 | **1.1** @ fecha regeneración; IA bolts en 1.1 |
| METADATA | No existía | Hoja central de versiones |

---

## Artículos Q1 que respaldan el gobierno IA

| Dimensión | Art. | Referencia | DOI | Uso en plantilla |
|-----------|------|------------|-----|------------------|
| Ciclo vida / AIMS | 41 | Haakman et al. (2021) ESE | [10.1007/s10664-021-09993-1](https://doi.org/10.1007/s10664-021-09993-1) | AI-DLC, CTL-42001-03/18 |
| Despliegue ML | 32 | Paleyes et al. (2022) ACM CSUR | [10.1145/3533378](https://doi.org/10.1145/3533378) | R-IA-01, CTL-42001-07 |
| MLOps industrial | 29 | Lwakatare et al. (2020) IST | [10.1016/j.infsof.2020.106368](https://doi.org/10.1016/j.infsof.2020.106368) | CTL-42001-06 |
| Ingeniería IA | 33 | Martínez-Fernández (2022) TOSEM | [10.1145/3487043](https://doi.org/10.1145/3487043) | CTL-42001-08/17 |
| Decisiones / explicabilidad | 09 | Duan et al. (2019) IJIM | [10.1016/j.ijinfomgt.2019.01.021](https://doi.org/10.1016/j.ijinfomgt.2019.01.021) | IRE, R-IA-03, MODEL_CARD |
| Forecasting | 13 | Makridakis et al. (2018) PLOS ONE | [10.1371/journal.pone.0194889](https://doi.org/10.1371/journal.pone.0194889) | Backtest gate |
| Random Forest | 35 | Breiman (2001) ML | [10.1023/A:1010933404324](https://doi.org/10.1023/A:1010933404324) | Modelo demanda |
| Big data operaciones | 40 | Choi et al. (2018) POM | [10.1111/poms.12838](https://doi.org/10.1111/poms.12838) | Calidad datos, R-IA-07 |
| Retail forecasting | 14 | Fildes et al. (2019) IJF | [10.1016/j.ijforecast.2019.06.004](https://doi.org/10.1016/j.ijforecast.2019.06.004) | Drift / monitoreo |
| Prescriptive analytics | 39 | Lepenioti et al. (2020) IJIM | [10.1016/j.ijinfomgt.2019.04.003](https://doi.org/10.1016/j.ijinfomgt.2019.04.003) | Alertas stock |
| Adopción organizacional | 11 | Shrestha et al. (2019) CMR | [10.1177/0008125619862257](https://doi.org/10.1177/0008125619862257) | Supervisión humana |
| E-commerce + IA PYME | 43 | Dai et al. (2024) PLOS ONE | [10.1371/journal.pone.0305639](https://doi.org/10.1371/journal.pone.0305639) | Contexto negocio |
| Seguridad | 44 | Buck et al. (2021) Comp. & Sec. | [10.1016/j.cose.2021.102436](https://doi.org/10.1016/j.cose.2021.102436) | API IA, R-IA-06 |
| Ciber e-commerce | 47 | Lallie et al. (2021) | [10.1016/j.cose.2021.102248](https://doi.org/10.1016/j.cose.2021.102248) | DAST ZAP |
| Microservicios | 28 | Jamshidi et al. (2018) IEEE Software | [10.1109/ms.2018.2141039](https://doi.org/10.1109/ms.2018.2141039) | Arquitectura |
| Transformación digital | 01 | Verhoef et al. (2019) JBR | [10.1016/j.jbusres.2019.09.022](https://doi.org/10.1016/j.jbusres.2019.09.022) | Alcance AIMS |

---

## Reservas documentadas (honestas)

1. **Certificación ISO 42001** no es auditoría formal; es **operacionalización académica** con evidencia repo.  
2. **CTL-42001-07** y **R-IA-01** en estado AMBAR: series históricas PYME cortas.  
3. **R-IA-03**: sin etiquetas de crisis → no hay AUC del IRE (validación O₂ pendiente).  
4. **Gate `verify-seguridad`** puede fallar por taxonomía dashboard ISO (seguridad bajo Funcionalidad); controles reales sí existen (RLS, ZAP, BFF).

---

## Control de versiones

| Versión contenido | Fecha | Cambio |
|-------------------|-------|--------|
| 1.0 | 2026-05-28 | Generación inicial desde bolts + AI-DLC básico |
| 1.1 | 2026-06-19 | RESPALDO_Q1, CONTROLES_ISO42001, RIESGOS_IA, MODEL_CARD, METADATA, RNF ampliados |
| 1.2 | 2026-06-19 | VERSIONES_WEB, versiones reales por MP/bolt (web 1.9.0), formato Excel |
