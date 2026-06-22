# Funcionalidad — marco normativo, operacionalización y trazabilidad (ISO/IEC 25000)

**Proyecto:** Calzatura Vilchez · Tesis UCV  
**Característica:** Funcionalidad (1.ª del diagrama SQuaRE — calidad interna/externa)  
**Subcaracterísticas:** 5 (Idoneidad, Precisión, Interoperabilidad, Seguridad, Cumplimiento de la funcionalidad)  
**Última revisión:** 2026-06-16

---

## 1. Marco normativo (fuentes confiables)

| Fuente | Rol |
|--------|-----|
| [ISO/IEC 25000](https://www.iso.org/standard/41003.html) | Familia **SQuaRE** — requisitos y evaluación de calidad del producto software. |
| [ISO/IEC 9126-1:2001](https://webstore.iec.ch/en/publication/21587) §6.1 | **Modelo operativo** del dashboard: Funcionalidad + 5 subcaracterísticas (reemplazada por 25010, taxonomía equivalente en adecuación funcional). |
| [ISO/IEC 25010:2011](https://www.iso.org/standard/35733.html) §4.2.1 | **Adecuación funcional** (*functional suitability*): completitud, corrección y pertinencia — referencia cruzada, no estructura la UI de 6 ejes. |
| [ISO/IEC 25023](https://www.iso.org/standard/35747.html) | Medidas de producto cuando aplica (p. ej. métricas de exactitud). |
| [UNAM Cap. 14](https://cuaed.unam.mx/publicaciones/libro-evaluacion/pdf/Capitulo-14-LISTA-DE-COTEJO.pdf) | Formato de lista de cotejo dicotómica (instrumento principal). |
| [TU/e — ISO 9126 reference](https://wstomv.win.tue.nl/edu/2ip30/references/9126ref.html) | Tabla académica de características y subcaracterísticas (validación cruzada). |

**Diagrama de referencia del proyecto:** `iso25000_ref.png` (Funcionalidad en posición 12 h, 5 subcaracterísticas).

---

## 2. Definición de la característica (ISO/IEC 9126-1 §6.1)

> **Funcionalidad:** capacidad del producto software de **proporcionar funciones que satisfacen necesidades explícitas e implícitas** cuando se usa en condiciones especificadas.
>
> *Nota normativa:* esta característica se ocupa de **qué hace** el software para satisfacer necesidades; las demás características se ocupan principalmente de **cuándo y cómo** lo hace (9126-1 §6.1, nota 1).

**Alcance en Calzatura Vilchez:** catálogo, autenticación, carrito, checkout, pagos, administración, IA/IRE, integraciones externas, protección de datos en el producto y cumplimiento legal de la funcionalidad (Ley 29571, 29733, términos e-commerce).

---

## 3. Las cinco subcaracterísticas — definición, diferencia y operacionalización

### 3.1 Idoneidad (*Suitability* — 9126 §6.1.1)

| Aspecto | Contenido |
|---------|-----------|
| **Definición ISO** | Capacidad de proporcionar un **conjunto apropiado de funciones** para tareas y objetivos de usuario especificados. |
| **Equivalente 25010** | Pertinencia funcional (*functional appropriateness*) + cobertura de completitud (*functional completeness*) a nivel de requisitos. |
| **Pregunta clave** | ¿El sistema **tiene las funciones necesarias** para el negocio (e-commerce + IA + admin)? |
| **No evalúa** | Si los cálculos son exactos (→ Precisión) ni si cumple leyes (→ Cumplimiento). |
| **Instrumento** | Matriz CU-T07 · SRS Must · TC-IDON-001 |
| **Gate** | `node scripts/verify-idoneidad-iso25000.mjs` |
| **Trazabilidad** | `documentacion/idoneidad-trazabilidad-iso25000.md` |
| **Dashboard** | 9 ítems checklist · **100 %** |

**Evidencia núcleo:** 26 RF Must con prueba automatizada; recorrido E2E integrador `e2e/idoneidad-journey.spec.ts`.

---

### 3.2 Precisión (*Accuracy* — 9126 §6.1.2)

| Aspecto | Contenido |
|---------|-----------|
| **Definición ISO** | Capacidad de proporcionar **resultados o efectos correctos o acordados** con el **grado de exactitud requerido**. |
| **Equivalente 25010** | Corrección funcional (*functional correctness*). |
| **Pregunta clave** | ¿Stock, precios, totales, finanzas e IRE son **numéricamente correctos**? |
| **No evalúa** | Existencia de funciones (→ Idoneidad) ni contratos API (→ Interoperabilidad). |
| **Instrumento** | 9 dominios de cálculo + guards BFF |
| **Gate** | `node scripts/verify-precision-iso25000.mjs` |
| **Trazabilidad** | `documentacion/precision-trazabilidad-iso25000.md` |
| **Dashboard** | 10 ítems checklist · **100 %** |

**Dominios:** stock talla/color · checkout catálogo vivo · BFF totales · variantes · triggers comerciales · finanzas · ventas tienda · import Excel · predicción/IRE.

**Correlación CF/COF:** el módulo `/adecuacion-funcional/` mide **COF** (transacciones correctas) como indicador dinámico alineado con Precisión.

---

### 3.3 Interoperabilidad (*Interoperability* — 9126 §6.1.3)

| Aspecto | Contenido |
|---------|-----------|
| **Definición ISO** | Capacidad de **interactuar con uno o más sistemas especificados**. |
| **Equivalente 25010** | Interoperabilidad (*interoperability*), antes bajo Compatibilidad. |
| **Pregunta clave** | ¿Firebase, Supabase, Stripe, IA, geocodificación, DNI, CDN y caché **funcionan con contrato verificable**? |
| **No evalúa** | Protección de datos (→ Seguridad) ni exactitud de montos (→ Precisión). |
| **Instrumento** | Matriz 9 integraciones · TC-INT-001…005 |
| **Gate** | `node scripts/verify-interoperabilidad-iso25000.mjs` |
| **Trazabilidad** | `documentacion/interoperabilidad-trazabilidad-iso25000.md` |
| **Dashboard** | 10 ítems checklist · **100 %** |

---

### 3.4 Seguridad (*Security* — 9126 §6.1.4)

| Aspecto | Contenido |
|---------|-----------|
| **Definición ISO** | Capacidad de **proteger información y datos** para que personas o sistemas no autorizados no puedan leerlos o modificarlos, y que los autorizados **no se les niegue el acceso**. |
| **Equivalente 25010** | Característica **Seguridad** de primer nivel (confidencialidad, integridad, autenticidad, responsabilidad, no repudio). En el diagrama 9126 del proyecto permanece **bajo Funcionalidad**. |
| **Pregunta clave** | ¿El producto protege datos, identidad, auditoría y pagos en uso? |
| **No confundir con** | ISO/IEC 27001 (SGSI organizacional). Aquí es **calidad del producto** (SQuaRE). |
| **Instrumento** | RLS · guards · ZAP · PKCS#7 no repudio |
| **Gate** | `node scripts/verify-seguridad-iso25000.mjs` |
| **Trazabilidad** | `documentacion/seguridad-trazabilidad-iso25000.md` |
| **Dashboard** | 21 ítems checklist · **100 %** |

---

### 3.5 Cumplimiento de la funcionalidad (*Functionality compliance* — 9126 §6.1.5)

| Aspecto | Contenido |
|---------|-----------|
| **Definición ISO** | Capacidad de **adherirse a normas, convenciones o reglamentos legales** relacionados con la funcionalidad. |
| **Equivalente 25010** | No hay subcaracterística homónima; se relaciona con requisitos legales del SRS y trazabilidad normativa. |
| **Pregunta clave** | ¿El software cumple **marco legal peruano** (reclamaciones, privacidad, cookies, términos) y **trazabilidad documental** CU-T05/CU-T06/CU-T07? |
| **No evalúa** | Existencia de módulos (→ Idoneidad) ni cifrado (→ Seguridad). |
| **Instrumento** | CU-T05 · RF-LEG · TC-CMP-001…005 |
| **Gate** | `node scripts/verify-cumplimiento-iso25000.mjs` |
| **Trazabilidad** | `documentacion/cumplimiento-trazabilidad-iso25000.md` |
| **Dashboard** | 7 ítems checklist · **100 %** · módulo `/adecuacion-funcional/` |

---

## 4. Matriz de no solapamiento (evitar confusión en la tesis)

| Situación | Subcaracterística correcta |
|-----------|----------------------------|
| Falta módulo de checkout | Idoneidad |
| Total del pedido incorrecto | Precisión |
| Stripe webhook no procesa evento | Interoperabilidad |
| Usuario anónimo accede a `/admin` | Seguridad |
| Falta libro de reclamaciones | Cumplimiento de la funcionalidad |
| API DNI responde 500 pero contrato HTTP OK | Interoperabilidad (contrato); Seguridad si expone datos |

---

## 5. Módulo CF / COF / TECP (indicadores dinámicos)

Integrado en el dashboard (`/adecuacion-funcional/`):

| Indicador | Alineación SQuaRE | Fórmula |
|---------|-------------------|---------|
| **CF** Completitud funcional | Idoneidad / completitud 25010 | Funciones implementadas ÷ requeridas × 100 |
| **COF** Corrección funcional | Precisión / corrección 25010 | Transacciones correctas ÷ evaluadas × 100 |
| **TECP** Tasa éxito casos | Evidencia objetiva nivel 2 | Casos aprobados ÷ ejecutados × 100 |

Estos indicadores **complementan** las listas de cotejo estáticas; no sustituyen los gates `verify-*`.

---

## 6. Resumen de cumplimiento (dashboard)

| Subcaracterística | Ítems checklist | % declarado | Gate |
|-------------------|-----------------|-------------|------|
| Idoneidad | 9 | 100 | verify-idoneidad |
| Precisión | 10 | 100 | verify-precision |
| Interoperabilidad | 10 | 100 | verify-interoperabilidad |
| Seguridad | 21 | 100 | verify-seguridad |
| Cumplimiento de la funcionalidad | 7 | 100 | verify-cumplimiento |
| **Media simple Funcionalidad** | **57** | **100** | — |

Fuente porcentajes: `dashboard-iso25000/data.json` · listas: `checklists-data.json`.

---

## 7. Verificación repetible (todas las subcaracterísticas)

```bash
node scripts/verify-idoneidad-iso25000.mjs
node scripts/verify-precision-iso25000.mjs
node scripts/verify-interoperabilidad-iso25000.mjs
node scripts/verify-seguridad-iso25000.mjs
node scripts/verify-cumplimiento-iso25000.mjs
```

Con pruebas automatizadas: añadir `--run-tests` o `--run-e2e` según cada script.

---

## 8. Sustento bibliográfico Q1 (estado del arte)

Matriz auditoría **27 subcaracterísticas × artículos Q1**: `documentacion/matriz-respaldo-q1-iso27-subcaracteristicas.md`.

| Subcaracterística | Artículos Q1 núcleo | Complemento (huecos) |
|-------------------|---------------------|----------------------|
| Idoneidad | 07, 08, 09, 11, 12, 40, **43** | **45** e-SQ moda/retail |
| Precisión | 13, 14, 19, 25, 35, 41 | art. 30 solo tema (Q2~) |
| Interoperabilidad | 28, 29, 32, 33, 34, 43 | — |
| Seguridad | 33 + normas ISO | **44** zero-trust, **47** ciberataques |
| Cumplimiento | 33, 34, 36, 41 + leyes PE | — |

DOI: `referencias-estado-arte-43-verificadas.json` · complementos **44–48**: `referencias-q1-complementarias-iso25000.json`.

---

## 9. Redacción sugerida para capítulo de calidad (tesis)

> La característica **Funcionalidad** del modelo de calidad interna/externa (ISO/IEC 9126-1, familia SQuaRE 25000) se operacionalizó en cinco subcaracterísticas: Idoneidad, Precisión, Interoperabilidad, Seguridad y Cumplimiento de la funcionalidad. Cada subcaracterística dispone de lista de cotejo dicotómica (UNAM), casos de prueba automatizados y documento de trazabilidad en el repositorio. Los indicadores dinámicos CF, COF y TECP complementan Idoneidad y Precisión mediante el módulo de adecuación funcional integrado al dashboard ISO/IEC 25000.

---

## 10. Referencias

- ISO/IEC 9126-1:2001 — Software engineering — Product quality — Part 1: Quality model (§6.1).  
- ISO/IEC 25010:2011 — System and software quality models (§4.2.1 Functional suitability).  
- ISO/IEC 25000 — SQuaRE overview.  
- Eindhoven TU/e — [9126 quality characteristics reference table](https://wstomv.win.tue.nl/edu/2ip30/references/9126ref.html).  
- Documentos hijos: `idoneidad-`, `precision-`, `interoperabilidad-`, `seguridad-`, `cumplimiento-trazabilidad-iso25000.md`.
