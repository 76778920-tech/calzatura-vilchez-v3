# Índice de Documentación — Calzatura Vilchez

**Proyecto:** Sistema web de comercio electrónico con modelo de IA para la predicción del riesgo empresarial  
**Asesor:** Dr. Maglioni Arana Caparachin  
**Versión:** 1.0 | **Fecha:** 2026-05-05

---

## Estructura de documentación

| Carpeta | Documento | Norma aplicada | Artículos del estado del arte |
|---|---|---|---|
| `01-srs/` | [SRS-Calzatura-Vilchez.md](01-srs/SRS-Calzatura-Vilchez.md) | ISO/IEC 25010, ISO 9001, ISO/IEC 27001 | Art. 1-20 (todos los ejes) |
| `02-casos-de-uso/` | [casos-de-uso.md](02-casos-de-uso/casos-de-uso.md) | ISO/IEC 25010 — Funcionalidad | Art. 1, 2, 4, 5, 9, 13-15 |
| `02-casos-de-uso/` | [historias-usuario.md](02-casos-de-uso/historias-usuario.md) | Ágil — formato Given/When/Then | Art. 1-4, 9, 12-15 |
| `03-sdd/` | [arquitectura-sistema.md](03-sdd/arquitectura-sistema.md) | ISO/IEC 25010 — Mantenibilidad, Portabilidad | Art. 5, 18, 19, 20 |
| `03-sdd/` | [diseno-base-datos.md](03-sdd/diseno-base-datos.md) | ISO 9001 — Información documentada; ISO/IEC 27001 | Art. 5 (BI&A) |
| `04-api/` | [api-referencia.md](04-api/api-referencia.md) | ISO/IEC 27001 — Seguridad de comunicaciones | Art. 5, 6, 9, 13, 14 |
| `05-pruebas/` | [plan-pruebas.md](05-pruebas/plan-pruebas.md) | ISO/IEC 25010 — Fiabilidad; ISO 9001 — Cláusula 8.6 | Art. 6, 9, 13 |
| `06-ia/` | [modelo-ia.md](06-ia/modelo-ia.md) | ISO/IEC 25010 — Funcionalidad; ISO/IEC 27001 — Trazabilidad | Art. 6-17 (Eje 2 y 3) |
| `07-despliegue/` | [guia-despliegue.md](07-despliegue/guia-despliegue.md) | ISO/IEC 25010 — Portabilidad; ISO/IEC 27001 — Despliegue | Art. 18, 19, 20 |

---

## Documentación existente complementaria

| Documento | Descripción |
|---|---|
| [documentacion-general-sistema.md](documentacion-general-sistema.md) | Resumen ejecutivo del sistema, tecnologías y flujos principales |
| [formato-09-alcance-proyecto-software.md](formato-09-alcance-proyecto-software.md) | Alcance formal del proyecto (Formato 09) |
| [quality-security-standards.md](quality-security-standards.md) | Estándares de calidad y seguridad aplicados |
| [security-audit.md](security-audit.md) | Auditoría de seguridad del sistema |
| [AUDITORIA-EXHAUSTIVA-2026-05.md](AUDITORIA-EXHAUSTIVA-2026-05.md) | Auditoría exhaustiva ISO 9001/25010/27001 |
| [procesos/catalogo-mapas-procesos.md](procesos/catalogo-mapas-procesos.md) | Catálogo de los 30 mapas de procesos BPMN |
| [15-modulos/](15-modulos/) | Auditorías por módulo del panel administrativo |

---

## Trazabilidad con los 20 artículos del estado del arte

| Artículo | Autores | Eje temático | Documentos que lo citan |
|---|---|---|---|
| Art. 1 | Gefen et al. (2003) — TAM+Trust | E-commerce | SRS (RF-01 a RF-06), CU-01, CU-03, HU-01, HU-05, HU-07 |
| Art. 2 | Pavlou & Fygenson (2006) — TPB | E-commerce | SRS (RF-11 a RF-13), CU-04, HU-04, HU-06 |
| Art. 3 | Liang & Turban (2011) — Social Commerce | E-commerce | SRS, CU-01, HU-08 |
| Art. 4 | Hajli (2015) — Social Commerce | E-commerce | SRS (RF-03, RF-09), CU-02, HU-03, HU-08 |
| Art. 5 | Chen et al. (2012) — BI&A | IA/Datos | SRS (RF-27 a RF-33), Arquitectura, API, Modelo IA |
| Art. 6 | Makridakis et al. (2018) — Forecasting | Predicción | SRS (RF-27), Modelo IA (§3.2), Pruebas (PT-IA-04) |
| Art. 7 | Fischer & Krauss (2018) — LSTM | Predicción | SRS (roadmap LSTM), Modelo IA (§6.2) |
| Art. 8 | Hochreiter & Schmidhuber (1997) — LSTM | Predicción | SRS (roadmap LSTM), Modelo IA (§6.2) |
| Art. 9 | Breiman (2001) — Random Forest | Predicción | SRS (RF-27), Modelo IA (§3.1), API (§2.3), Arquitectura |
| Art. 10 | LeCun et al. (2015) — Deep Learning | Predicción | SRS (roadmap DL), Modelo IA (§6.2) |
| Art. 11 | Ozbayoglu et al. (2020) — DL en finanzas | Predicción | SRS (roadmap DL), Modelo IA (§5.2) |
| Art. 12 | Fildes et al. (2022) — Retail forecasting | Predicción | SRS (RF-27), Modelo IA (§2.3, §6.1), Pruebas |
| Art. 13 | Altman (1968) — Z-score | Riesgo | SRS (RF-29), Modelo IA (§4.1, §4.3), API (§2.4) |
| Art. 14 | Ohlson (1980) — O-score | Riesgo | SRS (RF-29), Modelo IA (§4.3), API |
| Art. 15 | Beaver (1966) — Ratios financieros | Riesgo | SRS (RF-29), Modelo IA (§4.1), Pruebas |
| Art. 16 | Tian et al. (2015) — LASSO | Riesgo | SRS (RF-29), Modelo IA (§6.2) |
| Art. 17 | Wang et al. (2012) — SMOTE ensemble | Riesgo | SRS (RF-29), Modelo IA (§6.2) |
| Art. 18 | Vial (2019) — Transformación digital | Estrategia | SRS (§2.1), Arquitectura (§1), Despliegue |
| Art. 19 | Nambisan (2017) — Emprendimiento digital | Estrategia | SRS (§2.1), Arquitectura (ADR-04) |
| Art. 20 | Bharadwaj et al. (2013) — Digital Strategy | Estrategia | SRS (§2.1), Arquitectura (§1), Despliegue |

---

*Todos los documentos están alineados con ISO/IEC 25010:2011 (calidad del software), ISO 9001:2015 (gestión de calidad) e ISO/IEC 27001:2022 (seguridad de la información). Las referencias completas de los artículos se encuentran en `estado_del_arte.md` en la raíz del repositorio.*
