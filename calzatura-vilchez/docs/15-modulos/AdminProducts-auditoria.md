# Auditoría del módulo AdminProducts

| Campo | Valor |
|---|---|
| Módulo | AdminProducts (`src/domains/productos/pages/AdminProducts.tsx`) |
| Requisito relacionado | RF inventario — IN-15 Gestión de productos, IN-16 Stock por talla y color, IN-17 Gestión de imágenes, IN-18 Códigos internos, IN-19 Finanzas de producto (formato-09) |
| Fecha de auditoría | 2026-05-02 |
| Commit base | `4f6ce4c` (rama `main`) |
| Auditado por | Revisión interna + análisis estático + E2E |

---

## Alcance del módulo

Formulario de creación y edición de productos con variantes, galería de imágenes (Cloudinary), stock por talla y color, códigos internos, finanzas (costo, márgenes, precio sugerido), campo de campaña publicitaria, filtros de lista (categoría, stock, destacado, texto) y guardado atómico vía RPC Supabase.

---

## Fortalezas verificadas

| Área | Detalle |
|---|---|
| RPCs atómicos | `create_product_variants_atomic` y `update_product_atomic` agrupan producto + código + finanzas en una sola transacción Supabase. |
| Validación de imagen | `imageRules.ts` valida tipo, dimensiones y tamaño antes de subir a Cloudinary. |
| Guardrails comerciales | Triggers de BD (`cv_guard_producto_tipo`, `cv_guard_producto_finanzas`) rechazan datos inválidos; `describeCommercialDraftError` traduce el error al usuario. |
| Campo campaña | `campana` presente en tipo `Product`, formulario, payload de edición y payload de creación de variantes; migración aplicada en Supabase. |
| Cobertura E2E base | `admin-commercial-guards.spec.ts`, `admin-code-guards.spec.ts`, `admin-campana.spec.ts`, `admin-variant-chips.spec.ts`, `admin-stock-tallas.spec.ts`. |

---

## Hallazgos y estado

### P-01 — Modal sin gestión de foco (accesibilidad WCAG 2.1 — 2.4.3 / 2.1.2)

**Severidad:** Media

**Antes:** El modal de producto no tenía `role="dialog"` ni `aria-modal`, no atrapaba el foco con Tab/Shift+Tab, no cerraba con Escape y no restauraba el foco al elemento que lo abrió.

**Después (commit siguiente a `4f6ce4c`):**
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby="product-modal-title"` en el div del modal.
- `id="product-modal-title"` en el `<h2>` del encabezado.
- `trapFocus` — handler en `onKeyDown` del modal: Escape cierra, Tab/Shift+Tab ciclan solo dentro del modal.
- `triggerRef` — guarda `document.activeElement` al abrir; `closeModal()` restaura el foco con `setTimeout(..., 0)`.
- `useEffect([showModal])` — focaliza el primer elemento interactivo al montar el modal.
- Todos los puntos de cierre (`Cancelar`, `×`, overlay, Escape) usan `closeModal()`.

**Estado:** ✅ Cerrado

---

### P-02 — E2E no cubría filtros ni accesibilidad del modal

**Severidad:** Baja (cobertura)

**Antes:** Los tests E2E de AdminProducts cubrían guardado de variantes, guardrails de BD, campaña y stock de tallas, pero no los filtros de lista ni el comportamiento del modal con teclado.

**Después:**
- Nuevo spec `e2e/admin-products-filters.spec.ts` (6 tests, todos pasan):

| ID | Descripción | Trazabilidad formato-09 | Estado |
|---|---|---|---|
| TC-PROD-F01 | Filtro por categoría reduce la lista | IN-15 Gestión de productos | ✅ |
| TC-PROD-F02 | Filtro "sin-stock" muestra solo stock=0 | IN-16 Stock por talla y color | ✅ |
| TC-PROD-F03 | Búsqueda por texto filtra por nombre | IN-15 | ✅ |
| TC-PROD-F04 | Búsqueda + categoría aplicadas juntas | IN-15 | ✅ |
| TC-PROD-F05 | Tecla Escape cierra el modal (WCAG 2.1.2) | IN-15 + accesibilidad | ✅ |
| TC-PROD-F06 | Foco regresa al botón de apertura al cerrar | IN-15 + WCAG 2.4.3 | ✅ |

**Estado:** ✅ Cerrado

---

### A5 - Flujo de borrado con confirmacion cubierto por E2E

**Severidad:** Media (cobertura)

**Antes:** `handleDelete` usaba `window.confirm()` para confirmar el borrado y llamaba DELETE en tres tablas (`productos`, `productoCodigos`, `productoFinanzas`). No habia ningun test E2E que verificara ni que el borrado se ejecutara al aceptar ni que no se ejecutara al cancelar.

**Despues:**
- El borrado usa el RPC atomico `delete_product_atomic`.
- Nuevo spec `e2e/admin-product-delete.spec.ts` con `page.once("dialog", ...)` para interceptar `window.confirm()`:

| ID | Descripcion | Estado |
|---|---|---|
| TC-PROD-DEL01 | Aceptar confirm -> RPC `delete_product_atomic` + texto estado vacio + producto no visible (no contar filas: el vacio es un `<tr>`) | OK |
| TC-PROD-DEL02 | Rechazar confirm -> 0 llamadas al RPC + producto permanece | OK |

**Nota:** El handler GET de productos devuelve `[]` despues de la llamada al RPC para simular la recarga de lista que hace el componente tras borrar.

**Estado:** OK Cerrado

---

## Riesgos aceptados (no corregidos en este sprint)

| Riesgo | Descripción | Recomendación |
|---|---|---|
| Mantenibilidad (ISO 25010) | El componente `AdminProducts.tsx` tiene ~1 660 líneas. Concentra formulario, lógica de variantes, drag de carrusel, filtros y carga de datos. | Extraer `ProductFormModal` como componente separado cuando el equipo tenga capacidad. No es urgente siempre que los tests cubran las rutas críticas. |
| Cobertura E2E de imagen | La validación de imagen (tipo, tamaño, dimensiones) solo está cubierta por unit tests (`src/__tests__/`). No hay E2E que simule un upload rechazado. | Agregar test E2E con mock de Cloudinary que devuelva error 400. |
| Scroll / foco en iOS Safari | Las mejoras de `touch-action` y `overscroll-behavior` se aplicaron en CSS, pero no hay test automatizado de scroll táctil. | Validación manual requerida en hardware real (iPhone Safari, Chrome Android). |

---

## Validación manual recomendada (QA en hardware)

- Abrir modal en iPhone Safari: verificar scroll interno, chips de variante y popover de color.
- Navegar el formulario con Tab en Chrome desktop: confirmar que el foco no escapa del modal.
- Verificar que al guardar/cancelar el foco regresa al botón de acción correcto de la tabla.
