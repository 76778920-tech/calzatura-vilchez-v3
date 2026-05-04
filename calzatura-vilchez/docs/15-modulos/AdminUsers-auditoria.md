# Auditoría del módulo AdminUsers

| Campo | Valor |
|---|---|
| Módulo | AdminUsers (`src/domains/usuarios/pages/AdminUsers.tsx`) |
| Requisito relacionado | RF administración — gestión de roles y perfiles |
| Fecha de auditoría | 2026-05-03 |
| Commit base | `4f6ce4c` (rama `main`) |
| Auditado por | Revisión interna + análisis estático + E2E |

---

## Alcance del módulo

Listado paginable de perfiles de usuario con KPIs por rol (`cliente`, `trabajador`, `admin`), búsqueda por nombre/DNI/correo/teléfono, filtro por rol, cambio de rol inline con `updateUserRole` (que llama a `logAudit("cambiar_estado", "usuario", ...)`), protección de roles de admin para no-superadmin, y conteo de pedidos por usuario cruzando la tabla `pedidos`.

---

## Fuentes de datos

| Fetch | Tabla Supabase | Fallo si cae |
|---|---|---|
| `fetchAllUsers()` | `usuarios` | Lista vacía silenciosa |
| `fetchAllOrders()` | `pedidos` | Conteo de pedidos = 0 para todos |
| `updateUserRole()` | `usuarios` (PATCH) | Toast de error; rol local no cambia |

---

## Hallazgos y estado

### U-01 — Sin cobertura E2E (A5)

**Severidad:** Media (cobertura)

**Antes:** No había ningún test E2E de este módulo.

**Después:**
- Nuevo spec `e2e/admin-users.spec.ts`:

| ID | Descripción | Estado |
|---|---|---|
| TC-USR-001 | KPIs (Total / Clientes / Trabajadores / Admins) reflejan los datos moqueados | ✅ |
| TC-USR-002 | Filtro por rol "cliente" muestra solo los usuarios con ese rol | ✅ |
| TC-USR-003 | No-superadmin: select de rol para cuentas admin está deshabilitado | ✅ |
| TC-USR-004 | Error RLS 42501 en cambio de rol muestra "Sin permisos" sin código técnico | ✅ |

**Estado:** ✅ Cerrado

---

### U-02 — Sin informe de módulo (A8)

**Severidad:** Baja (documentación)

**Antes:** No existía `AdminUsers-auditoria.md`.

**Después:** Este documento.

**Estado:** ✅ Cerrado

---

## Matriz de roles

| Rol | Puede cambiar cliente↔trabajador | Puede asignar admin | Puede ser editado por no-superadmin |
|---|---|---|---|
| `cliente` | ✅ cualquier admin | ❌ | ✅ |
| `trabajador` | ✅ cualquier admin | ❌ | ✅ |
| `admin` | ❌ (solo superadmin) | ❌ (solo superadmin) | ❌ |
| Superadmin (`isSuperAdminEmail`) | ✅ | ✅ | ❌ (self-protect) |

---

## Riesgos aceptados (no corregidos en este sprint)

| Riesgo | Descripción | Recomendación |
|---|---|---|
| PII en pantalla (A1) | La tabla muestra correo, DNI y teléfono de todos los usuarios registrados. | Documentar en política de privacidad; restringir acceso al terminal. |
| Sin paginación (A7) | `fetchAllUsers()` carga todos los perfiles sin límite. | Implementar paginación o búsqueda server-side cuando el volumen lo exija. |

---

## Trazabilidad CU-T07

Matriz canónica: `documentacion/cuadros-excel/CU-T07-matriz-pruebas-requisitos.csv` (TC-USR-001…004).
