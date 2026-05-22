# Cumplimiento interno ISO (sin certificación)

Referencia única para auditorías de tesis y revisiones internas. **No sustituye** certificación ISO 9001, 25000 ni 27001.

Normas aplicadas como criterio de diseño (ver `quality-security-standards.md`):

| Norma | Enfoque en este proyecto |
|-------|---------------------------|
| **ISO 9001** | Trazabilidad, control de cambios, documentación de despliegue |
| **ISO/IEC 25000 (SQuaRE)** | Atributos de calidad: seguridad, fiabilidad, mantenibilidad |
| **ISO/IEC 9126** | Modelo de referencia compatible con 25010 |
| **ISO/IEC 27000** | Seguridad de la información, privilegio mínimo |
| **ISO/IEC/IEEE 29119** | *Fuera de alcance explícito* — ver `05-pruebas/plan-pruebas.md` |

---

## ISO/IEC 27001 — Controles implementados (rol trabajador)

### Autenticación y autorización

| Control | Evidencia |
|---------|-----------|
| Identidad Firebase + perfil `usuarios.rol` en Supabase | `AuthContext`, BFF `verifyFirebaseUser` |
| Rutas UI por área | `accessControl.ts`, `RouteGuards`, `StaffLayout` / `AdminLayout` |
| API segregada admin vs trabajador | Endpoints `/admin/*` vs `/staff/*` en `bff/server.cjs` |

### Nivel 2 — Validación y trazabilidad (profundización)

| Control | Implementación |
|---------|----------------|
| Precio en rango | `validateDailySalesRegister` en BFF (min/max desde `productoFinanzas`) |
| Producto activo (staff) | Rechazo de venta sobre producto inactivo |
| Costos/ganancia solo servidor | `stripClientFinancialFields` + `enrichDailySalesWithCosts` |
| Encargado obligatorio | `encargadoUid` validado; staff solo el propio uid |
| Auditoría ISO 9001 | `logAuditFn` en registro y devolución de ventas |
| Códigos producto | `GET /staff/productCodes` (solo activos); sin SELECT directo en panel ventas |

### Endpoints trabajador (`rol = trabajador`)

| Método | Ruta | Datos expuestos |
|--------|------|-----------------|
| GET | `/staff/dailySales` | Solo ventas con `encargadoUid = uid`; sin ganancia/costos |
| GET | `/staff/productPriceRanges` | Rangos de precio; sin `costoCompra` |
| GET | `/staff/products` | Solo productos `activo = true` |
| GET | `/staff/productCodes` | Códigos solo de productos activos |
| GET | `/staff/products/:id` | Producto activo únicamente |
| GET | `/staff/orders` | Pedidos tienda (operación); admin usa `/admin/orders` |
| GET | `/staff/performance` | Métricas propias; sin `gananciaTotal` |
| POST | `/staff/dailySales/register` | Costos calculados en servidor |
| POST | `/staff/dailySales/return` | Solo ventas propias (`encargadoUid`) |
| POST | `/updateOrderStatus` | Admin o trabajador (`assertStaffRole`) |

### Capa de datos (Supabase)

| Tabla | Control |
|-------|---------|
| `ventasDiarias` | RLS + REVOKE cliente; RPC solo `service_role` — `20260519140000` |
| `productoFinanzas` | Sin SELECT `authenticated` — `20260519140100` |
| `pedidos`, `usuarios` | REVOKE + RLS; solo BFF |

Matriz detallada: `supabase/RLS-MATRIX.md`. Hallazgos: `security-audit.md`.

### Riesgos aceptados / fase posterior

| ID | Tema | Notas |
|----|------|-------|
| G1 | Pedidos web — PII trabajador | **Mitigado:** `GET /staff/orders` enmascara email, teléfono, dirección y referencia (`bff/privacy.cjs`) |
| G2 | Roles `psicologo` / `rrhh` temporales | Eliminación planificada del producto |
| G3 | App Check, CSP, Cloudinary | **Mitigado:** App Check opcional (`VITE_FIREBASE_APPCHECK_SITE_KEY`), CSP en `firebase.json`, subida Cloudinary firmada vía BFF |
| G4 | MFA TOTP administrador | **Pendiente** — Firebase Auth multi-factor recomendado en perfil admin; sin enforcement en BFF (`adminMfaPolicy` stub) |

---

## ISO/IEC 25010 — Atributos de calidad

| Atributo | Implementación trabajador |
|----------|---------------------------|
| **Seguridad / confidencialidad** | Redacción BFF + sin bypass Supabase en ventas/finanzas |
| **Fiabilidad** | Fallback admin vía BFF; staff sin fallback inseguro en ventas |
| **Mantenibilidad** | `PanelFetchScope`, servicios `finance` / `orders` / `products` |
| **Usabilidad** | UI sin columnas financieras; estados carga/error en paneles staff |

---

## ISO 9001 — Trazabilidad

| Artefacto | Ubicación |
|-----------|-----------|
| Estado de auditoría | `ESTADO-CUMPLIMIENTO-AUDITORIA.md` |
| Cambios de seguridad | `security-audit.md` (sección rol trabajador) |
| Orden de despliegue | 1) BFF Render 2) migraciones Supabase 3) Hosting |
| Validación migraciones | `node scripts/validate-supabase-migrations.mjs` |
| Registro de pruebas unitarias | `npm test` (Vitest); sin matriz 29119 |

---

## Verificación rápida post-despliegue

1. Usuario **trabajador**: en DevTools → Network, solo rutas `/staff/*` para ventas/productos/pedidos propios del panel.
2. Mismo usuario: `403` en `GET /admin/dailySales`, `GET /admin/productFinanzas`, `GET /admin/users`.
3. Usuario **admin**: acceso completo vía `/admin/*`.
4. `npm test` y `npm run typecheck` en verde antes de release.

---

## Profundización pendiente (honestidad técnica)

| Área | Estado | Norma |
|------|--------|-------|
| RPC productos / stock admin | **Cerrado** — `20260519150000` revoca `anon`/`authenticated`; BFF `service_role` + `assertAdminRole` | 27001 |
| `AdminData` import/export | **Cerrado** — `/admin/data/*` solo admin vía BFF | 27001 / 9001 |
| App Check + CSP + Cloudinary | **Parcial** — código listo; falta activar App Check en Firebase Console y secretos BFF Cloudinary | 27001 |
| Roles `psicologo` / `rrhh` | Pendiente eliminación de producto | 27001 |
| SGSI certificable | No — faltan políticas, SoA, auditoría externa, pentest | 27001 |

---

*Última actualización: profundización ISO — RPC BFF-only, AdminData BFF, PII staff pedidos, Cloudinary firmado, App Check.*
