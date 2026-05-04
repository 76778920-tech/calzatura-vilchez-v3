# Checklist maestro — cierre para defensa de tesis

**Título de tesis (inmutable):** Sistema web de comercio electrónico con un modelo de inteligencia artificial para la predicción del riesgo empresarial en la empresa Calzatura Vilchez.

Marcar `[x]` cuando esté **demostrable con evidencia** (PDF, commit, captura, acta).

## A. Documentación de proyecto y software (ISO / ingeniería)

- [ ] `INDICE-MAESTRO.md` actualizado con versión y fechas.  
- [ ] `00` a `12` revisados y sin placeholders críticos sin justificar.  
- [ ] `INTEGRACION-DOCS-EXISTENTES.md` — docs legado Firestore **corregidas o marcadas obsoletas**.  
- [ ] `CU-T01` a `CU-T08` completados y exportados a PDF para anexos.  
- [ ] Al menos **2 actas** de revisión (`PL-01`) para SRS y plan de pruebas.  
- [ ] RACI en `02` con nombres reales.

## B. Trazabilidad título ↔ producto

- [ ] Demostración **e-commerce** (video o capturas + URL staging).  
- [ ] **Modelo de IA** documentado en `07` con definición de *R* (riesgo).  
- [ ] **Predicción** con métricas en conjunto de prueba (tabla en `07`).  
- [ ] **Calzatura Vilchez** — permiso de datos / carta empresa o anonimización declarada.

## C. Estado del arte

- [ ] `estado_del_arte.md` congelado para versión defensa (tag Git `tesis-eda-v1`).  
- [ ] `CU-T06` — 20 filas EDA con evidencia o “N/A” argumentado.  
- [ ] Literatura **adicional** riesgo/IA si el director exige más allá de los 20 Q1.

## D. Pruebas

- [ ] `npm run quality` verde en commit de release.  
- [ ] Reporte Playwright archivado (HTML/PDF).  
- [ ] Matriz `CU-T07` ≥ 80 % RF Must con al menos un caso.

## E. Automatización (exigencia ingeniero)

- [ ] `CU-T08` — cada fila con **2 respaldos** y evidencia de commit/CI.

## F. Operación y ética

- [ ] Política de datos personales publicada o en anexo legal.  
- [ ] Limitaciones del modelo explicadas al usuario admin (tooltips / ayuda).

## G. Entregables académicos institucionales

- [ ] Formato universidad (portada, índice, numeración).  
- [ ] Anti-plagio / similitud según norma.  
- [ ] Repositorio accesible lectura para jurado (si aplica).

---
**Firma checklist (autor):** ______________  **Fecha:** __________  

**Visto bueno director:** ______________  **Fecha:** __________  
