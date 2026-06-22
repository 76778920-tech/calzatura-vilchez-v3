# Usabilidad — trazabilidad y evidencia (ISO/IEC 9126-1 / familia 25000)

**Proyecto:** Calzatura Vilchez  
**Característica:** Usabilidad  
**Subcaracterísticas:** Inteligibilidad · Facilidad de aprendizaje · Operabilidad · Atractividad · Cumplimiento de la usabilidad  

**Última revisión:** 2026-06-19  
**Gate:** `npm run ops:verify-usabilidad:ci`

---

## 0. Marco normativo y contexto de uso (ISO 9241-11)

| Elemento | Definición en este proyecto |
|----------|----------------------------|
| **Usuario objetivo** | Cliente final (compra web), administrador de tienda (panel `/admin`), trabajador de tienda (`/staff`) |
| **Tarea principal** | Descubrir producto → carrito → checkout (COD/Stripe); gestionar catálogo, pedidos e IA predictiva |
| **Contexto** | Navegador moderno (Chrome/Firefox/Safari web); viewport móvil vía iPhone 13 en matriz Playwright |
| **Criterios ISO 9241-11** | Eficacia (tareas completadas), eficiencia (pasos/clics), satisfacción (SUS — pendiente sesión formal) |
| **Requisito RNF-USA-01** | Flujo checkout comprensible — `documentacion/05-especificacion-requisitos-software-SRS.md` |
| **Accesibilidad** | WCAG 2.1 nivel AA — SRS + `e2e/accessibility.spec.ts` (axe-core, impacto critical/serious = 0) |

**Importante para la tesis:** los ítems de sesión SUS (participantes reales, puntuación, acta firmada) **no están simulados** en el repositorio. Hasta ejecutar la sesión, el checklist los marca **No** y el gate no exige acta completada.

---

## 1. Inteligibilidad

| N° | Indicador | Evidencia |
|----|-----------|-----------|
| 1 | Navegación por dominios | `src/domains/`, menús público/admin/staff |
| 2 | Rutas identificables | `src/routes/paths.ts` — catálogo, carrito, checkout |
| 3 | Nomenclatura consistente | `AdminLayout.tsx` — `title` en ítems de nav |
| 4 | Etiquetas comprensibles | Formularios auth, checkout con labels visibles |
| 5 | Sin jerga en flujos públicos | Copy tienda en español orientado a cliente |
| 6 | Ayudas visuales | `CheckoutDeliveryMap.tsx` hints; `cartShared.tsx` `aria-label` en cantidades |
| 7 | WCAG E2E rutas públicas | `e2e/accessibility.spec.ts` — home, catálogo, login, registro, carrito |
| 8 | Páginas de ayuda | `paths.ts`: `/ayuda/contactanos`, `rastreo-pedido`, `preguntas-frecuentes`, `cambios-devoluciones` |

---

## 2. Facilidad de aprendizaje

| N° | Indicador | Evidencia |
|----|-----------|-----------|
| 1 | Toasts feedback | Sonner/toast en admin logout, operaciones CRUD |
| 2 | Validación tiempo real | Auth y checkout — validadores en dominio |
| 3 | Ayudas checkout | `CheckoutDeliveryBox.tsx` capas de sugerencia de dirección |
| 4 | Errores accionables admin | Validación formularios productos/pedidos |
| 5 | Selectores IA persistidos | `useAdminPredictionsModel.tsx` — `pred_horizon`, `pred_history`, `pred_alert_days` |
| 6 | E2E registro | `e2e/register-validation.spec.ts` |
| 7 | Feedback datos insuficientes IA | `e2e/admin-predictions.spec.ts` TC-PRED-003 |

---

## 3. Operabilidad

| N° | Indicador | Evidencia |
|----|-----------|-----------|
| 1 | Teclado / ARIA | axe WCAG + `aria-label` carrito; admin nav con roles |
| 2 | Acciones frecuentes ≤ 3 clics | Diseño panel admin — dashboard → módulo en 1–2 clics |
| 3 | Selectores horizonte IA | `AdminPredictionsDashboard.tsx` |
| 4 | Historial persistido | `localStorage` en `useAdminPredictionsModel.tsx` |
| 5 | Confirmación destructiva | `e2e/admin-product-delete.spec.ts` TC-PROD-DEL01/02 |
| 6 | Layout admin accesible | `e2e/admin-layout.spec.ts` — `aria-current`, colapso sidebar |
| 7 | Smoke checkout operable | `e2e/smoke.spec.ts` / `checkout-cod-order.spec.ts` |

---

## 4. Atractividad

| N° | Indicador | Evidencia |
|----|-----------|-----------|
| 1 | Coherencia Tailwind v4 | `@theme` + clases utilitarias en dominios |
| 2 | Animaciones KPIs | framer-motion en predicciones/admin dashboard |
| 3 | Contraste legible | axe serious/critical = 0 en rutas auditadas |
| 4 | Iconografía consistente | Lucide/react-icons en nav admin |
| 5 | Responsive móvil | Playwright `iphone-safari` + `idoneidad-journey.spec.ts` |
| 6 | Tema claro/oscuro | `admin-layout.spec.ts` — toggle tema + persistencia |

---

## 5. Cumplimiento de la usabilidad (RNF-USA-01 + SUS)

| N° | Indicador | Estado | Evidencia |
|----|-----------|--------|-----------|
| 1 | RNF-USA-01 en SRS | ✓ | `05-especificacion-requisitos-software-SRS.md` |
| 2 | WCAG 2.1 AA en SRS | ✓ | Mismo SRS + criterio axe E2E |
| 3 | Instrumento SUS Brooke | ✓ | `documentacion/plantillas/instrumento-sus-calzatura-vilchez.md` |
| 4 | Contexto ISO 9241-11 | ✓ | §0 este documento |
| 5 | E2E axe en CI | ✓ | `.github/workflows/ci.yml` job `e2e` |
| 6 | Trazabilidad + gate | ✓ | Este doc + `verify-usabilidad-iso25000.mjs` |
| 7 | Plantilla acta + consentimiento | ✓ | `documentacion/plantillas/acta-sesion-usabilidad-PLANTILLA.md` |
| 8 | Sesión SUS realizada | ✗ | **Pendiente tesista** — no inventar datos |
| 9 | Acta completada (n ≥ 5) | ✗ | Renombrar plantilla a `acta-sesion-usabilidad-COMPLETADA.md` tras sesión |
| 10 | SUS ≥ 70 y mejoras | ✗ | Registrar en acta completada + issues/backlog |

### Fórmula SUS (Brooke, escala Likert 1–5)

Para cada ítem impares: `score = respuesta - 1`. Para pares: `score = 5 - respuesta`.  
**SUS = (suma scores / 25) × 100**. Benchmark aceptable en literatura: **≥ 68**; umbral proyecto: **≥ 70** (RNF-USA-01).

### Protocolo sesión (tesista)

1. Reclutar **5–8** usuarios no desarrolladores (clientes o perfil similar al SRS).  
2. Aplicar consentimiento informado (Ley 29733 — plantilla en acta).  
3. Tareas guiadas: registro/login, buscar producto, añadir al carrito, iniciar checkout (sin pago real si aplica).  
4. Cuestionario SUS inmediatamente después.  
5. Completar acta con puntuaciones individuales y media; adjuntar capturas anonimizadas si el jurado lo exige.  
6. **No** commitear datos personales; usar iniciales o IDs anónimos (U1…Un).

---

## 6. Tres niveles de evaluación (dashboard)

| Nivel | Instrumento | Usabilidad |
|-------|-------------|------------|
| 1 | Lista de cotejo Sí/No | `dashboard-iso25000/checklists-data.json` |
| 2 | Casos de prueba / gates | TC-PROD-DEL*, TC-LAYOUT-*, accessibility.spec, verify-usabilidad |
| 3 | Actas y capturas | Plantilla acta (vacía); capturas en `calzatura-vilchez/screenshots/` bajo demanda |

---

## 7. Referencias

- ISO/IEC 9126-1 — Usabilidad (subcaracterísticas).  
- ISO/IEC 25010 — Usabilidad incl. accesibilidad.  
- ISO/IEC 25023 — Medidas UAp, ULe, UOp, UEp.  
- ISO 9241-11 — Eficacia, eficiencia, satisfacción.  
- Brooke, J. (1996). SUS — System Usability Scale.  
- UNAM Cap. 14 — Lista de cotejo dicotómica.
