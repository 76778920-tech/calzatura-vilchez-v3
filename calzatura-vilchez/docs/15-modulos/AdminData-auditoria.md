# Auditoría del módulo AdminData

| Campo | Valor |
|---|---|
| Módulo | AdminData (`src/domains/administradores/pages/AdminData.tsx`) |
| Requisito relacionado | RF administración — importación y exportación de datos Excel |
| Fecha de auditoría | 2026-05-03 |
| Commit base | `4f6ce4c` (rama `main`) |
| Auditado por | Revisión interna + análisis estático + E2E |

---

## Alcance del módulo

Import/export masivo de colecciones (`ventasDiarias`, `productoFinanzas`, `fabricantes`, `productos`) vía archivos `.xlsx` (librería `xlsx`). Cada colección tiene configuración de cabeceras, transformación de filas, validación de campos e ID de documento. Registra `logAudit("importar", ...)` con contexto de lote y escenario. Incluye borrado de datos de prueba y limpieza de `ventasDiarias` por fecha. Cache IA se invalida tras importar.

---

## Fuentes de datos

| Operación | Tabla Supabase | Fallo si cae |
|---|---|---|
| Export GET | `ventasDiarias`, `productoFinanzas`, `fabricantes`, `productos` | Toast de error; exportación no ocurre |
| Import UPSERT | Mismas tablas | Toast con error; filas inválidas se reportan |
| Borrado prueba DELETE | `productos`, `fabricantes`, `ventasDiarias` | Toast de error |
| `logAudit` | `auditoria` (INSERT) | Error silencioso absorbido por try/catch |

---

## Hallazgos y estado

### D-01 — Sin cobertura E2E mínima (A5)

**Severidad:** Media (cobertura)

**Antes:** No había ningún test E2E del módulo de datos.

**Después:**
- Nuevo spec `e2e/admin-data.spec.ts`:

| ID | Descripción | Estado |
|---|---|---|
| TC-DATA-001 | Pantalla carga con título "Gestión de Datos Excel" y selector de colecciones | ✅ |
| TC-DATA-002 | Botón "Plantilla" está visible y habilitado para la primera colección | ✅ |

**Estado:** ✅ Cerrado

---

### D-02 — Sin informe de módulo (A8)

**Severidad:** Baja (documentación)

**Antes:** No existía `AdminData-auditoria.md`.

**Después:** Este documento.

**Estado:** ✅ Cerrado

---

## Riesgos aceptados (no corregidos en este sprint)

| Riesgo | Descripción | Recomendación |
|---|---|---|
| Import malicioso / mal formado (A2) | Un archivo Excel con valores extremos o IDs inyectados puede afectar muchas filas. La validación es client-side. | Agregar validación server-side (trigger o RPC) para las columnas críticas; considerar cuarentena de lote antes de aplicar. |
| Mantenibilidad (A6) | El componente supera las 1 200 líneas con la configuración de todas las colecciones embebida. | Extraer `COLLECTIONS` a un módulo separado (`collectionsConfig.ts`) cuando haya capacidad. |
| Cobertura E2E de import (A5) | El flujo completo de importar un archivo `.xlsx` no está cubierto por E2E (requiere simular `<input type="file">`). | Agregar test E2E con `page.setInputFiles` mockeando el endpoint de upsert cuando haya capacidad. |
