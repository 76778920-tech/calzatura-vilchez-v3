# Auditoría del módulo AdminLayout

| Campo | Valor |
|---|---|
| Módulo | AdminLayout (`src/domains/administradores/components/AdminLayout.tsx`) |
| Requisito relacionado | RF administración — A1 Control de acceso por rol, A4 Logout, A5 Cobertura E2E, A6 Sidebar colapsable, A8 Accesibilidad de navegación |
| Fecha de auditoría | 2026-05-02 |
| Commit base | `4f6ce4c` (rama `main`) |
| Auditado por | Revisión interna + análisis estático + E2E |

---

## Alcance del módulo

Envoltorio de todas las rutas `/admin/*`. Gestiona:
- Protección de ruta (Firebase Auth + rol admin) con doble comprobación.
- Sidebar colapsable con preferencia en `localStorage`.
- Toggle de tema claro/oscuro.
- Navegación a todos los módulos del panel (NavLink con estado activo).
- Botones globales: "Ver tienda" y "Cerrar sesión".

---

## Fortalezas verificadas

| Área | Detalle |
|---|---|
| Control de acceso (A1) | Redirige a `/login?redirect=…` si no hay usuario; redirige a `/` si el usuario no es admin. Doble comprobación (`AreaRoute` + `AdminLayout`) es defensa en profundidad. |
| Logout con feedback (A4) | `handleLogout` tiene `try/catch`; toast de éxito y de error. Navega a home al cerrar. |
| Sidebar colapsable (A6) | `localStorage.getItem/setItem("adminSidebarCollapsed")` persiste la preferencia entre recargas. |
| NavLink activo | `className={({ isActive }) => ... }` + `aria-current="page"` automático de React Router v6. |

---

## Hallazgos y estado

### L-01 — ARIA incompleto en sidebar y botón de colapso (WCAG 4.1.2)

**Severidad:** Media — lectores de pantalla no podían identificar el `<aside>` como región de navegación ni el estado expandido/colapsado del sidebar.

**Antes:**
- `<aside>` sin `id` ni `aria-label`.
- `<nav>` sin `aria-label`.
- Botón de colapso sin `aria-expanded` ni `aria-controls`.

**Después:**
- `<aside id="admin-sidebar" aria-label="Menú de administración">` — identificable como landmark.
- `<nav aria-label="Módulos del panel">` — distinguible de otras regiones `<nav>` de la página.
- Botón de colapso: `aria-expanded={!collapsed}` + `aria-controls="admin-sidebar"` + `aria-label` descriptivo.

**Estado:** ✅ Cerrado

---

### L-02 — Sin cobertura E2E del sidebar (A5)

**Severidad:** Media (cobertura) — el componente que protege *todo* el panel admin no tenía ningún test automatizado.

**Antes:** Ningún spec E2E cubría la navegación del sidebar, el toggle de tema ni las acciones globales.

**Después:**

Nuevo spec `e2e/admin-layout.spec.ts` (7 tests):

| ID | Descripción | Trazabilidad | Estado |
|---|---|---|---|
| TC-LAYOUT-001 | Enlace Dashboard tiene `aria-current="page"` en `/admin` | A8 + WCAG 4.1.2 | ✅ |
| TC-LAYOUT-002 | Al navegar a `/admin/ventas` el enlace Ventas recibe `aria-current="page"` | A8 | ✅ |
| TC-LAYOUT-003 | Toggle de tema cambia el `aria-label` del botón al alternar | A6 + WCAG 4.1.2 | ✅ |
| TC-LAYOUT-004 | Botón "Ver tienda" navega a `/` | A8 | ✅ |
| TC-LAYOUT-005 | Botón "Cerrar sesión" muestra toast "Sesión cerrada" | A4 | ✅ |
| TC-LAYOUT-006 | Colapsar sidebar añade clase `collapsed` y `aria-expanded` pasa a `false` | A6 + WCAG 4.1.2 | ✅ |
| TC-LAYOUT-007 | Estado colapsado persiste en `localStorage` tras recargar | A6 | ✅ |

**Nota de implementación:** En `/admin` el **Dashboard** repite enlaces (p. ej. a Productos) fuera del `<nav>` del sidebar. Los tests deben usar `nav[aria-label='Módulos del panel']` como ámbito para evitar ambigüedad en Playwright (strict mode). **TC-LAYOUT-007:** no usar `page.addInitScript` para fijar `adminSidebarCollapsed=false` si el test hace `reload()` después de colapsar: el init script se ejecuta en cada carga y borraría la preferencia; usar `evaluate` una vez antes del primer reload de preparación.

**Estado:** ✅ Cerrado

---

### L-02b — Foco atrapado al colapsar sidebar con teclado (WCAG 2.1.2 / 2.4.3)

**Severidad:** Media — al colapsar el sidebar con Tab + Enter, el foco podía quedar sobre un enlace visualmente oculto.

**Antes:** `toggleCollapsed` cambiaba la clase CSS pero no movía el foco; el elemento activo dentro del sidebar colapsado quedaba invisible para el usuario.

**Después:**
- `mainRef = useRef<HTMLElement>()` en `AdminLayout`.
- `useEffect([collapsed])`: si `collapsed` es `true` y `document.activeElement` está dentro de `#admin-sidebar`, mueve el foco a `<main tabIndex={-1}>`.
- `<main>` tiene `tabIndex={-1}` para ser programáticamente enfocable sin entrar en el tab-order natural.

**Estado:** ✅ Cerrado

---

### L-02c — Sin E2E de colapso persistente del sidebar

**Severidad:** Baja (cobertura) — estado de UI crítico para la preferencia del usuario sin test automatizado.

**Después:** TC-LAYOUT-006 y TC-LAYOUT-007 añadidos al spec (ver tabla L-02).

**Estado:** ✅ Cerrado

---

### L-03 — A1 (menor): comentarios de Firestore en codebase

**Severidad:** Baja — observación de consistencia documental.

**Resultado:** Búsqueda estática (`grep Firestore src/**`) no encontró ninguna referencia a Firestore en los archivos `.ts`/`.tsx` de la aplicación. El codebase usa correctamente Supabase para datos de negocio y Firebase solo para identidad (Auth). No se requiere cambio de código.

**Estado:** ✅ Verificado — sin acción requerida

---

## Riesgos aceptados (no corregidos en este sprint)

| Riesgo | Descripción | Recomendación |
|---|---|---|
| Contraste en modo oscuro (WCAG 1.4.3) | No hay test automatizado de contraste de colores en el tema oscuro. TC-LAYOUT-003 solo verifica el cambio de `aria-label`; no mide ratios de color. | Ejecutar auditoría Lighthouse en modo oscuro; corregir variables CSS si el ratio es < 4.5:1 para texto normal. |

---

## Validación manual recomendada (QA en hardware)

- Navegar el sidebar completo con Tab y Shift+Tab: confirmar que el foco no escapa del sidebar antes de entrar al contenido principal.
- Verificar contraste del texto activo (clase `active`) en modo oscuro con herramienta de contraste de color.
- Probar sidebar en pantalla estrecha (< 768 px): confirmar que el colapso funciona correctamente en móvil.
