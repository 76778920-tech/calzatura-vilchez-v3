# Planes de Prueba — Calzatura Vilchez E-Commerce

**Proyecto:** Calzatura Vilchez V3  
**Stack:** React 19 + TypeScript + Vite | Firebase Auth | Supabase (PostgreSQL/PostgREST) | Stripe | FastAPI IA  
**Fecha de elaboración:** 2026-05-08  
**Autor:** Espiritu Vilchez Piero Emanuel

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Pruebas automatizadas — Unitarias (Vitest)](#2-pruebas-automatizadas--unitarias-vitest)
3. [Pruebas automatizadas — E2E (Playwright)](#3-pruebas-automatizadas--e2e-playwright)
4. [Pruebas no automatizadas — Manuales](#4-pruebas-no-automatizadas--manuales)
5. [Matriz de cobertura](#5-matriz-de-cobertura)
6. [Entornos y herramientas](#6-entornos-y-herramientas)

---

## 1. Resumen ejecutivo

| Tipo | Framework | Nº de archivos | Nº aprox. de casos |
|---|---|---|---|
| Unitarias frontend | Vitest | 16 archivos | ~130 casos |
| E2E UI | Playwright (Chromium) | 27 archivos | ~70 casos |
| Unitarias / integración backend IA | Pytest | 7 suites | ~80 casos |
| Manuales | — | — | ~50 casos |

**CI/CD:**
- `ci.yml` — lint + Vitest + build + E2E Playwright en todo push/PR (mocks de red).
- `ci-integration.yml` — Vitest + cobertura + Pytest + E2E con credenciales reales, solo al integrar a `main`.

---

## 2. Pruebas automatizadas — Unitarias (Vitest)

> Ubicación: `calzatura-vilchez/src/__tests__/` y `src/utils/emailValidation.test.ts`  
> Ejecutar con: `npm run test` (o `vitest run`)

---

### 2.1 TC-FINANCE — Cálculo de rangos de precio

**Archivo:** `src/__tests__/finance.test.ts`  
**Módulo probado:** `src/domains/ventas/services/finance.ts` → `calculatePriceRange`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-FIN-001 | Cálculo con márgenes estándar (costo=100, 20/35/55) | precioMinimo=120, precioSugerido=135, precioMaximo=155 |
| TC-FIN-002 | Los márgenes se devuelven tal como se pasaron | margenMinimo=20, margenObjetivo=35, margenMaximo=55 |
| TC-FIN-003 | Redondea a dos decimales (costo=75) | precioSugerido=101.25 |
| TC-FIN-004 | Usa márgenes por defecto cuando no se especifican | margenObjetivo=45 |
| TC-FIN-005 | Costo negativo tratado como cero | precioMinimo=0 |
| TC-FIN-006 | Margen negativo tratado como cero | precioMinimo=100 |
| TC-FIN-007 | margenObjetivo < margenMinimo → se ajusta al mínimo | margenObjetivo=40 |
| TC-FIN-008 | margenMaximo < margenObjetivo → se ajusta al objetivo | margenMaximo=50 |
| TC-FIN-009 | Funciona con costo cero | precioMinimo=0 |

---

### 2.2 TC-STOCK — Utilidades de inventario por talla

**Archivo:** `src/__tests__/stock.test.ts`  
**Módulo probado:** `src/utils/stock.ts` → `sumSizeStock`, `getSizeStock`, `getAvailableSizes`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-STK-001 | `sumSizeStock` suma cantidades por talla | `{40:2, 41:3}` → 5 |
| TC-STK-002 | `sumSizeStock` trata NaN como cero | `{40:NaN, 41:2}` → 2 |
| TC-STK-003 | `sumSizeStock` objeto vacío devuelve cero | `{}` → 0 |
| TC-STK-004 | `getSizeStock` devuelve stock de talla específica | talla "39" → 4 |
| TC-STK-005 | `getSizeStock` sin talla usa stock agregado | → 12 |
| TC-STK-006 | `getSizeStock` sin `tallaStock` cae en `product.stock` | → 7 |
| TC-STK-007 | `getAvailableSizes` lista tallas con stock > 0, ordenadas | `["39","41"]` |
| TC-STK-008 | `getAvailableSizes` sin `tallaStock` devuelve `tallas[]` | `["38","39"]` |
| TC-STK-009 | `getAvailableSizes` sin ninguno devuelve array vacío | `[]` |

---

### 2.3 TC-COLORS — Utilidades de colores de producto

**Archivo:** `src/__tests__/colors.test.ts`  
**Módulo probado:** `src/utils/colors.ts`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-COL-001 | `capitalizeWords` capitaliza cada palabra | "negro mate" → "Negro Mate" |
| TC-COL-002 | Convierte a minúscula primero | "NEGRO MATE" → "Negro Mate" |
| TC-COL-003 | Elimina espacios extra internos | "  negro   mate  " → "Negro Mate" |
| TC-COL-004 | Input vacío devuelve cadena vacía | "" → "" |
| TC-COL-005 | Input `undefined` devuelve cadena vacía | undefined → "" |
| TC-COL-006 | Preserva caracteres acentuados | "azul añil" → "Azul Añil" |
| TC-COL-007 | `parseColorList` vacío → lista vacía | "" → [] |
| TC-COL-008 | `parseColorList` deduplica case-insensitive | "Negro,negro,NEGRO" → ["Negro"] |
| TC-COL-009 | `parseColorList` limita a 5 colores | 7 colores → 5 |
| TC-COL-010 | `getProductColors` prioriza `colores[]` sobre `color` string | ["Camel","Blanco"] |
| TC-COL-011 | `getProductColors` cae a `color` si `colores[]` es vacío | ["Negro"] |
| TC-COL-012 | `formatColors` une con coma y espacio | "Negro, Blanco, Camel" |
| TC-COL-013 | `formatColors` lista vacía → cadena vacía | "" |

---

### 2.4 TC-EMAIL — Validación de formato de correo

**Archivo:** `src/utils/emailValidation.test.ts`  
**Módulo probado:** `src/utils/emailValidation.ts`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-EML-001 | `normalizeEmailInput` trim + lowercase | "  User@GMAIL.COM  " → "user@gmail.com" |
| TC-EML-002 | Correo vacío → mensaje de error | "Ingrese un correo electrónico" |
| TC-EML-003 | Formatos .pe y .com.pe son válidos | null (sin error) |
| TC-EML-004 | Sin arroba → formato inválido | "Formato de correo no válido" |
| TC-EML-005 | Plus tags y dominios en mayúscula → válido | null |
| TC-EML-006 | Dominio con guión inicial / final → inválido | no null |
| TC-EML-007 | Puntos consecutivos en local part → inválido | no null |
| TC-EML-008 | `isValidEmailFormat` espeja `validateEmailFormat` | true/false correcto |

---

### 2.5 TC-FAMILY — Agrupación de familias de producto

**Archivo:** `src/__tests__/productFamily.test.ts`  
**Módulo probado:** `src/utils/productFamily.ts`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-FAM-001 | Usa `familiaId` cuando viene informado | → "familia-uuid-abc" |
| TC-FAM-002 | Ignora espacios en `familiaId` | "  same  " → "same" |
| TC-FAM-003 | `familiaId` vacío usa `id` del producto | → "legacy-99" |
| TC-FAM-004 | Sin `familiaId` usa `id` | → "solo" |
| TC-FAM-005 | `tallyFamilyGroupSizes` agrupa por `familiaId` compartido | {fam-1:2, fam-2:1} |
| TC-FAM-006 | Sin `familiaId` agrupa por `id` individual | {x:1, y:1} |
| TC-FAM-007 | Variante apuntando al `id` del padre suma con el padre | {padre-id:2} |

---

### 2.6 TC-COMMERCIAL — Reglas comerciales de producto

**Archivos:** `src/__tests__/commercialRules.test.ts`, `src/__tests__/commercialProductDraft.test.ts`  
**Módulo probado:** `src/domains/productos/utils/commercialRules.ts`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-COM-001 | `normalizeAdminCategory` alias "mujer" → "dama" | "dama" |
| TC-COM-002 | Categoría desconocida → "hombre" | "hombre" |
| TC-COM-003 | Categoría vacía/undefined → "hombre" | "hombre" |
| TC-COM-004 | `sizesForCategory` hombre incluye tallas 37–45 | contiene "37" y "45" |
| TC-COM-005 | `sizesForCategory` bebé incluye tallas 18–22 | contiene "18", no "23" |
| TC-COM-006 | `sizesForCategory` categoría desconocida → vacío | [] |
| TC-COM-007 | `footwearTypesForCategory` dama incluye Zapatillas y Sandalias | ✓ |
| TC-COM-008 | `footwearTypesForCategory` hombre no incluye Ballerinas | ✓ |
| TC-COM-009 | `styleIsAllowedForType` Urbanas válido para Zapatillas | true |
| TC-COM-010 | `styleIsAllowedForType` Urbanas NO válido para Zapatos de Vestir | false |
| TC-COM-011 | `styleIsAllowedForType` estilo vacío siempre válido | true |
| TC-COM-012 | `materialIsAllowed` materiales de la paleta (Cuero, Gamuza, etc.) | true |
| TC-COM-013 | `materialIsAllowed` material fuera de paleta (Plástico) | false |
| TC-COM-014 | `materialIsAllowed` campo vacío es opcional | true |
| TC-COM-015 | `orderedStyleTokensFromCsv` mantiene orden canónico | ["Urbanas","Weekend"] |
| TC-COM-016 | `orderedStyleTokensFromCsv` ignora estilos desconocidos | ✓ |
| TC-COM-017 | `normalizeEstiloField` vacío → undefined | undefined |
| TC-COM-018 | `normalizeEstiloField` devuelve CSV ordenado | "Urbanas,Weekend" |
| TC-COM-019 | `validateCommercialProductDraft` draft válido → sin errores | [] |
| TC-COM-020 | Tipo de calzado no pertenece a categoría → error | error que incluye "tipo de calzado no corresponde" |
| TC-COM-021 | Estilo incompatible con el tipo → error | error |
| TC-COM-022 | Material fuera de paleta → error | error que incluye "material" |
| TC-COM-023 | Costo cero o negativo → error | error que incluye "costo" |
| TC-COM-024 | Márgenes invertidos (obj < min) → error | error que incluye "márgenes" |
| TC-COM-025 | Precio fuera del rango comercial → error | error que incluye "rango comercial" |
| TC-COM-026 | Alias "mujer" aceptado (normaliza a "dama") | [] (sin errores) |
| TC-COM-027 | Múltiples infracciones → múltiples errores simultáneos | errors.length ≥ 2 |
| TC-COM-028 | Varios estilos CSV compatibles → sin errores | [] |
| TC-COM-029 | Token inválido en lista de estilos → error | incluye el token inválido |

---

### 2.7 TC-GUARD — Traducción de errores de triggers de BD

**Archivo:** `src/__tests__/commercialGuards.test.ts`  
**Módulo probado:** `src/domains/productos/utils/commercialRules.ts` → `describeCommercialDraftError`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-GRD-001 | `cv_guard_producto_tipo` → tipo no corresponde a categoría | Mensaje legible de tipo |
| TC-GRD-002 | `cv_guard_producto_estilo` → estilo no corresponde a tipo | Mensaje legible de estilo |
| TC-GRD-003 | `cv_guard_producto_material` → material fuera de paleta | Mensaje legible de material |
| TC-GRD-004 | `cv_guard_producto_precio` → precio fuera de rango | Mensaje legible de precio |
| TC-GRD-005 | `cv_guard_producto_finanzas` → márgenes desordenados | Mensaje legible de finanzas |
| TC-GRD-006 | Error desconocido / null / undefined → cadena vacía | "" |

---

### 2.8 TC-IMAGE — Validación de dimensiones de imágenes

**Archivo:** `src/__tests__/imageRules.test.ts`  
**Módulo probado:** `src/domains/productos/utils/imageRules.ts`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-IMG-001 | Imagen cuadrada válida 800×800 | null (sin error) |
| TC-IMG-002 | Retrato permitido 600×900 (ratio ≈ 2:3) | null |
| TC-IMG-003 | Apaisado permitido 1200×900 (ratio ≈ 4:3) | null |
| TC-IMG-004 | Dimensión mínima exacta 600×600 | null |
| TC-IMG-005 | Width < minWidth (400×800) | `IMAGE_TOO_SMALL` |
| TC-IMG-006 | Height < minHeight (800×400) | `IMAGE_TOO_SMALL` |
| TC-IMG-007 | Ratio 9:16 (muy alta) → ratio demasiado alto | `IMAGE_RATIO_TOO_TALL` |
| TC-IMG-008 | Ratio 2:1 (muy ancha) → ratio demasiado ancho | `IMAGE_RATIO_TOO_WIDE` |
| TC-IMG-009 | `imageValidationMessage` devuelve mensaje no vacío para todos los códigos | length > 0 |
| TC-IMG-010 | `IMAGE_TOO_SMALL` menciona las dimensiones mínimas | contiene minWidth, minHeight |

---

### 2.9 TC-IMPORT — Reglas de importación Excel/XLSX

**Archivo:** `src/__tests__/importRules.test.ts`  
**Módulo probado:** `src/domains/administradores/utils/importRules.ts`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-IMP-001 | `inferScenario` detecta "crisis" en nombre de archivo | "crisis" |
| TC-IMP-002 | `inferScenario` detecta "normal" | "normal" |
| TC-IMP-003 | `inferScenario` detecta "alta" como alias de "buenas" | "buenas" |
| TC-IMP-004 | `inferScenario` nombre no reconocido → "general" | "general" |
| TC-IMP-005 | `inferScenario` insensible a mayúsculas | ✓ |
| TC-IMP-006 | `scenarioLabel` devuelve etiqueta legible | "Crisis", "Normal", "Buenas Ventas" |
| TC-IMP-007 | `deriveProductImportId` usa campo "id" | "PRUEBA_CV001" |
| TC-IMP-008 | `deriveProductImportId` usa "codigo" como último recurso | ✓ |
| TC-IMP-009 | `deriveProductImportId` normaliza barras a guiones | "CV/001" → "CV-001" |
| TC-IMP-010 | `deriveProductImportId` sin identificador → null | null |
| TC-IMP-011 | `validateProducto` fila válida → null | null |
| TC-IMP-012 | `validateProducto` sin identificador → error | error que incluye "id.*codigo" |
| TC-IMP-013 | `validateProducto` precio no numérico → error | error que incluye "precio" |
| TC-IMP-014 | `validateFabricante` DNI con ≠ 8 dígitos → error | error que incluye "DNI" |
| TC-IMP-015 | `validateFabricante` DNI con puntos/guiones → aceptado | null |
| TC-IMP-016 | `validateVentaDiaria` campos numéricos inválidos → errores | error específico por campo |
| TC-IMP-017 | `transformProducto` convierte precio y stock a número | typeof result.precio === "number" |
| TC-IMP-018 | `transformProducto` marca `esDePrueba = true` | true |
| TC-IMP-019 | `transformFabricante` establece `activo = true` | true |
| TC-IMP-020 | `transformVentaDiaria` establece `devuelto = false` | false |

---

### 2.10 TC-VARIANT — Plan de creación de variantes de producto

**Archivo:** `src/__tests__/variantCreation.test.ts`  
**Módulo probado:** `src/domains/productos/utils/variantCreation.ts` → `buildVariantCreationPlan`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-VAR-001 | 1 color genera código "VI-001-1" | ["VI-001-1"] |
| TC-VAR-002 | 2 colores generan códigos correlativos | ["VI-001-1","VI-001-2"] |
| TC-VAR-003 | 5 colores generan 5 variantes con `familiaId` compartido | plan.length=5 |
| TC-VAR-004 | Imágenes y `tallaStock` son independientes por variante | ✓ |
| TC-VAR-005 | Variante sin imágenes → `imagen=""` sin lanzar error | imagen="" |
| TC-VAR-006 | `descripcion` por variante sobreescribe la del base | usa la específica |
| TC-VAR-007 | `descripcion` en blanco cae al del base | usa la base |
| TC-VAR-008 | Tallas con stock=0 son excluidas de `tallaStock` | no incluye talla 39 |

---

### 2.11 TC-PROFILE — Mensajes de error al guardar perfil

**Archivo:** `src/__tests__/profileSaveErrors.test.ts`  
**Módulo probado:** `src/domains/usuarios/utils/profileSaveErrors.ts`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-PRF-001 | Error TIMEOUT → mensaje de tiempo agotado | "Tiempo agotado. Inténtalo de nuevo…" |
| TC-PRF-002 | Error RLS por mensaje | "Sin permisos para realizar esta operación." |
| TC-PRF-003 | Error RLS código 42501 | "Sin permisos para realizar esta operación." |
| TC-PRF-004 | Error not-found | "Documento no encontrado. Recarga la pagina…" |
| TC-PRF-005 | Error genérico | "Error: boom" |
| TC-PRF-006 | Error no estándar (string) | "Error: no se pudo guardar" |

---

### 2.12 TC-FAV — Servicio de favoritos (aislamiento de cuenta)

**Archivo:** `src/__tests__/favorites.test.ts`  
**Módulo probado:** `src/domains/clientes/services/favorites.ts`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-FAV-001 | `fetchFavoriteProductIds` consulta subcolección del usuario autenticado | colección path correcta |
| TC-FAV-002 | `fetchFavoriteProductIds` con userId diferente al actual → rechaza | throws "otra cuenta" |
| TC-FAV-003 | `isProductFavorite` devuelve el estado por producto | true/false |
| TC-FAV-004 | `addFavoriteProduct` llama `setDoc` con payload correcto | setDoc llamado |
| TC-FAV-005 | `removeFavoriteProduct` llama `deleteDoc` en la subcolección | deleteDoc llamado |

---

### 2.13 TC-AUDIT-UNIT — Servicio de auditoría

**Archivo:** `src/__tests__/auditService.test.ts`  
**Módulo probado:** `src/services/audit.ts` → `logAudit`, `fetchRecentAudit`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-AUS-001 | `logAudit` no lanza cuando Supabase falla | resuelve undefined |
| TC-AUS-002 | `logAudit` emite `console.error` cuando Supabase falla | console.error llamado con "[audit]" |
| TC-AUS-003 | `logAudit` no emite error en inserción exitosa | console.error no llamado |
| TC-AUS-004 | `logAudit` inserta en tabla "auditoria" | `supabase.from("auditoria")` llamado |
| TC-AUS-005 | `logAudit` incluye campos correctos (accion, entidad, realizadoEn válido ISO 8601) | ✓ |
| TC-AUS-006 | `logAudit` inserta `detalle: null` cuando no se pasa | detalle=null |
| TC-AUS-007 | `fetchRecentAudit` consulta tabla "auditoria" | ✓ |
| TC-AUS-008 | `fetchRecentAudit` resuelve con la lista devuelta por Supabase | data correcta |
| TC-AUS-009 | `fetchRecentAudit` lanza si Supabase devuelve error | throws "RLS denied" |

---

### 2.14 TC-VIS — Visibilidad pública de productos

**Archivo:** `src/__tests__/productsPublicVisibility.test.ts`  
**Módulo probado:** `src/domains/productos/services/products.ts`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-VIS-001 | `fetchPublicProducts` aplica `eq(activo, true)` | eqCalls=[["activo",true]] |
| TC-VIS-002 | `fetchPublicProductById` exige `id` y `activo=true` | eqCalls=[["id","abc"],["activo",true]] |
| TC-VIS-003 | `fetchPublicProductById` devuelve null si no hay fila activa | null |
| TC-VIS-004 | `fetchPublicProductsByIds` filtra activo y conserva orden | orden de ids preservado |
| TC-VIS-005 | `fetchProductFamilyGroupCounts` solo pide filas activas | eqCalls=[["activo",true]] |
| TC-VIS-006 | `fetchProducts` (admin) NO filtra por activo | eqCalls=[] |

---

### 2.15 TC-REALTIME — Hook de tiempo real de productos

**Archivo:** `src/__tests__/useProductsRealtime.test.tsx`
**Módulo probado:** `src/hooks/useProductsRealtime.ts`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-RT-001 | El hook suscribe a los canales `productos`, `productoCodigos` y `productoFinanzas` al montar | `channel.on` llamado 3 veces con los filtros correctos |
| TC-RT-002 | Ráfagas de cambios en menos de 300 ms se agrupan en un solo reload | `onChange` llamado exactamente 1 vez tras múltiples eventos en 300 ms |
| TC-RT-003 | Al desmontar el componente, el canal es eliminado con `supabase.removeChannel` | `removeChannel` llamado con la instancia correcta del canal |

---

## 3. Pruebas automatizadas — E2E (Playwright)

> Ubicación: `calzatura-vilchez/e2e/`  
> Ejecutar con: `npx playwright test`  
> Navegador CI: Chromium

---

### 3.1 Smoke Tests — Tienda pública y Admin

**Archivo:** `e2e/smoke.spec.ts`, `e2e/admin-smoke.spec.ts`

| ID | Ruta | Descripción | Resultado esperado |
|---|---|---|---|
| TC-SMOKE-PUB-001 | `/` | Inicio carga y muestra marca | `<title>` contiene "Calzatura", `h1.home-title` visible |
| TC-SMOKE-PUB-002 | `/productos` | Catálogo responde | `main.products-page` visible |
| TC-SMOKE-PUB-003 | `/carrito` | Página de carrito accesible | heading "carrito" o "Mi Carrito" visible |
| TC-SMOKE-PUB-004 | `/admin/productos` | Sin sesión → redirige a login | URL contiene `/login` |
| TC-SMOKE-001 | `/admin` | Dashboard carga | h1 "Dashboard" visible |
| TC-SMOKE-002 | `/admin/productos` | Módulo Productos carga | h1 "Productos" visible |
| TC-SMOKE-003 | `/admin/pedidos` | Módulo Pedidos carga | h1 "Pedidos" visible |
| TC-SMOKE-004 | `/admin/ventas` | Módulo Ventas carga | h1 "Consulta y registro de ventas" visible |
| TC-SMOKE-005 | `/admin/usuarios` | Módulo Usuarios carga | h1 "Usuarios registrados" visible |
| TC-SMOKE-006 | `/admin/fabricantes` | Módulo Fabricantes carga | h1 "Fabricantes" visible |
| TC-SMOKE-007 | `/admin/predicciones` | Módulo IA carga | h1 "Inteligencia Artificial" visible |
| TC-SMOKE-008 | `/admin/datos` | Módulo Datos Excel carga | h1 "Gestión de Datos Excel" visible |

---

### 3.2 Catálogo → Detalle → Carrito

**Archivo:** `e2e/catalog-cart.spec.ts`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-CAT-001 | Desde `/productos` → click en tarjeta → navega a `/producto/:id` | URL coincide con patrón |
| TC-CAT-002 | Seleccionar talla y agregar al carrito | botón habilitado y clickeable |
| TC-CAT-003 | Después de agregar, `/carrito` muestra 1 ítem | `.cart-page-item` count = 1 |
| TC-CAT-004 | Ítem persiste en localStorage antes de navegar | localStorage["calzatura_cart"] length > 0 |

---

### 3.3 Validación de stock en carrito

**Archivo:** `e2e/cart-stock-validation.spec.ts`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-CART-001 | Botón "Agregar al Carrito" deshabilitado cuando `stock=0` | botón disabled |
| TC-CART-002 | Cantidad máxima en carrito limitada al stock disponible | qty ≤ 3 |
| TC-CART-003 | Agregar el mismo producto dos veces → incrementa cantidad, no duplica filas | items count = 1 |
| TC-CART-004 | `/carrito` muestra el producto recién agregado | items count = 1 |

---

### 3.4 Rastro de auditoría — Admin

**Archivo:** `e2e/admin-audit-trail.spec.ts`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-AUDIT-001 | Crear producto registra entrada con `accion='crear'` en tabla auditoria | payload.accion = "crear", payload.entidad = "producto" |
| TC-AUDIT-002 | Dashboard refleja entradas de edición y creación | celdas con "editar" y "crear" visibles |
| TC-AUDIT-003 | Dashboard refleja entrada con `accion='eliminar'` | celda "eliminar" visible |
| TC-AUDIT-004 | Acción más reciente aparece primera (orden DESC) | primera celda = "eliminar" |
| TC-AUDIT-005 | Sin entradas → mensaje "Sin actividad registrada aún" | texto visible |

---

### 3.5 Favoritos — Aislamiento por cuenta

**Archivo:** `e2e/favorites-isolation.spec.ts`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-FAV-E2E-001 | Cliente A marca favorito y lo ve en `/favoritos` | nombre del producto visible |
| TC-FAV-E2E-002 | Cliente B NO ve el favorito de Cliente A | heading "aún no tienes favoritos" visible, producto no visible |

---

### 3.6 Panel de IA — Predicciones

**Archivo:** `e2e/admin-predictions.spec.ts`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-PRED-001 | Timeout del servicio IA → mensaje de cold start + botón "Reintentar" | texto "tardó demasiado" o "primera carga del día" visible |
| TC-PRED-002 | Respuesta exitosa → tabla con nombre del producto, IRE, Recomendaciones | "Zapatilla E2E Pred" visible en tabla; texto IRE, Recomendaciones visibles |

---

### 3.7 Pedidos — Admin

**Archivo:** `e2e/admin-orders.spec.ts`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-ORD-001 | Filtro por estado reduce la lista visible | solo pedidos del estado filtrado visibles |
| TC-ORD-002 | Expand / collapse de tarjeta de pedido | detalle visible al expandir, oculto al colapsar |
| TC-ORD-003 | Cambio de estado llama PATCH y muestra toast de confirmación | PATCH interceptado, toast visible |

---

### 3.8 Dashboard Admin

**Archivo:** `e2e/admin-dashboard.spec.ts`

| ID | Descripción |
|---|---|
| TC-DASH-001 | Dashboard muestra KPIs de ventas (total pedidos, ingresos) |
| TC-DASH-002 | Tabla de auditoría reciente es visible |
| TC-DASH-003 | Navegación lateral lleva a cada módulo |

---

### 3.9 Productos — Filtros y búsqueda

**Archivo:** `e2e/admin-products-filters.spec.ts`

| ID | Descripción |
|---|---|
| TC-PFLT-001 | Filtro por categoría muestra solo productos de esa categoría |
| TC-PFLT-002 | Búsqueda por nombre reduce los resultados |
| TC-PFLT-003 | Limpiar filtros restaura el listado completo |

---

### 3.10 Eliminar producto

**Archivo:** `e2e/admin-product-delete.spec.ts`

| ID | Descripción |
|---|---|
| TC-DEL-001 | Botón eliminar abre confirmación |
| TC-DEL-002 | Confirmar eliminación llama DELETE y retira el producto del listado |
| TC-DEL-003 | Cancelar eliminación no modifica el listado |

---

### 3.11 Variantes — Chips de colores

**Archivo:** `e2e/admin-variant-chips.spec.ts`

| ID | Descripción |
|---|---|
| TC-VCH-001 | Chips de colores se renderizan por cada variante |
| TC-VCH-002 | Click en chip cambia la variante activa |

---

### 3.12 Stock por tallas

**Archivo:** `e2e/admin-stock-tallas.spec.ts`

| ID | Descripción |
|---|---|
| TC-STKT-001 | Tabla de tallas muestra stock por talla |
| TC-STKT-002 | Editar stock de una talla y guardar persiste el cambio |

---

### 3.13 Usuarios — Admin

**Archivo:** `e2e/admin-users.spec.ts`

| ID | Descripción |
|---|---|
| TC-USR-001 | Lista de usuarios registrados se carga |
| TC-USR-002 | Búsqueda/filtro por nombre o correo |
| TC-USR-003 | Detalle de usuario muestra rol e historial |

---

### 3.14 Fabricantes — Admin

**Archivo:** `e2e/admin-manufacturers.spec.ts`

| ID | Descripción |
|---|---|
| TC-FAB-001 | Lista de fabricantes se carga |
| TC-FAB-002 | Crear fabricante con DNI válido |
| TC-FAB-003 | Importar fabricantes desde Excel |

---

### 3.15 Ventas — Admin

**Archivo:** `e2e/admin-sales.spec.ts`

| ID | Descripción |
|---|---|
| TC-VNT-001 | Módulo de ventas muestra registros diarios |
| TC-VNT-002 | Filtro por rango de fechas |
| TC-VNT-003 | Registro manual de venta diaria |

---

### 3.16 Importación de datos (Excel)

**Archivo:** `e2e/admin-data.spec.ts`

| ID | Descripción |
|---|---|
| TC-DAT-001 | Subir archivo Excel de productos muestra previsualización |
| TC-DAT-002 | Filas inválidas se marcan en rojo con mensaje de error |
| TC-DAT-003 | Confirmar importación registra las filas válidas |
| TC-DAT-004 | Detecta escenario (crisis/normal/buenas) en nombre del archivo |

---

### 3.17 Campaña — Admin

**Archivo:** `e2e/admin-campana.spec.ts`

| ID | Descripción |
|---|---|
| TC-CMP-001 | Lista de campañas activas se muestra |
| TC-CMP-002 | Crear campaña con fechas válidas |
| TC-CMP-003 | Asociar productos a una campaña |

---

### 3.18 Guardas comerciales — Admin

**Archivo:** `e2e/admin-commercial-guards.spec.ts`

| ID | Descripción |
|---|---|
| TC-GCOM-001 | Guardar producto con precio fuera de rango muestra error de trigger |
| TC-GCOM-002 | Mensaje de error de trigger se traduce a texto legible |

---

### 3.19 Guardas de código de producto

**Archivo:** `e2e/admin-code-guards.spec.ts`

| ID | Descripción |
|---|---|
| TC-GCOD-001 | Código duplicado impide guardar el producto |
| TC-GCOD-002 | Código con formato inválido muestra error |

---

### 3.20 Layout Admin

**Archivo:** `e2e/admin-layout.spec.ts`

| ID | Descripción |
|---|---|
| TC-LAY-001 | Sidebar muestra todos los módulos |
| TC-LAY-002 | Elemento activo está resaltado en el menú |
| TC-LAY-003 | Botón de cierre de sesión presente |

---

### 3.21 IRE Dashboard

**Archivo:** `e2e/admin-ire-dashboard.spec.ts`

| ID | Descripción |
|---|---|
| TC-IRE-001 | Score IRE actual y proyectado son visibles |
| TC-IRE-002 | Tab "Detalle IRE" muestra variables y fórmula |
| TC-IRE-003 | Historial IRE se renderiza en gráfico de línea |

---

### 3.22 Landings de campaña

**Archivo:** `e2e/campaign-landings.spec.ts`

| ID | Descripción |
|---|---|
| TC-LND-001 | URL de landing de campaña carga la página correcta |
| TC-LND-002 | Productos de la campaña se muestran en el catálogo filtrado |

---

### 3.23 Filtro por marca en catálogo

**Archivo:** `e2e/catalog-filter-marca.spec.ts`

| ID | Descripción |
|---|---|
| TC-FMRC-001 | Filtrar por marca muestra solo productos de esa marca |
| TC-FMRC-002 | Limpiar filtro de marca restaura todos los productos |

---

### 3.24 Carrusel de campaña en catálogo

**Archivo:** `e2e/catalog-campaign-carousel.spec.ts`

| ID | Descripción |
|---|---|
| TC-CAR-001 | Carrusel de campañas se muestra en la página principal |
| TC-CAR-002 | Click en slide lleva a la landing de la campaña |

---

### 3.25 Producto oculto (activo=false)

**Archivo:** `e2e/product-detail-hidden.spec.ts`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-HID-001 | Acceder a `/producto/:id` de un producto inactivo | Muestra 404 o redirige; el producto no es visible |

---

### 3.26 Guardar perfil de usuario

**Archivo:** `e2e/profile-save.spec.ts`

| ID | Descripción |
|---|---|
| TC-PRFE2E-001 | Usuario puede editar y guardar su nombre |
| TC-PRFE2E-002 | Error de permisos muestra toast adecuado |
| TC-PRFE2E-003 | Datos guardados persisten al recargar |

---

## 3b. Pruebas automatizadas — Servicio IA (Pytest)

> Ubicación: `ai-service/tests/`
> Ejecutar con: `pip install -r requirements-dev.txt && pytest`
> Configuración de fixtures: `ai-service/tests/conftest.py`

---

### 3b.1 TC-RISK — Índice de Riesgo Empresarial (IRE)

**Archivo:** `tests/test_risk.py`
**Módulo probado:** `models/risk.py` → `compute_ire`, `compute_ire_proyectado`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-RSK-001 | Los pesos de la fórmula suman 1.0 (0.40 + 0.35 + 0.25) | suma = 1.0 |
| TC-RSK-002 | El IRE permanece en rango [0, 100] para todos los escenarios | 0 ≤ score ≤ 100 |
| TC-RSK-003 | Escenario favorable (stock OK, ingresos subiendo, demanda estable) → nivel Bajo | nivel = "Bajo" |
| TC-RSK-004 | Escenario extremo (sin stock, ingresos cayendo, drift alto) → nivel Crítico | nivel = "Crítico" |
| TC-RSK-005 | Los umbrales respetan los cortes: Bajo 0-25, Moderado 26-50, Alto 51-75, Crítico 76-100 | niveles correctos |
| TC-RSK-006 | La suma de contribuciones por variable coincide con el score final | sum(contribuciones) = score |
| TC-RSK-007 | El IRE proyectado no produce stock negativo | stock_proyectado ≥ 0 |
| TC-RSK-008 | Con horizonte mayor, el IRE proyectado es ≥ al de horizonte menor (cuando el stock baja) | ire_h30 ≥ ire_h7 |

---

### 3b.2 TC-DEMAND — Predicción de demanda

**Archivo:** `tests/test_demand.py`
**Módulo probado:** `models/demand.py`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-DEM-001 | Con datos históricos suficientes, Random Forest genera predicción positiva | predicción > 0 |
| TC-DEM-002 | Sin historial suficiente, el fallback a promedio móvil ponderado funciona | predicción ≥ 0 sin excepción |
| TC-DEM-003 | El riesgo de agotamiento se calcula correctamente para stock bajo con demanda alta | riesgo_agotamiento = True |
| TC-DEM-004 | Drift score refleja cambio reciente en el patrón de ventas | drift_score > umbral en datos con cambio brusco |

---

### 3b.3 TC-REVENUE — Forecast de ingresos

**Archivo:** `tests/test_revenue.py`
**Módulo probado:** `models/revenue.py`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-REV-001 | Tendencia creciente produce confianza alta y riesgo bajo | confianza ≥ 0.7, riesgo_ingresos < 40 |
| TC-REV-002 | Tendencia decreciente produce riesgo de ingresos elevado | riesgo_ingresos ≥ 55 |
| TC-REV-003 | Sin datos de pedidos, el forecast retorna valores conservadores por defecto | riesgo_ingresos = 45 |
| TC-REV-004 | La estacionalidad por día de semana es aplicada correctamente | forecast weekday ≠ forecast weekend en datos estacionales |

---

### 3b.4 TC-CAMPAIGN — Modelo de predicción de campañas

**Archivo:** `tests/test_campaign.py`
**Módulo probado:** `models/campaign.py` → `detect_campaign`, `_compute_feedback_adjustments`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-CMP-P-001 | Con datos de campaña real (pico de ventas sostenido), `detect_campaign` retorna campaña activa | `campaña_detectada = True` |
| TC-CMP-P-002 | Sin anomalía de ventas, no se detecta campaña | `campaña_detectada = False` |
| TC-CMP-P-003 | Los productos foco son los de mayor variación positiva | productos_foco ⊆ productos con mayor delta |
| TC-CMP-P-004 | El impacto en soles es positivo y proporcional al volumen de la campaña | `impacto_soles > 0` |
| TC-CMP-P-005 | `_compute_feedback_adjustments` con feedback positivo aumenta sensibilidad | umbral_detectar < umbral_base |
| TC-CMP-P-006 | `_compute_feedback_adjustments` con feedback negativo reduce sensibilidad | umbral_detectar > umbral_base |
| TC-CMP-P-007 | Sin feedback previo, los ajustes son neutros (sin sesgo) | ajuste = 0 o factor = 1.0 |

---

### 3b.5 TC-STATE — Máquina de estados de campaña

**Archivo:** `tests/test_state_machine.py`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-STM-001 | Transición `pendiente → activa` permitida cuando admin confirma | estado = "activa" |
| TC-STM-002 | Transición `activa → cerrada` al vencer la campaña o decisión manual | estado = "cerrada" |
| TC-STM-003 | Transición `cerrada → archivada` para campañas históricas | estado = "archivada" |
| TC-STM-004 | Transición inválida (e.g., `archivada → activa`) lanza error o es rechazada | excepción o retorno de error |
| TC-STM-005 | El estado inicial de toda campaña detectada es `pendiente` | estado_inicial = "pendiente" |

---

### 3b.6 TC-API-CONTRACT — Contrato de endpoints

**Archivo:** `tests/test_api_contract.py`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-API-001 | `GET /api/health` retorna `{"status": "ok"}` | status 200, body correcto |
| TC-API-002 | `GET /api/predict/combined` sin token retorna 401 | status 401 |
| TC-API-003 | `GET /api/predict/combined` con token válido retorna esquema completo | campos: ire, demanda, ingresos, campana, version |
| TC-API-004 | `GET /api/ire/historial` retorna lista de registros con campos requeridos | lista con score, nivel, fecha |
| TC-API-005 | `GET /api/predict/campaign-detection` retorna campos de campaña | campaña_detectada, productos_foco, impacto_soles |
| TC-API-006 | `POST /api/campaign/feedback` acepta payload válido y retorna confirmación | status 200 |

---

### 3b.7 TC-SUPABASE — Cliente Supabase

**Archivo:** `tests/test_supabase_client.py`
**Módulo probado:** `services/supabase_client.py`

| ID | Descripción | Resultado esperado |
|---|---|---|
| TC-SB-001 | `fetch_products` retorna lista con campos mínimos requeridos | lista de dicts con id, nombre, stock |
| TC-SB-002 | `fetch_daily_sales` filtra por `lookback_days` correctamente | solo registros dentro del periodo |
| TC-SB-003 | `save_ire_historial` llama a Supabase con el payload correcto | upsert ejecutado con campos extendidos |
| TC-SB-004 | `save_campana_detectada` persiste la campaña con estado `pendiente` | insert correcto |
| TC-SB-005 | `load_modelo_estado` retorna None cuando no hay estado guardado | None sin excepción |
| TC-SB-006 | `save_modelo_estado` serializa y persiste el training_meta | upsert ejecutado |

---

## 4. Pruebas no automatizadas — Manuales

> Las siguientes pruebas requieren intervención humana por depender de servicios externos reales, flujos visuales complejos, hardware específico o criterios subjetivos.

---

### 4.1 Autenticación con Firebase

| ID | Descripción | Pasos | Resultado esperado |
|---|---|---|---|
| TC-MAN-AUTH-001 | Registro de nuevo usuario con email/password | 1. Abrir `/registro` 2. Llenar formulario con datos válidos 3. Enviar | Cuenta creada, redirige a tienda |
| TC-MAN-AUTH-002 | Login exitoso con credenciales correctas | 1. Abrir `/login` 2. Ingresar email y contraseña correctos | Sesión iniciada, redirige a `/` |
| TC-MAN-AUTH-003 | Login con contraseña incorrecta | 1. Abrir `/login` 2. Ingresar contraseña errónea | Mensaje de error, no ingresa |
| TC-MAN-AUTH-004 | Recuperación de contraseña | 1. Click "¿Olvidaste tu contraseña?" 2. Ingresar email 3. Revisar bandeja | Email de recuperación recibido |
| TC-MAN-AUTH-005 | Cierre de sesión | 1. Estar autenticado 2. Click en "Cerrar sesión" | Redirige a `/login`, sesión eliminada |
| TC-MAN-AUTH-006 | Acceso al panel admin con cuenta sin rol admin | 1. Autenticarse con cuenta cliente 2. Navegar a `/admin` | Redirige a `/login` o muestra error 403 |
| TC-MAN-AUTH-007 | Persistencia de sesión al recargar la página | 1. Autenticarse 2. Recargar la página | Sigue autenticado |

---

### 4.2 Pasarela de pago — Stripe

| ID | Descripción | Pasos | Resultado esperado |
|---|---|---|---|
| TC-MAN-STR-001 | Checkout exitoso con tarjeta de prueba | 1. Agregar producto al carrito 2. Proceder al pago 3. Usar tarjeta `4242 4242 4242 4242` | Pedido creado con `estado='pagado'` |
| TC-MAN-STR-002 | Pago rechazado con tarjeta declinada | 1. Usar tarjeta `4000 0000 0000 0002` | Mensaje de error, pedido NO creado |
| TC-MAN-STR-003 | Webhook idempotente (doble disparo) | 1. Simular webhook `checkout.session.completed` dos veces para el mismo `stripeSessionId` | Solo un pedido actualizado a "pagado" |
| TC-MAN-STR-004 | Pedido aparece en panel admin tras pago | 1. Completar pago exitoso 2. Revisar `/admin/pedidos` | Pedido visible con estado correcto |
| TC-MAN-STR-005 | Email de confirmación enviado al cliente | 1. Completar checkout 2. Revisar bandeja del email de prueba | Email de confirmación recibido |

---

### 4.3 Servicio IA en producción (Render)

| ID | Descripción | Pasos | Resultado esperado |
|---|---|---|---|
| TC-MAN-IA-001 | Desplegar versión actualizada en Render | 1. Push a rama main 2. Verificar deploy en Render dashboard | Deploy exitoso, endpoints responden |
| TC-MAN-IA-002 | Endpoint `/api/predict/combined` con datos reales | 1. Abrir `/admin/predicciones` 2. Esperar carga | Tabla de predicciones con datos reales visible |
| TC-MAN-IA-003 | Cold start del servicio IA (primer llamado del día) | 1. Asegurarse que el servicio esté dormido 2. Abrir `/admin/predicciones` | Muestra mensaje de "primera carga del día" y carga después |
| TC-MAN-IA-004 | Exportar predicciones a CSV | 1. Cargar predicciones 2. Click en botón "Exportar CSV" | Archivo `.csv` descargado con datos correctos |
| TC-MAN-IA-005 | Cambiar horizonte de predicción (7/15/30 días) | 1. Cambiar selector de horizonte 2. Verificar que la tabla se actualiza | Predicciones para el horizonte seleccionado |

---

### 4.4 Migraciones de base de datos (Supabase)

| ID | Descripción | Pasos | Resultado esperado |
|---|---|---|---|
| TC-MAN-MIG-001 | Aplicar migración `20260503100000_audit_pedidos_trigger.sql` | 1. Ejecutar migración en Supabase 2. Crear un pedido de prueba | Trigger `trg_audit_pedido_insert` activo; nueva fila en `auditoria` |
| TC-MAN-MIG-002 | Aplicar migración `20260503110000_add_pagadoen_and_canal.sql` | 1. Ejecutar migración 2. Verificar columnas en tabla `pedidos` | Columnas `pagadoEn` y `canal` presentes |
| TC-MAN-MIG-003 | RLS funcionando en tabla `auditoria` | 1. Intentar INSERT desde usuario sin privilegios | Rechazado por política RLS |
| TC-MAN-MIG-004 | RLS en tabla `productos` permite lectura pública solo activos | 1. Consultar REST sin token 2. Verificar que solo retorna `activo=true` | Solo productos activos |

---

### 4.5 Diseño responsivo y compatibilidad

| ID | Descripción | Dispositivo/Resolución | Resultado esperado |
|---|---|---|---|
| TC-MAN-RES-001 | Catálogo en móvil | 375×667 (iPhone SE) | Grid adaptado, imágenes visibles, sin overflow |
| TC-MAN-RES-002 | Carrito en móvil | 375×667 | Items legibles, botón "Proceder al pago" visible |
| TC-MAN-RES-003 | Panel admin en tablet | 768×1024 (iPad) | Sidebar colapsable, tablas con scroll horizontal |
| TC-MAN-RES-004 | Panel IA en tablet | 768×1024 | Gráficos SVG visibles, sin desbordamiento |
| TC-MAN-RES-005 | Página de inicio en desktop | 1920×1080 | Layout full-width correcto |
| TC-MAN-RES-006 | Panel admin en móvil | 375×667 | Hamburger menu funcional |

---

### 4.6 Compatibilidad de navegadores

| ID | Descripción | Navegador |
|---|---|---|
| TC-MAN-BRW-001 | Flujo completo: inicio → catálogo → carrito → pago | Chrome (latest) |
| TC-MAN-BRW-002 | Flujo completo | Firefox (latest) |
| TC-MAN-BRW-003 | Flujo completo | Safari (macOS latest) |
| TC-MAN-BRW-004 | Flujo completo | Edge (latest) |
| TC-MAN-BRW-005 | Panel admin completo | Chrome Mobile (Android) |

---

### 4.7 Rendimiento

| ID | Descripción | Herramienta | Criterio de éxito |
|---|---|---|---|
| TC-MAN-PERF-001 | LCP (Largest Contentful Paint) en página de inicio | Lighthouse / Chrome DevTools | LCP < 2.5 s |
| TC-MAN-PERF-002 | CLS (Cumulative Layout Shift) en catálogo | Lighthouse | CLS < 0.1 |
| TC-MAN-PERF-003 | Time to first meaningful paint en `/admin` | Lighthouse | < 3 s |
| TC-MAN-PERF-004 | Carga de 100 productos en catálogo sin paginación | Chrome Network | < 2 s en 3G rápido |
| TC-MAN-PERF-005 | Consulta al servicio IA (warm) | Network DevTools | Respuesta < 5 s |

---

### 4.8 Accesibilidad

| ID | Descripción | Herramienta | Criterio de éxito |
|---|---|---|---|
| TC-MAN-ACC-001 | Score de accesibilidad en página principal | Lighthouse Accessibility | Score ≥ 90 |
| TC-MAN-ACC-002 | Navegación solo con teclado (Tab, Enter, Esc) | Manual | Todos los elementos interactivos alcanzables |
| TC-MAN-ACC-003 | Contraste de color en botones y texto | axe DevTools | Sin errores AA de WCAG 2.1 |
| TC-MAN-ACC-004 | Imágenes de productos tienen `alt` descriptivo | axe DevTools | Sin imágenes sin alt |
| TC-MAN-ACC-005 | Lector de pantalla en flujo de compra | NVDA / VoiceOver | Flujo navegable y comprensible |

---

### 4.9 Seguridad

| ID | Descripción | Método | Resultado esperado |
|---|---|---|---|
| TC-MAN-SEC-001 | `VITE_AI_SERVICE_BEARER_TOKEN` no expuesto en bundle | DevTools → Sources → bundle.js | Token no aparece en código fuente del browser |
| TC-MAN-SEC-002 | Rutas `/admin/*` inaccesibles sin token de admin válido | Devtools → modificar localStorage | Redirige a `/login` |
| TC-MAN-SEC-003 | Headers de seguridad HTTP presentes en producción | curl o SecurityHeaders.com | CSP, X-Frame-Options, HSTS presentes |
| TC-MAN-SEC-004 | Stripe webhook verifica firma antes de procesar | Stripe CLI `stripe trigger` | Solo webhooks con firma válida son procesados |
| TC-MAN-SEC-005 | XSS: inputs de texto no ejecutan scripts | Manual (ingresar `<script>alert(1)</script>` en campos) | Script no ejecutado |
| TC-MAN-SEC-006 | Supabase RLS bloquea acceso cruzado entre usuarios | REST API sin token | No retorna datos de otros usuarios |

---

### 4.10 Flujo completo de compra (End-to-End Manual)

| ID | Descripción | Pasos |
|---|---|---|
| TC-MAN-E2E-001 | Flujo completo cliente nuevo | 1. Registrarse 2. Buscar producto por categoría 3. Ver detalle 4. Agregar al carrito 5. Proceder al pago 6. Completar con Stripe test 7. Verificar confirmación por email |
| TC-MAN-E2E-002 | Flujo completo admin post-venta | 1. Autenticarse como admin 2. Ver pedido nuevo 3. Cambiar estado a "enviado" 4. Verificar registro en auditoría |
| TC-MAN-E2E-003 | Reposición de stock por admin | 1. Detectar producto con stock crítico en panel IA 2. Editar stock en admin 3. Verificar cambio en tienda pública |

---

## 5. Matriz de cobertura

| Módulo / Funcionalidad | Unitaria (Vitest) | E2E (Playwright) | Manual |
|---|:---:|:---:|:---:|
| Cálculo de precios y márgenes | ✅ | — | — |
| Stock por tallas | ✅ | ✅ | ✅ |
| Colores de producto | ✅ | — | — |
| Validación de email | ✅ | — | ✅ |
| Familias de producto | ✅ | — | — |
| Reglas comerciales (categoría/tipo/estilo/material) | ✅ | ✅ | — |
| Traducción de errores de triggers BD | ✅ | ✅ | — |
| Validación de imágenes | ✅ | — | ✅ |
| Importación Excel | ✅ | ✅ | ✅ |
| Creación de variantes | ✅ | ✅ | — |
| Errores al guardar perfil | ✅ | ✅ | — |
| Servicio de favoritos | ✅ | ✅ | — |
| Servicio de auditoría | ✅ | ✅ | ✅ |
| Visibilidad pública de productos (activo) | ✅ | ✅ | ✅ |
| Autenticación Firebase | — | ✅ (mock) | ✅ (real) |
| Carrito de compras | — | ✅ | ✅ |
| Pasarela Stripe | — | — | ✅ |
| Panel IA / Predicciones | — | ✅ | ✅ |
| IRE Dashboard | — | ✅ | ✅ |
| Pedidos (admin) | — | ✅ | ✅ |
| Usuarios (admin) | — | ✅ | ✅ |
| Fabricantes (admin) | — | ✅ | ✅ |
| Campañas / Landings | — | ✅ | ✅ |
| Migraciones BD | — | — | ✅ |
| Responsividad | — | — | ✅ |
| Compatibilidad navegadores | — | ✅ (Chromium) | ✅ (multi) |
| Rendimiento (LCP, CLS) | — | — | ✅ |
| Accesibilidad WCAG | — | — | ✅ |
| Seguridad (tokens, RLS, XSS) | — | — | ✅ |

---

## 6. Entornos y herramientas

| Herramienta | Versión / Referencia | Uso |
|---|---|---|
| **Vitest** | `^2.x` | Tests unitarios frontend |
| **Playwright** | `^1.x` (Chromium) | Tests E2E |
| **Pytest** | `8.3.5` | Tests unitarios / integración servicio IA |
| **pytest-asyncio** | `0.24.0` | Soporte async en Pytest |
| **Firebase Emulator** | Firebase CLI local | Auth en E2E (mock JWT) |
| **Supabase** | PostgREST mock vía `page.route()` | API BD en E2E |
| **Stripe CLI** | `stripe trigger` | Tests de webhook manuales |
| **Lighthouse** | Chrome DevTools | Rendimiento y accesibilidad |
| **axe DevTools** | Extensión Chrome | Accesibilidad WCAG |
| **GitHub Actions** | `.github/workflows/ci.yml` | CI automático en cada push |
| **Render** | Dashboard Render | Deploy servicio IA FastAPI |

### Cómo ejecutar las pruebas

```bash
# Unitarias frontend (desde calzatura-vilchez/)
npm run test

# E2E (requiere servidor corriendo en localhost:5173)
npm run dev &
npx playwright test

# E2E con UI interactiva
npx playwright test --ui

# Un archivo específico
npx playwright test e2e/cart-stock-validation.spec.ts

# Unitarias servicio IA (desde ai-service/)
pip install -r requirements-dev.txt
pytest

# Suite específica de IA
pytest tests/test_campaign.py -v
```

---

*Documento generado el 2026-05-08. Actualizar tras cada sprint o cambio estructural del proyecto.*
