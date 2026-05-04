# Auditoría del módulo AdminManufacturers

| Campo | Valor |
|---|---|
| Módulo | AdminManufacturers (`src/domains/fabricantes/pages/AdminManufacturers.tsx`) |
| Requisito relacionado | RF administración — gestión de fabricantes y proveedores |
| Fecha de auditoría | 2026-05-03 |
| Commit base | `4f6ce4c` (rama `main`) |
| Auditado por | Revisión interna + análisis estático + E2E |

---

## Alcance del módulo

CRUD de fabricantes con modal de formulario, validación de DNI (lookup externo opcional), subida de documentos (boletas/guías) a Cloudinary, filtro por estado (activos/inactivos), búsqueda por nombre/DNI/marca, borrado con `window.confirm()`, y `logAudit` en crear/editar/eliminar. Incluye modal de detalle (`detailManufacturer`) y preview de imagen de documento.

---

## Fuentes de datos

| Fetch | Tabla Supabase | Fallo si cae |
|---|---|---|
| `fetchManufacturers()` | `fabricantes` | Toast de error explícito; lista vacía |
| `addManufacturer()` | `fabricantes` (INSERT) | Toast de error |
| `updateManufacturer()` | `fabricantes` (PATCH) | Toast de error |
| `deleteManufacturer()` | `fabricantes` (DELETE) | Toast de error |
| `logAudit` | `auditoria` (INSERT) | Error silencioso absorbido por try/catch |

---

## Hallazgos y estado

### M-01 — Sin cobertura E2E (A5)

**Severidad:** Media (cobertura)

**Antes:** No había ningún test E2E de este módulo.

**Después:**
- Nuevo spec `e2e/admin-manufacturers.spec.ts`:

| ID | Descripción | Estado |
|---|---|---|
| TC-MFR-001 | Pantalla carga con la lista de fabricantes y las métricas de stats | ✅ |
| TC-MFR-002 | Filtro "inactivos" muestra solo fabricantes con `activo = false` | ✅ |
| TC-MFR-003 | Aceptar confirm en borrar llama DELETE + muestra toast "Fabricante eliminado" | ✅ |

**Estado:** ✅ Cerrado

---

### M-02 — Sin informe de módulo (A8)

**Severidad:** Baja (documentación)

**Antes:** No existía `AdminManufacturers-auditoria.md`.

**Después:** Este documento.

**Estado:** ✅ Cerrado

---

## Riesgos aceptados (no corregidos en este sprint)

| Riesgo | Descripción | Recomendación |
|---|---|---|
| Mantenibilidad (A6) | El componente tiene ~760 líneas concentrando formulario, documentos, subida Cloudinary y lógica de DNI. | Extraer `ManufacturerFormModal` como componente separado cuando haya capacidad. |
| DNI lookup externo (A4) | `VITE_DNI_LOOKUP_URL` puede no estar configurada; la validación falla con mensaje específico pero el formulario sigue siendo operativo. | Documentar en `operaciones-credenciales.md` que la URL es opcional. |
| Subida de documentos sin E2E (A5) | El upload a Cloudinary no está cubierto por tests E2E (requeriría mock de Cloudinary). | Agregar E2E con ruta mockeada de Cloudinary cuando haya capacidad. |

---

## Trazabilidad CU-T07

Matriz canónica: `documentacion/cuadros-excel/CU-T07-matriz-pruebas-requisitos.csv` (TC-MFR-001…003).
