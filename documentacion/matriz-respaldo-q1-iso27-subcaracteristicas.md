# Matriz de respaldo Q1 — 27 subcaracterísticas ISO/IEC 9126-1 (SQuaRE 25000)

**Proyecto:** Calzatura Vilchez · Tesis UCV  
**Corpus principal:** 43 artículos (`Estado_del_Arte_43_Tablas_CORREGIDO.docx`)  
**Verificación DOI:** `documentacion/referencias-estado-arte-43-verificadas.json`  
**Complementos (huecos cerrados):** `documentacion/referencias-q1-complementarias-iso25000.json` (art. 44–48)  
**Última revisión:** 2026-06-16

---

## Veredicto ejecutivo

| Ámbito | Subcaracterísticas | Con ≥1 artículo Q1 publicado | Con evidencia repo (gates) | Estado |
|--------|-------------------|------------------------------|----------------------------|--------|
| **Funcionalidad** | 5 | **5/5** (44 cierra Seguridad) | 5/5 gates `verify-*` | ✅ Defendible |
| **Fiabilidad** | 4 | **4/4** | 4/4 gates (84 % checklist — pendiente evidencia producción) | ✅ Defendible con matiz |
| **Usabilidad** | 5 | **5/5** (45–46 cierran vacío) | 5/5 gates | ✅ Defendible |
| **Eficiencia** | 3 | **3/3** | 3/3 gates | ✅ Defendible |
| **Mantenibilidad** | 5 | **5/5** | 5/5 gates | ✅ Defendible |
| **Portabilidad** | 5 | **5/5** | 5/5 gates | ✅ Defendible |
| **TOTAL** | **27** | **27/27** | **27/27** | ✅ |

**Reservas obligatorias ante jurado (no declarar Q1 sin matiz):**

| Art. | Problema | Acción |
|------|----------|--------|
| **30** | *Complexity* (Wiley) — **Q2** en Scimago, JIF ~1.89 | Citar por **tema** (ML riesgo PYME); **no** rotular Q1 |
| **37** | Fuente original inexistente / actas 2025 | **Retirar** del estado del arte; usar **Malgonde & Chari (2019)** ESE — art. 37 corregido en JSON |
| **23–27** | Quiebra financiera EE.UU. | Solo **antecedente** ML-riesgo; no definición del IRE comercial-operativo |
| **29** | Corregido → **Lwakatare et al. (2020)** *Information and Software Technology* **Q1** | Usar DOI `10.1016/j.infsof.2020.106368` |

---

## Leyenda

- **Q1✓** — Revista Q1 verificada (Scimago/JCR) + DOI publicado  
- **Q1~** — Artículo publicado; cuartil dudoso (30)  
- **NORM** — Norma ISO/IEC (no artículo Q1; complemento normativo)  
- **EVID** — Evidencia empírica del repositorio (prueba/gate)  
- **Art. NN** — Tabla del estado del arte 1–43  
- **Art. 44+** — Complemento Q1 añadido en esta auditoría  

---

## 1. Funcionalidad (5 subcaracterísticas)

### 1.1 Idoneidad (*Suitability*)

| # | Artículo Q1 | DOI | Qué respalda en la tesis | EVID repo |
|---|-------------|-----|--------------------------|-----------|
| 1 | **07** Reinartz et al. (2019) IJRIM | [10.1016/j.ijresmar.2018.12.002](https://doi.org/10.1016/j.ijresmar.2018.12.002) | Transformación digital cadena valor **retail** (catálogo, pedidos, stock) | 26 RF Must + `verify-idoneidad` |
| 2 | **08** Hagberg et al. (2016) IJRDM | [10.1108/ijrdm-09-2015-0140](https://doi.org/10.1108/ijrdm-09-2015-0140) | Digitalización del **retail** | `e2e/idoneidad-journey.spec.ts` |
| 3 | **09** Duan et al. (2019) IJIM | [10.1016/j.ijinfomgt.2019.01.021](https://doi.org/10.1016/j.ijinfomgt.2019.01.021) | IA para decisiones con Big Data | Módulo IA + admin IRE |
| 4 | **11** Shrestha et al. (2019) CMR | [10.1177/0008125619862257](https://doi.org/10.1177/0008125619862257) | IA en estructuras de decisión organizacional | Dashboard admin + predicciones |
| 5 | **12** Amba et al. (2017) JBR | [10.1016/j.jbusres.2016.08.009](https://doi.org/10.1016/j.jbusres.2016.08.009) | Big data analytics → desempeño | KPIs dashboard, ventas diarias |
| 6 | **40** Choi et al. (2018) POM | [10.1111/poms.12838](https://doi.org/10.1111/poms.12838) | Big data en **operaciones** (stock, demanda) | IRE + inventario |
| 7 | **43** Dai et al. (2024) PLOS ONE | [10.1371/journal.pone.0305639](https://doi.org/10.1371/journal.pone.0305639) | **E-commerce + IA + Big Data + PYME** | Fuente transversal obligatoria |
| 8 | **45** Gutiérrez-Rodríguez et al. (2020) JRCS | [10.1016/j.jretconser.2020.102201](https://doi.org/10.1016/j.jretconser.2020.102201) | Calidad servicio **e-fashion / retail** | Catálogo calzado, checkout |
| 9 | **01–02** Verhoef / Soto-Acosta | JBR / ISM | Transformación digital PYME | Contexto Calzatura Vilchez |

**Veredicto:** ✅ **Cubierto** (9+ fuentes Q1 + CF 100% en `/adecuacion-funcional/`).

---

### 1.2 Precisión (*Accuracy*)

| # | Artículo Q1 | DOI | Qué respalda | EVID repo |
|---|-------------|-----|--------------|-----------|
| 1 | **13** Makridakis et al. (2018) PLOS ONE | [10.1371/journal.pone.0194889](https://doi.org/10.1371/journal.pone.0194889) | Forecasting ML — exactitud predictiva | `ai-backtest-gate`, MAE/RMSE |
| 2 | **14** Fildes et al. (2022) IJF | [10.1016/j.ijforecast.2019.06.004](https://doi.org/10.1016/j.ijforecast.2019.06.004) | Forecasting **retail** | Predicción demanda calzado |
| 3 | **19** Barboza et al. (2017) ESWA | [10.1016/j.eswa.2017.04.006](https://doi.org/10.1016/j.eswa.2017.04.006) | ML predicción riesgo (antecedente) | IRE ≠ quiebra — matiz en tesis |
| 4 | **25** Tian et al. (2015) JBF | [10.1016/j.jbankfin.2014.12.003](https://doi.org/10.1016/j.jbankfin.2014.12.003) | Selección variables predictivas | Features IRE |
| 5 | **35** Breiman (2001) Machine Learning | [10.1023/A:1010933404324](https://doi.org/10.1023/A:1010933404324) | **Random Forest** (algoritmo implementado) | `ai-service` RF |
| 6 | **41** Haakman et al. (2021) ESE | [10.1007/s10664-021-09993-1](https://doi.org/10.1007/s10664-021-09993-1) | Validación ciclo de vida modelo IA | CRISP-ML, backtest |
| 7 | **30** Khalid et al. (2022) | [10.1155/2022/6858916](https://doi.org/10.1155/2022/6858916) | ML riesgo PYME (**Q2~**, tema) | Solo antecedente metodológico |

**Veredicto:** ✅ **Cubierto** (COF 100%, guards BFF stock/totales, `verify-precision`).

---

### 1.3 Interoperabilidad (*Interoperability*)

| # | Artículo Q1 | DOI | Qué respalda | EVID repo |
|---|-------------|-----|--------------|-----------|
| 1 | **28** Jamshidi et al. (2018) IEEE Software | [10.1109/ms.2018.2141039](https://doi.org/10.1109/ms.2018.2141039) | **Microservicios** / APIs distribuidas | BFF + Functions + ai-service |
| 2 | **32** Paleyes et al. (2023) ACM CSUR | [10.1145/3533378](https://doi.org/10.1145/3533378) | Despliegue ML producción | Render + Firebase |
| 3 | **33** Martínez-Fernández et al. (2022) ACM TOSEM | [10.1145/3487043](https://doi.org/10.1145/3487043) | Ingeniería software sistemas IA | Contratos BFF↔Supabase↔Stripe |
| 4 | **34** Li et al. (2021) IST | [10.1016/j.infsof.2020.106449](https://doi.org/10.1016/j.infsof.2020.106449) | Atributos calidad microservicios | Arquitectura desacoplada |
| 5 | **29** Lwakatare et al. (2020) IST | [10.1016/j.infsof.2020.106368](https://doi.org/10.1016/j.infsof.2020.106368) | ML industrial escala real | Pipeline IA producción |
| 6 | **43** Dai et al. (2024) | PLOS ONE | Integración IA-Big Data e-commerce | Stack completo |

**Veredicto:** ✅ **Cubierto** (`verify-interoperabilidad`, TC-INT-001…005, Stripe/Firebase/Supabase/DNI).

---

### 1.4 Seguridad (*Security* — producto 9126)

| # | Artículo Q1 | DOI | Qué respalda | EVID repo |
|---|-------------|-----|--------------|-----------|
| 1 | **44** Buck et al. (2021) **Computers & Security** | [10.1016/j.cose.2021.102436](https://doi.org/10.1016/j.cose.2021.102436) | **Zero-trust**, control acceso, autenticación continua | RLS, Firebase Auth, BFF fail-closed |
| 2 | **47** Lallie et al. (2021) **Computers & Security** | [10.1016/j.cose.2021.102248](https://doi.org/10.1016/j.cose.2021.102248) | Campañas ciberataque e-commerce | ZAP baseline, `verify-seguridad` |
| 3 | **33** Martínez-Fernández (2022) TOSEM | [10.1145/3487043](https://doi.org/10.1145/3487043) | Calidad/seguridad en sistemas IA | Guards IA admin, bearer token |
| 4 | **NORM** ISO/IEC 25010 § Seguridad | ISO.org | Confidencialidad, integridad, autenticidad | Matriz Seguridad 25010 |
| 5 | **NORM** Ley 29733 / 29571 | Peru | Privacidad y consumidor | Páginas legales, TC-CMP |

**Veredicto:** ✅ **Cubierto** (hueco cerrado con art. **44** y **47**; antes solo evidencia técnica).

---

### 1.5 Cumplimiento de la funcionalidad (*Functionality compliance*)

| # | Artículo Q1 | DOI | Qué respalda | EVID repo |
|---|-------------|-----|--------------|-----------|
| 1 | **33** TOSEM (2022) | [10.1145/3487043](https://doi.org/10.1145/3487043) | Requisitos no funcionales sistemas IA | SRS + CU-T05 |
| 2 | **34** IST (2021) | [10.1016/j.infsof.2020.106449](https://doi.org/10.1016/j.infsof.2020.106449) | Cumplimiento atributos calidad | Checklists ISO dashboard |
| 3 | **36** Dingsøyr et al. (2012) JSS | [10.1016/j.jss.2012.02.033](https://doi.org/10.1016/j.jss.2012.02.033) | Metodología trazable | CI/CD, WBS |
| 4 | **41** ESE (2021) | [10.1007/s10664-021-09993-1](https://doi.org/10.1007/s10664-021-09993-1) | Ciclo vida IA conforme | Gobierno IA, matriz Excel |
| 5 | **NORM** Ley 29571, 29733 | — | Marco legal peruano | Libro reclamaciones, términos |

**Veredicto:** ✅ **Cubierto** (`verify-cumplimiento`, TC-CMP-001…005, módulo CF/COF/TECP).

---

## 2. Fiabilidad (4 subcaracterísticas)

### 2.1 Madurez

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **34** Li IST microservicios calidad | [10.1016/j.infsof.2020.106449](https://doi.org/10.1016/j.infsof.2020.106449) | CI verde, 34+ specs E2E |
| **41** Haakman ESE ciclo IA | [10.1007/s10664-021-09993-1](https://doi.org/10.1007/s10664-021-09993-1) | Backtest gate |
| **32** Paleyes despliegue ML | [10.1145/3533378](https://doi.org/10.1145/3533378) | Uptime Render |
| **47** Lallie ciberseguridad | [10.1016/j.cose.2021.102248](https://doi.org/10.1016/j.cose.2021.102248) | Incident response doc |

**Veredicto:** ✅ `verify-madurez`, `verify-fiabilidad`

### 2.2 Tolerancia a fallos

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **28** Microservicios IEEE Software | [10.1109/ms.2018.2141039](https://doi.org/10.1109/ms.2018.2141039) | Degradación graceful BFF |
| **32** Paleyes ML deployment | [10.1145/3533378](https://doi.org/10.1145/3533378) | Fallback IA, rate limits |
| **34** IST calidad microservicios | [10.1016/j.infsof.2020.106449](https://doi.org/10.1016/j.infsof.2020.106449) | RPC atómicos, idempotencia |

**Veredicto:** ✅ `verify-tolerancia-fallos`

### 2.3 Capacidad de recuperación

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **32** Paleyes | [10.1145/3533378](https://doi.org/10.1145/3533378) | Rollback deploy, PITR Supabase doc |
| **41** Haakman | [10.1007/s10664-021-09993-1](https://doi.org/10.1007/s10664-021-09993-1) | Re-entrenamiento modelo |
| **40** Choi POM operaciones | [10.1111/poms.12838](https://doi.org/10.1111/poms.12838) | Restore drill |

**Veredicto:** ✅ `verify-recuperacion`, `restore-drill-check.mjs`

### 2.4 Cumplimiento de la fiabilidad

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **34** IST | [10.1016/j.infsof.2020.106449](https://doi.org/10.1016/j.infsof.2020.106449) | Gates fiabilidad |
| **NORM** ISO/IEC 25010 Fiabilidad | — | Dashboard 4 ítems |

**Veredicto:** ✅ `verify-cumplimiento-fiabilidad`

---

## 3. Usabilidad (5 subcaracterísticas)

### 3.1 Inteligibilidad

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **45** Gutiérrez JRCS e-SQ moda | [10.1016/j.jretconser.2020.102201](https://doi.org/10.1016/j.jretconser.2020.102201) | Claridad catálogo/checkout |
| **07–08** Retail digital | IJRIM / IJRDM | Navegación tienda |
| **46** Weichbroth IEEE Access SLR móvil | [10.1109/ACCESS.2020.2981892](https://doi.org/10.1109/ACCESS.2020.2981892) | Legibilidad UI móvil |

**Veredicto:** ✅ `verify-usabilidad`, SUS/heurísticas doc

### 3.2 Facilidad de aprendizaje

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **46** Weichbroth (2020) | [10.1109/ACCESS.2020.2981892](https://doi.org/10.1109/ACCESS.2020.2981892) | Onboarding registro |
| **02** Soto-Acosta PYME digital | [10.1080/10580530.2020.1814461](https://doi.org/10.1080/10580530.2020.1814461) | Adopción digital PYME |

**Veredicto:** ✅ Flujos guiados checkout, tooltips admin

### 3.3 Operabilidad

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **45** Gutiérrez e-SQ | [10.1016/j.jretconser.2020.102201](https://doi.org/10.1016/j.jretconser.2020.102201) | Operación e-commerce moda |
| **10** Davenport JAMS IA marketing | [10.1007/s11747-019-00696-0](https://doi.org/10.1007/s11747-019-00696-0) | Operaciones comerciales IA |

**Veredicto:** ✅ E2E checkout responsive, admin workflows

### 3.4 Atractividad

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **45** Gutiérrez | [10.1016/j.jretconser.2020.102201](https://doi.org/10.1016/j.jretconser.2020.102201) | Satisfacción e-loyalty moda |
| **06** Kannan IJRM marketing digital | [10.1016/j.ijresmar.2016.11.006](https://doi.org/10.1016/j.ijresmar.2016.11.006) | Experiencia digital |

**Veredicto:** ✅ UI marca Calzatura, capturas dashboard

### 3.5 Cumplimiento de la usabilidad

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **34** IST atributos calidad | [10.1016/j.infsof.2020.106449](https://doi.org/10.1016/j.infsof.2020.106449) | ISO 9126 usabilidad |
| **NORM** ISO 9241-11 (referencia) | — | Eficacia/eficiencia/satisfacción |

**Veredicto:** ✅ Checklist usabilidad 100%

---

## 4. Eficiencia (3 subcaracterísticas)

### 4.1 Comportamiento en el tiempo

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **28** Microservicios | [10.1109/ms.2018.2141039](https://doi.org/10.1109/ms.2018.2141039) | Latencia API |
| **34** IST | [10.1016/j.infsof.2020.106449](https://doi.org/10.1016/j.infsof.2020.106449) | Performance microservicios |
| **40** Choi POM | [10.1111/poms.12838](https://doi.org/10.1111/poms.12838) | Operaciones tiempo real |
| **32** Paleyes | [10.1145/3533378](https://doi.org/10.1145/3533378) | SLA ML producción |

**Veredicto:** ✅ k6 load tests, `verify-eficiencia` (comportamiento tiempo)

### 4.2 Uso de recursos

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **40** Choi | [10.1111/poms.12838](https://doi.org/10.1111/poms.12838) | Optimización operaciones |
| **29** Lwakatare IST | [10.1016/j.infsof.2020.106368](https://doi.org/10.1016/j.infsof.2020.106368) | Recursos ML escala |

**Veredicto:** ✅ Métricas Render, bundle size Vite

### 4.3 Cumplimiento de la eficiencia

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **34** IST | [10.1016/j.infsof.2020.106449](https://doi.org/10.1016/j.infsof.2020.106449) | Atributos eficiencia ISO |

**Veredicto:** ✅ Gate eficiencia dashboard

---

## 5. Mantenibilidad (5 subcaracterísticas)

### 5.1 Analizabilidad

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **33** TOSEM SE for AI | [10.1145/3487043](https://doi.org/10.1145/3487043) | Trazabilidad requisitos |
| **34** IST microservicios | [10.1016/j.infsof.2020.106449](https://doi.org/10.1016/j.infsof.2020.106449) | Observabilidad |
| **37** Malgonde & Chari (2019) ESE | [10.1007/s10664-019-09745-1](https://doi.org/10.1007/s10664-019-09745-1) | Análisis empírico (anexo) |

**Veredicto:** ✅ SonarQube, ESLint, `verify-mantenibilidad`

### 5.2 Modificabilidad

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **33** TOSEM | [10.1145/3487043](https://doi.org/10.1145/3487043) | Evolución sistemas IA |
| **36** Dingsøyr JSS ágil | [10.1016/j.jss.2012.02.033](https://doi.org/10.1016/j.jss.2012.02.033) | Iteraciones cortas |

**Veredicto:** ✅ Dominios desacoplados, CODEOWNERS

### 5.3 Estabilidad

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **34** IST | [10.1016/j.infsof.2020.106449](https://doi.org/10.1016/j.infsof.2020.106449) | Regresión calidad |
| **41** ESE | [10.1007/s10664-021-09993-1](https://doi.org/10.1007/s10664-021-09993-1) | Estabilidad modelos |

**Veredicto:** ✅ Vitest + E2E CI, 34 specs Playwright

### 5.4 Facilidad de prueba

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **33** TOSEM | [10.1145/3487043](https://doi.org/10.1145/3487043) | Testing sistemas IA |
| **41** ESE | [10.1007/s10664-021-09993-1](https://doi.org/10.1007/s10664-021-09993-1) | Validación ML |

**Veredicto:** ✅ Pytest ai-service, Vitest, Playwright

### 5.5 Cumplimiento de la mantenibilidad

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **34** IST | [10.1016/j.infsof.2020.106449](https://doi.org/10.1016/j.infsof.2020.106449) | Mantenibilidad ISO |

**Veredicto:** ✅ Gate mantenibilidad 100%

---

## 6. Portabilidad (5 subcaracterísticas)

### 6.1 Adaptabilidad

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **28** Microservicios | [10.1109/ms.2018.2141039](https://doi.org/10.1109/ms.2018.2141039) | Cloud multi-proveedor |
| **02** Soto-Acosta | [10.1080/10580530.2020.1814461](https://doi.org/10.1080/10580530.2020.1814461) | PYME cloud |
| **46** Weichbroth móvil | [10.1109/ACCESS.2020.2981892](https://doi.org/10.1109/ACCESS.2020.2981892) | Web + Flutter |

**Veredicto:** ✅ Web + mobile + BFF Render

### 6.2 Instalabilidad

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **36** Dingsøyr ágil | [10.1016/j.jss.2012.02.033](https://doi.org/10.1016/j.jss.2012.02.033) | Despliegue continuo |
| **38** Kuhrmann IEEE Software híbrido | [10.1109/ms.2018.110161245](https://doi.org/10.1109/ms.2018.110161245) | Prácticas instalación |

**Veredicto:** ✅ Docker, Firebase deploy, CI/CD

### 6.3 Coexistencia

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **28** Microservicios | [10.1109/ms.2018.2141039](https://doi.org/10.1109/ms.2018.2141039) | Convivencia servicios |
| **34** IST | [10.1016/j.infsof.2020.106449](https://doi.org/10.1016/j.infsof.2020.106449) | Multi-tenant patterns |

**Veredicto:** ✅ Supabase + Firebase + Stripe coexistiendo

### 6.4 Reemplazabilidad

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **28** | [10.1109/ms.2018.2141039](https://doi.org/10.1109/ms.2018.2141039) | Sustitución componentes |
| **34** | [10.1016/j.infsof.2020.106449](https://doi.org/10.1016/j.infsof.2020.106449) | Interfaces desacopladas |

**Veredicto:** ✅ Adapters BFF, mocks E2E

### 6.5 Cumplimiento de la portabilidad

| Artículos Q1 | DOI | EVID |
|--------------|-----|------|
| **NORM** ISO/IEC 25023 FAd/FIn/FRe | — | `portabilidad-mapeo-iso25023.md` |
| **34** IST | [10.1016/j.infsof.2020.106449](https://doi.org/10.1016/j.infsof.2020.106449) | Portabilidad arquitectura |

**Veredicto:** ✅ `verify-adaptabilidad`, browser matrix

---

## 7. Artículos del corpus 43 — estado Q1 uno por uno

| N.° | Q1 publicado | DOI verificado | Respaldo ISO principal | Nota |
|-----|---------------|----------------|------------------------|------|
| 01 | ✅ JBR | OK | Idoneidad, Portabilidad contexto | |
| 02 | ✅ ISM | OK | Idoneidad, Usabilidad PYME | |
| 03 | ✅ MISQ | OK | Metodología innovación | Secundario |
| 04 | ✅ Technovation | CORREGIDO | Idoneidad modelo negocio | |
| 05 | ✅ IJIM | CORREGIDO | Marketing digital | Secundario |
| 06 | ✅ IJRM | OK | Usabilidad/marketing | Secundario |
| 07 | ✅ IJRIM | OK | **Idoneidad retail** | Núcleo |
| 08 | ✅ IJRDM | OK | **Idoneidad retail** | Núcleo |
| 09 | ✅ IJIM | CORREGIDO | **IA decisiones** | Usar DOI Duan 2019 |
| 10 | ✅ JAMS | OK | Operabilidad IA comercial | |
| 11 | ✅ CMR | OK | **IA decisiones** | Núcleo |
| 12 | ✅ JBR | OK | **Big data desempeño** | Núcleo |
| 13 | ✅ PLOS ONE | OK | **Precisión forecasting** | Núcleo |
| 14 | ✅ IJF | OK | **Precisión retail** | Núcleo |
| 15 | ✅ IMM | OK | IA ventas | Secundario |
| 16 | ✅ Tech Forecasting | CORREGIDO | IA innovación | Secundario |
| 17 | ✅ JBIM | CORREGIDO | IA mercado | Secundario |
| 18 | ✅ Applied Soft Comp | OK | Precisión finanzas DL | Antecedente |
| 19 | ✅ ESWA | OK | **ML riesgo** | Antecedente IRE |
| 20 | ✅ ESWA | OK | Quiebra CNN | Antecedente |
| 21 | ✅ Sustainability | OK | Default ML review | Antecedente |
| 22 | ✅ ESWA | OK | Evolución quiebra | Antecedente |
| 23 | ✅ EJOR | OK | Ratios quiebra | Solo marco teórico |
| 24 | ✅ EJOR | OK | Texto quiebra | Antecedente |
| 25 | ✅ JBF | OK | **Variables predictivas** | Núcleo |
| 26 | ✅ J Finance | OK | Altman clásico | Marco teórico |
| 27 | ✅ JAR | OK | Beaver clásico | Marco teórico |
| 28 | ✅ IEEE Software | OK | **Interoperabilidad** | Núcleo |
| 29 | ✅ IST | CORREGIDO | Interoperabilidad ML ops | Ya no workshop |
| 30 | ⚠️ Q2~ Complexity | OK DOI | Precisión riesgo PYME | **No declarar Q1** |
| 31 | ✅ EJOR | OK | LSTM series | Antecedente |
| 32 | ✅ ACM CSUR | OK | **Despliegue ML** | Núcleo |
| 33 | ✅ ACM TOSEM | OK | **SE sistemas IA** | Núcleo |
| 34 | ✅ IST | OK | **Calidad ISO microservicios** | Núcleo transversal |
| 35 | ✅ Machine Learning | CORREGIDO | **Random Forest** | Núcleo |
| 36 | ✅ JSS | OK | Metodología ágil | Anexo |
| 37 | ❌→✅ ESE Malgonde | REEMPLAZADO | Mantenibilidad anexo | No sprint prediction |
| 38 | ✅ IEEE Software | OK | Metodología híbrida | Anexo |
| 39 | ✅ IJIM | OK | **Analítica prescriptiva** | Núcleo |
| 40 | ✅ POM | OK | **Operaciones Big Data** | Núcleo |
| 41 | ✅ ESE | OK | **Ciclo vida IA** | Núcleo |
| 42 | ✅ MISQ | OK | Valor TI | Secundario |
| 43 | ✅ PLOS ONE | OK | **E-commerce+IA+PYME** | **Obligatorio** |

**Complementos 44–48:** ver JSON complementario (Seguridad + Usabilidad cerrados).

---

## 8. Cómo citar en la tesis (plantilla)

> La subcaracterística *[nombre]* se sustenta en *[Autor et al., año]* ([revista Q1], DOI: …), quienes …; la implementación en Calzatura Vilchez se verifica mediante *[gate/prueba]* (evidencia: *[ruta repo]*).

Para artículos **18–27** añadir siempre:

> *Antecedente de predicción de riesgo financiero con ML; el IRE del sistema opera sobre riesgo comercial-operativo (stock, ingresos, demanda), no quiebra corporativa.*

---

## 9. Comandos de revalidación

```powershell
python scripts/validar_estado_arte_43_referencias.py
node scripts/verify-idoneidad-iso25000.mjs
node scripts/verify-precision-iso25000.mjs
node scripts/verify-interoperabilidad-iso25000.mjs
node scripts/verify-seguridad-iso25000.mjs
node scripts/verify-cumplimiento-iso25000.mjs
node scripts/verify-fiabilidad-iso25000.mjs
node scripts/verify-usabilidad-iso25000.mjs
node scripts/verify-mantenibilidad-iso25000.mjs
node scripts/verify-adaptabilidad-iso25000.mjs
```

---

## 10. Integración dashboard evidencias

Incluir en capítulo / anexo CU-T06 una fila por subcaracterística apuntando a este documento y al artículo Q1 principal. Los gates `verify-*` siguen siendo la **prueba empírica**; los artículos Q1 son el **sustento científico**.
