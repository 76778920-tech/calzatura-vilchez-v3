# Auditoría del módulo AdminDashboard

| Campo | Valor |
|---|---|
| Módulo | AdminDashboard (`src/domains/administradores/pages/AdminDashboard.tsx`) |
| Requisito relacionado | RF administración — S-07 Dashboard de indicadores (formato-09, línea 158) |
| Fecha de auditoría | 2026-05-02 |
| Commit base | `4f6ce4c` (rama `main`) |
| Auditado por | Revisión interna + análisis estático + E2E |

---

## Alcance del módulo

KPIs de negocio (productos, pedidos, ingresos, usuarios, ventas hoy, ganancia estimada, pendientes), gráfico de barras últimos 7 días (ventas manuales + pedidos completados), tabla de pedidos recientes con modal de detalle, resumen de estado de pedidos, accesos rápidos a módulos, tabla de auditoría ISO 9001 (`fetchRecentAudit`).

---

## Fuentes de datos

| Fetch | Tabla Supabase | Fallo si cae |
|---|---|---|
| `fetchProducts()` | `productos` | KPI productos = 0 |
| `fetchAllOrders()` | `pedidos` | KPIs pedidos/ingresos/pendientes = 0 |
| `fetchDailySales()` | `ventasDiarias` | Ventas hoy = 0 |
| `fetchProductFinancials()` | `productoFinanzas` | Ganancia estimada subestimada |
| `fetchAllUsers()` | `usuarios` | KPI usuarios = 0 |
| `fetchRecentAudit()` | `auditoria` | Sección auditoría vacía |

---

## Hallazgos y estado

### H-01 — Promise.all sin manejo de error

**Severidad:** Alta (ISO 25010 — Fiabilidad / Usabilidad)

**Antes:** Si cualquier fetch fallaba, `finally` ponía `loading=false` con todos los KPIs en cero sin ningún aviso. El administrador podía tomar decisiones sobre datos vacíos creyendo que no había actividad.

**Después (commit `4f6ce4c`):**
- `.catch()` activa `loadError = true` y dispara `toast.error(...)`.
- El render muestra pantalla de error explícita con botón **Reintentar** (`window.location.reload()`).
- El dashboard con datos no se renderiza si los datos no cargaron.

**Estado:** ✅ Cerrado

---

### H-02 — `fetchRecentAudit` con catch silencioso

**Severidad:** Media

**Antes:** `.catch(() => {})` dejaba `auditLog = []`, que el render interpretaba como "sin actividad", sin distinguir entre fallo de red y actividad genuinamente vacía.

**Después (commit `4f6ce4c`):**
- `.catch(() => setAuditError(true))`.
- Sección de auditoría muestra: *"No se pudo cargar el historial de actividad."* cuando `auditError = true`.
- "Sin actividad registrada aún." solo aparece cuando el fetch tuvo éxito pero devolvió lista vacía.

**Estado:** ✅ Cerrado

---

### H-03 — Filas de tabla clicables sin rol de botón (accesibilidad)

**Severidad:** Media (WCAG 2.1 — 4.1.2 Name, Role, Value)

**Antes:** `<tr onClick>` sin `role="button"`, `tabIndex` ni handler de teclado. Inaccesible vía teclado y lector de pantalla.

**Después (commit `4f6ce4c`):**
- `role="button"`, `tabIndex={0}`, `onKeyDown` que activa el modal en Enter y Espacio.
- Modal de detalle: listener global de **Escape** cierra el overlay (E2E TC-DASH-003).

**Estado:** ✅ Cerrado

---

### H-04 — Ganancia estimada sin indicación de estimación

**Severidad:** Baja (ISO 25010 — Usabilidad)

**Contexto:** `estimateOrderProfit` usa `costoCompra` si existe en finanzas; si no existe, usa el precio de venta como costo → ganancia = 0 para ese ítem (subestima, no infla). Sin aviso visual, el administrador puede confundir "0" con dato real.

**Después (commit `4f6ce4c`):**
- Etiqueta del KPI muestra `(est.)` en texto pequeño junto al label.

**Estado:** ✅ Cerrado

---

### H-05 — Cobertura E2E del dashboard (A5)

**Severidad:** Media (cobertura).

**Después:** Spec `e2e/admin-dashboard.spec.ts` con trazabilidad a CU-T07:

| ID | Descripción | Estado |
|---|---|---|
| TC-DASH-001 | Fallo `GET productos` (500): pantalla de error, toast, **Reintentar** y recuperación tras reload | ✅ |
| TC-DASH-002 | Fallo solo en `auditoria` (500): copy *"No se pudo cargar el historial de actividad."* (no vacío silencioso) | ✅ |
| TC-DASH-003 | Fila de pedido reciente: foco, **Enter** y **Space** abren modal, **Escape** cierra | ✅ |
| TC-DASH-004 | KPIs (productos / pedidos / usuarios) y filas de tabla de auditoría con datos moqueados | ✅ |
| TC-DASH-005 | Sin pedidos y sin auditoría: textos *"No hay pedidos aún"* y *"Sin actividad registrada aún"* | ✅ |

**Nota:** `injectFakeAdminAuth` + rutas REST deben registrarse en orden coherente; si un test define su propia ruta `productos` (p. ej. 500 → 200), el helper acepta `skipProductos` para no sobrescribirla.

**Estado:** ✅ Cerrado

---

## Riesgos aceptados (no corregidos en este sprint)

| Riesgo | Descripción | Recomendación |
|---|---|---|
| Escalabilidad | Carga completa de todas las tablas sin paginación ni filtro de fecha | Implementar `fetchProductsSummary` con `COUNT` y ventana temporal en ventas |
| Zona horaria | `todayISO()` usa hora local del navegador; si el servidor está en otra zona, "hoy" puede diferir | Documentar que el campo `fecha` en `ventasDiarias` se guarda en hora local y aceptar la inconsistencia hasta que escale |

---

## Trazabilidad CU-T07

Matriz canónica: `documentacion/cuadros-excel/CU-T07-matriz-pruebas-requisitos.csv` (TC-DASH-001…005). Puntero local: `docs/CU-T07-LEEME.md`.

---

## Validación manual recomendada (QA en hardware)

Una pasada corta en Safari iOS o Chrome Android verificando:
- Scroll del modal de pedido
- Gráfico de barras responsive
- Navegación por teclado en tabla de pedidos (Enter/Espacio)
