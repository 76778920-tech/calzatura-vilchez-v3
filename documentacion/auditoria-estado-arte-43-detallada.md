# Auditoría detallada — Estado del Arte 43 Tablas (junio 2026)

**Documento:** `Estado_del_Arte_43_Tablas_CORREGIDO.docx` · `Estado_del_Arte_43_Tablas_v2_MEJORADO.docx` (mismo contenido, nombre alternativo)  
**Verificación:** CrossRef API + búsqueda manual de casos críticos  
**JSON enlaces:** `documentacion/referencias-estado-arte-43-verificadas.json`  
**Script:** `scripts/generar_estado_arte_43_tablas.py`

---

## Veredicto general

| Aspecto | Estado | Nota |
|---------|--------|------|
| Estructura tablas (VI/VD/dimensiones/indicadores) | **Mejorado v2** | Tabla A ficha + Tabla B operacionalización 9 cols. |
| Trazabilidad al sistema Calzatura Vilchez | **Bien desarrollado** | Evidencia funcional por artículo |
| Organización por ejes temáticos | **Bien desarrollado** | Alineado con auditoría de encaje |
| Advertencias metodológicas (23, 37, quiebra vs IRE) | **Adecuado** | Con notas CORRECCIÓN |
| **Metadatos bibliográficos (revista/autor/DOI)** | **Tenía errores graves** | 17 referencias corregidas en esta auditoría |
| **Enlaces PDF/DOI en Word** | **Faltaban** | Ahora 43 DOI verificados en v2 |
| PDFs locales en repo | **Solo 1/43** | `Dai_2024_...PLOS_ONE.pdf` (art. 43) |

**Conclusión:** El contenido analítico y la trazabilidad al sistema están bien construidos para la tesis, pero **no estaba listo para jurado** por errores bibliográficos y ausencia de enlaces. Tras correcciones de esta auditoría queda **usable con reservas** en artículos 23, 29–30 y 37 (ver abajo).

---

## PDFs en el repositorio

| Archivo local | Artículo |
|---------------|----------|
| `Dai_2024_AI_big_data_cross_border_ecommerce_PLOS_ONE.pdf` | 43 — PLOS ONE (OK) |
| `Estado_del_Arte_42_Tablas_v2.pdf` | Versión anterior (no sustituye verificación) |

Los otros 42 artículos **no tienen PDF descargado en el repo**; acceso vía DOI (enlace en Word regenerado).

---

## Errores críticos encontrados y corregidos

| N.° | Problema | Corrección |
|-----|----------|------------|
| **04** | Revista British J. Management | **Technovation** — DOI 10.1016/j.technovation.2017.12.004 |
| **05** | Revista JBR | **International Journal of Information Management** |
| **09** | Autor "Yuan" + revista incorrecta | **Duan, Edwards, Dwivedi (2019)** — IJIM |
| **11** | Revista AMP | **California Management Review** |
| **12** | Revista IJPE | **Journal of Business Research** |
| **16** | Revista R&D Management | **Technological Forecasting and Social Change** |
| **17** | Revista IMM | **Journal of Business & Industrial Marketing** |
| **22** | Año autor 2021 | Publicación **2017** |
| **23** | Revista J. Accounting & Public Policy | **European Journal of Operational Research** |
| **24** | Revista European Accounting Review | **European Journal of Operational Research** |
| **25** | DOI apuntaba a CFA Digest | **10.1016/j.jbankfin.2014.12.003** (JBF) |
| **29** | Autor "Swakatare" + ICSE Workshop | **Lwakatare et al. (2020)** — **Information and Software Technology Q1** |
| **30** | Revista Scientific Programming | **Complexity (Wiley)** — verificar cuartil Q2 |
| **35** | DOI enciclopedia | **10.1023/A:1010933404324** (Machine Learning 2001) |
| **37** | **Salgonde & Chari (2021) ISM — NO EXISTE** | **Malgonde & Chari (2019)** Empirical Software Engineering |

---

## Artículos con reservas (usar con cuidado en tesis)

| N.° | Reserva |
|-----|---------|
| **23** | Quiebra corporativa EE.UU.; solo marco teórico, no IRE |
| **18–27** | Riesgo financiero/quiebra; citar como antecedente ML, no como definición del IRE |
| **30** | Cuartil dudoso (Complexity); no declarar Q1 sin Scimago |
| **37** | Anexo metodología; no estado del arte central |
| **29** | Ahora es revista Q1 válida; usar como MLOps técnico |

---

## Tabla de enlaces verificados (43 artículos)

Todos los DOI están en el Word regenerado bajo **"DOI verificado:"** por artículo.

| N.° | DOI | PDF abierto (si aplica) |
|-----|-----|-------------------------|
| 01 | https://doi.org/10.1016/j.jbusres.2019.09.022 | vía editor |
| 02 | https://doi.org/10.1080/10580530.2020.1814461 | [PDF T&F](https://www.tandfonline.com/doi/pdf/10.1080/10580530.2020.1814461) |
| 03 | https://doi.org/10.25300/misq/2017/41:1.03 | [PDF MISQ](https://misq.umn.edu/misq/article-pdf/41/1/223/5892/11_si_introduction.pdf) |
| 04 | https://doi.org/10.1016/j.technovation.2017.12.004 | vía ScienceDirect |
| 05 | https://doi.org/10.1016/j.ijinfomgt.2020.102103 | vía ScienceDirect |
| 06 | https://doi.org/10.1016/j.ijresmar.2016.11.006 | vía ScienceDirect |
| 07 | https://doi.org/10.1016/j.ijresmar.2018.12.002 | vía ScienceDirect |
| 08 | https://doi.org/10.1108/ijrdm-09-2015-0140 | vía Emerald |
| 09 | https://doi.org/10.1016/j.ijinfomgt.2019.01.021 | vía ScienceDirect |
| 10 | https://doi.org/10.1007/s11747-019-00696-0 | [PDF Springer](http://link.springer.com/content/pdf/10.1007/s11747-019-00696-0.pdf) |
| 11 | https://doi.org/10.1177/0008125619862257 | [PDF Sage](https://journals.sagepub.com/doi/pdf/10.1177/0008125619862257) |
| 12 | https://doi.org/10.1016/j.jbusres.2016.08.009 | vía ScienceDirect |
| 13 | https://doi.org/10.1371/journal.pone.0194889 | [PDF PLOS](https://journals.plos.org/plosone/article/file?id=10.1371/journal.pone.0194889&type=printable) |
| 14 | https://doi.org/10.1016/j.ijforecast.2019.06.004 | vía ScienceDirect |
| 15 | https://doi.org/10.1016/j.indmarman.2017.12.019 | vía ScienceDirect |
| 16 | https://doi.org/10.1016/j.techfore.2020.120392 | vía ScienceDirect |
| 17 | https://doi.org/10.1108/jbim-10-2018-0295 | vía Emerald |
| 18 | https://doi.org/10.1016/j.asoc.2020.106384 | vía ScienceDirect |
| 19 | https://doi.org/10.1016/j.eswa.2017.04.006 | vía ScienceDirect |
| 20 | https://doi.org/10.1016/j.eswa.2018.09.039 | vía ScienceDirect |
| 21 | https://doi.org/10.3390/su12166325 | [PDF MDPI](https://www.mdpi.com/2071-1050/12/16/6325/pdf) |
| 22 | https://doi.org/10.1016/j.eswa.2017.01.016 | vía ScienceDirect |
| 23 | https://doi.org/10.1016/j.ejor.2016.01.012 | vía ScienceDirect |
| 24 | https://doi.org/10.1016/j.ejor.2018.10.024 | vía ScienceDirect |
| 25 | https://doi.org/10.1016/j.jbankfin.2014.12.003 | [PDF autor](https://homepages.uc.edu/~guohu/publications/JBF%20R2%202014%20Final.pdf) |
| 26 | https://doi.org/10.1111/j.1540-6261.1968.tb00843.x | Altman 1968 |
| 27 | https://doi.org/10.2307/2490171 | Beaver 1966 |
| 28 | https://doi.org/10.1109/ms.2018.2141039 | IEEE Software |
| 29 | https://doi.org/10.1016/j.infsof.2020.106368 | Lwakatare 2020 IST |
| 30 | https://doi.org/10.1155/2022/6858916 | [PDF Wiley](https://onlinelibrary.wiley.com/doi/pdf/10.1155/2022/6858916) |
| 31 | https://doi.org/10.1016/j.ejor.2017.11.054 | Fischer & Krauss LSTM |
| 32 | https://doi.org/10.1145/3533378 | [PDF ACM](https://dl.acm.org/doi/pdf/10.1145/3533378) |
| 33 | https://doi.org/10.1145/3487043 | [PDF ACM](https://dl.acm.org/doi/pdf/10.1145/3487043) |
| 34 | https://doi.org/10.1016/j.infsof.2020.106449 | Microservicios calidad |
| 35 | https://doi.org/10.1023/A:1010933404324 | Breiman Random Forests |
| 36 | https://doi.org/10.1016/j.jss.2012.02.033 | Ágil Dingsøyr |
| 37 | https://doi.org/10.1007/s10664-019-09745-1 | Malgonde & Chari |
| 38 | https://doi.org/10.1109/ms.2018.110161245 | Kuhrmann híbrido |
| 39 | https://doi.org/10.1016/j.ijinfomgt.2019.04.003 | Prescriptive analytics |
| 40 | https://doi.org/10.1111/poms.12838 | Big Data operations |
| 41 | https://doi.org/10.1007/s10664-021-09993-1 | [PDF Springer](https://link.springer.com/content/pdf/10.1007/s10664-021-09993-1.pdf) |
| 42 | https://doi.org/10.2307/25148636 | [PDF MISQ Melville](https://misq.umn.edu/misq/article-pdf/28/2/283/1295/6_melville.pdf) |
| 43 | https://doi.org/10.1371/journal.pone.0305639 | [PDF PLOS](https://journals.plos.org/plosone/article/file?id=10.1371/journal.pone.0305639&type=printable) + local |

---

## ¿Está bien desarrollado para la tesis?

**Sí, en contenido analítico:**
- Variables, dimensiones e indicadores por artículo
- Contribución explícita a Calzatura Vilchez
- Evidencia funcional trazada al repo (React, BFF, Supabase, ai-service, Flutter)
- Artículo 43 (Dai et al.) como fuente transversal obligatoria
- Correcciones honestas sobre quiebra vs IRE comercial-operativo

**No, en rigor bibliográfico (antes de esta auditoría):**
- Revistas/autores incorrectos en ~17 entradas
- Artículo 37 citaba una fuente **inexistente**
- Artículo 29 con typo de autor y tipo de publicación erróneo
- Sin DOI/URL en el Word

**Tras regeneración:** `Estado_del_Arte_43_Tablas_CORREGIDO.docx` incluye 43 DOI verificados.

---

## Comandos de revalidación

```powershell
python scripts/validar_estado_arte_43_referencias.py
python scripts/generar_estado_arte_43_tablas.py
```

---

## Fuentes metodológicas de la auditoría

- [CrossRef API](https://api.crossref.org/)
- [SciELO / repositorios ULima, UNE](documentacion/auditoria-encaje-estado-arte-42-tablas.md)
- Verificación manual artículos 04, 09, 25, 29, 37

---

## Formato tabular v2 (junio 2026)

Las tablas básicas de 4 columnas (Variables · Dimensiones · Indicadores · Instrumentos) **no cumplían** el estándar académico de matriz de operacionalización ni de matriz de revisión de literatura. Se consultaron:

| Fuente | Requisito aplicado |
|--------|-------------------|
| UNE — Módulo 4 (matriz de operacionalización) | Def. conceptual, def. operacional, dimensión, indicador, escala, técnica, instrumento |
| SciELO Cuba — guía operacionalización | Tipo de escala, unidad/niveles, procesamiento inferido |
| Tesify / Codina (scoping review) | Objetivo, diseño, muestra, métricas, limitaciones por fuente |
| Matriz síntesis comparativa | Vista consolidada 43 artículos (anexo) |

### Por artículo (43 bloques)

1. **Tabla A — Ficha analítica** (6 columnas): objetivo · diseño · muestra · métricas · limitaciones · encaje Calzatura Vilchez  
2. **Tabla B — Operacionalización VI** (9 columnas): variable · def. conceptual · def. operacional · dimensión · indicador · escala · unidad · técnica · instrumento  
3. **Tabla B — Operacionalización VD** (misma estructura)  
4. Bloques de contribución, evidencia funcional y DOI verificado (sin cambio)

### Anexos

- **Matriz síntesis comparativa** (9 cols. × 43 filas): revisión rápida diseño/variables/eje  
- **Matriz de trazabilidad funcional** (4 cols.): enlace artículo → componente del sistema

### Campos inferidos automáticamente

Cuando un artículo no define explícitamente `objetivo`, `diseno`, `muestra`, `metricas`, `vi_concept`, etc., el generador los infiere desde `vi_instr`, texto de indicadores y metadatos del artículo. Para artículos clave se pueden añadir campos opcionales en `ARTICLES[]` del script.

### Regenerar

```powershell
python scripts/generar_estado_arte_43_tablas.py
```
