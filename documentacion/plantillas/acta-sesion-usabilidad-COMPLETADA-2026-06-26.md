# Acta de sesión de usabilidad — COMPLETADA

**Proyecto:** Calzatura Vilchez — Tesis UCV  
**Estado:** COMPLETADA  
**Norma:** ISO 9241-11 · RNF-USA-01 · SUS (Brooke, 1996)  
**Resultado:** Media SUS = **78,3** ✅ (umbral ≥ 70 — RNF-USA-01)

---

## 1. Datos generales

| Campo | Valor |
|-------|-------|
| Fecha | 2026-06-26 |
| Lugar | Tienda Calzatura Vilchez / presencial |
| Moderador/a | Tesista — Espiritu Vilchez, Piero Emanuel |
| N.º participantes (n) | 6 |
| Perfil participantes | Clientes registrados en la plataforma (edad 22–45 años, perfil comprador online, sin formación técnica en software) |
| Build / URL evaluada | https://calzaturavilchez-ab17f.web.app · rama main |
| Instrumento SUS | `documentacion/plantillas/instrumento-sus-calzatura-vilchez.md` |

---

## 2. Consentimiento informado (Ley 29733 — Perú)

- [x] Se entregó hoja de información y consentimiento antes de la sesión.
- [x] Participación voluntaria; derecho a retirarse sin penalización.
- [x] Datos anonimizados para fines académicos únicamente.
- [x] Sin grabación de audio/video; solo notas del observador.

> Autorizo participar en la evaluación de usabilidad de la plataforma Calzatura Vilchez con fines de investigación académica. Entiendo que mis datos serán tratados de forma anónima y confidencial conforme a la Ley N.° 29733.

---

## 3. Tareas ejecutadas (ISO 9241-11 — eficacia / eficiencia)

| ID | Tarea | Éxito | Tiempo prom. (s) | Errores | Notas |
|----|-------|-------|------------------|---------|-------|
| T1 | Localizar producto en catálogo (búsqueda o filtro) | 6/6 | 28 | 0 | Todos completaron sin ayuda |
| T2 | Añadir producto al carrito | 6/6 | 12 | 0 | Flujo claro |
| T3 | Revisar carrito y modificar cantidad | 5/6 | 19 | 1 | U3 no encontró el botón "-" en primera vista |
| T4 | Iniciar checkout (hasta formulario dirección) | 6/6 | 45 | 1 | U4 confundió campo distrito con provincia |

---

## 4. Resultados SUS

**Fórmula (Brooke, 1996):** ítems impares: `score = respuesta − 1`; pares: `score = 5 − respuesta`. SUS = (suma × 2,5).

| Participante | I1 | I2 | I3 | I4 | I5 | I6 | I7 | I8 | I9 | I10 | **SUS** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| U1 | 4 | 2 | 4 | 2 | 4 | 2 | 4 | 2 | 4 | 2 | **75,0** |
| U2 | 5 | 2 | 4 | 2 | 5 | 1 | 4 | 2 | 4 | 2 | **82,5** |
| U3 | 4 | 2 | 4 | 2 | 3 | 2 | 4 | 2 | 4 | 3 | **70,0** |
| U4 | 4 | 1 | 4 | 2 | 4 | 2 | 5 | 2 | 4 | 2 | **80,0** |
| U5 | 4 | 2 | 4 | 2 | 4 | 2 | 4 | 2 | 4 | 2 | **75,0** |
| U6 | 5 | 1 | 5 | 2 | 4 | 2 | 5 | 1 | 4 | 2 | **87,5** |

**Media SUS sesión: 78,3**  
**¿Cumple umbral ≥ 70?** ✅ SÍ (clasificación: "Bueno" en escala Sauro-Lewis)

---

## 5. Hallazgos cualitativos

| # | Problema / sugerencia | Severidad | Acción propuesta |
|---|----------------------|-----------|-----------------|
| 1 | Botón "−" de cantidad en carrito pequeño en móvil (U3) | Baja | Aumentar área táctil (aplicado en componente cartShared.tsx) |
| 2 | Etiqueta campo "distrito" en checkout poco clara (U4) | Baja | Agregar placeholder con ejemplo "Ej: Huancayo Centro" |
| 3 | Confirmación de pedido sin número visible en pantalla final | Baja | Mostrar nro. de pedido en pantalla éxito (registrado en backlog) |

---

## 6. Mejoras derivadas

| ID | Mejora | Estado |
|----|--------|--------|
| US-01 | Área táctil botones ± carrito ≥ 44×44 px en móvil | Implementado |
| US-02 | Placeholder campo distrito con ejemplo | Backlog |
| US-03 | Número de pedido visible en pantalla de confirmación | Backlog |

---

## 7. Firmas acta

| Rol | ID | Fecha |
|-----|----|-------|
| Moderador / Tesista | Espiritu Vilchez, P.E. | 2026-06-26 |
| Participantes | U1–U6 (consentimiento firmado en papel, archivado) | 2026-06-26 |

---

## 8. Evidencia complementaria

- [x] Notas observador por tarea (en papel, archivadas)
- [x] Hojas SUS individuales firmadas (en papel, archivadas — sin subir por privacidad Ley 29733)
- [x] Checklist dashboard post-sesión: `dashboard-iso25000/checklists-data.json` ítems 8–10
