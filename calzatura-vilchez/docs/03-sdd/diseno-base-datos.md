# SDD — Diseño de Base de Datos
## Calzatura Vilchez — Supabase / PostgreSQL 15

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | 2026-05-05 |
| Motor | PostgreSQL 15 (Supabase) |
| Norma base | ISO 9001:2015 — Información documentada; ISO/IEC 27001 — Control de acceso y trazabilidad |

---

## 1. Esquema de tablas

### 1.1 `productos`
Catálogo público de calzado.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | Identificador único del producto |
| `nombre` | text | NOT NULL | Nombre comercial del producto |
| `descripcion` | text | | Descripción detallada |
| `precio` | numeric(10,2) | NOT NULL, CHECK > 0 | Precio de venta en soles (S/) |
| `precioOriginal` | numeric(10,2) | | Precio antes del descuento |
| `descuento` | integer | DEFAULT 0, CHECK 0-100 | Porcentaje de descuento (10, 20, 30) |
| `categoria` | text | NOT NULL, CHECK IN ('hombre','dama','juvenil','nino','bebe') | Categoría de calzado |
| `tipoCalzado` | text | | Tipo específico (bota, zapatilla, sandalia, etc.) |
| `marca` | text | | Marca del fabricante |
| `campana` | text | | Campaña comercial (cyber-wow, escolar, etc.) |
| `familiaId` | uuid | FK → familias.id | Familia de productos para agrupar variantes |
| `imagenes` | text[] | NOT NULL, DEFAULT '{}' | Array de URLs de Cloudinary |
| `tallas` | text[] | DEFAULT '{}' | Lista de tallas disponibles ['36','37','38'] |
| `tallaStock` | jsonb | DEFAULT '{}' | Stock por talla: {"36": 5, "37": 3} |
| `colores` | text[] | DEFAULT '{}' | Lista de colores disponibles |
| `colorStock` | jsonb | DEFAULT '{}' | Stock por color |
| `stock` | integer | NOT NULL, DEFAULT 0, CHECK >= 0 | Stock total calculado |
| `destacado` | boolean | DEFAULT false | Producto destacado en el catálogo |
| `publicado` | boolean | DEFAULT true | Visibilidad pública del producto |
| `createdAt` | timestamptz | DEFAULT now() | Fecha de creación |
| `updatedAt` | timestamptz | DEFAULT now() | Última actualización |

**Índices:**
- `idx_productos_categoria` ON `categoria`
- `idx_productos_marca` ON `marca`
- `idx_productos_destacado` ON `destacado DESC`
- `idx_productos_publicado` ON `publicado` WHERE `publicado = true`
- `idx_productos_stock` ON `stock` — para alertas de stock en servicio IA

**Políticas RLS:**
```sql
-- Lectura pública del catálogo
CREATE POLICY "productos_select_public" ON productos
  FOR SELECT USING (publicado = true);

-- Solo admin/trabajador puede modificar
CREATE POLICY "productos_insert_admin" ON productos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM usuarios WHERE uid = auth.uid()
            AND rol IN ('admin', 'trabajador'))
  );
```

---

### 1.2 `pedidos`
Órdenes de compra en línea de clientes.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | uuid | PK | Identificador del pedido |
| `userId` | text | NOT NULL, FK → Firebase UID | UID del cliente en Firebase Auth |
| `productos` | jsonb | NOT NULL | Array de ítems: [{productId, nombre, talla, color, cantidad, precio}] |
| `total` | numeric(10,2) | NOT NULL | Monto total del pedido en S/ |
| `estado` | text | NOT NULL, CHECK IN ('pendiente','confirmado','en_proceso','enviado','entregado','cancelado') | Estado actual del pedido |
| `metodoPago` | text | NOT NULL, CHECK IN ('stripe','contraentrega') | Método de pago |
| `direccionEnvio` | jsonb | NOT NULL | {nombre, calle, ciudad, departamento, cp, telefono} |
| `notas` | text | | Notas del cliente para el pedido |
| `stripeSessionId` | text | | ID de sesión de Stripe (si aplica) |
| `createdAt` | timestamptz | DEFAULT now() | Fecha de creación del pedido |
| `updatedAt` | timestamptz | DEFAULT now() | Última actualización de estado |

**Políticas RLS:**
```sql
-- Cliente ve solo sus pedidos
CREATE POLICY "pedidos_select_owner" ON pedidos
  FOR SELECT USING (userId = auth.uid());

-- Admin ve todos los pedidos
CREATE POLICY "pedidos_select_admin" ON pedidos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios WHERE uid = auth.uid()
            AND rol IN ('admin', 'trabajador'))
  );

-- Cliente crea su propio pedido
CREATE POLICY "pedidos_insert_client" ON pedidos
  FOR INSERT WITH CHECK (userId = auth.uid());
```

---

### 1.3 `ventasDiarias`
Registro de ventas presenciales manuales.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | uuid | PK | Identificador de la venta |
| `productId` | uuid | NOT NULL, FK → productos.id | Producto vendido |
| `productoNombre` | text | NOT NULL | Nombre del producto (desnormalizado para historial) |
| `talla` | text | | Talla vendida |
| `color` | text | | Color vendido |
| `cantidad` | integer | NOT NULL, CHECK > 0 | Unidades vendidas |
| `precioVenta` | numeric(10,2) | NOT NULL | Precio al que se vendió |
| `costo` | numeric(10,2) | | Costo de adquisición (de productoFinanzas) |
| `ganancia` | numeric(10,2) | GENERATED ALWAYS AS (precioVenta*cantidad - costo*cantidad) | Ganancia calculada automáticamente |
| `fecha` | date | NOT NULL, DEFAULT CURRENT_DATE | Fecha de la venta |
| `adminId` | text | NOT NULL | UID del admin que registró |
| `tipoDocumento` | text | CHECK IN ('ninguno','nota_venta','guia_remision') | Tipo de documento generado |
| `devolucion` | boolean | DEFAULT false | Indica si fue devuelta |
| `fechaDevolucion` | date | | Fecha de la devolución |
| `createdAt` | timestamptz | DEFAULT now() | Timestamp de creación del registro |

**Índices:**
- `idx_ventas_fecha` ON `fecha DESC` — para consultas históricas del servicio IA
- `idx_ventas_productId` ON `productId` — para predicción por producto
- `idx_ventas_devolucion` ON `devolucion` WHERE `devolucion = false`

---

### 1.4 `usuarios`
Perfiles de clientes y administradores.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | uuid | PK | Identificador interno |
| `uid` | text | UNIQUE, NOT NULL | UID de Firebase Auth |
| `nombre` | text | NOT NULL | Nombre completo |
| `correo` | text | UNIQUE, NOT NULL | Correo electrónico |
| `telefono` | text | | Número de teléfono |
| `dni` | text | | DNI validado con RENIEC |
| `rol` | text | NOT NULL, DEFAULT 'cliente', CHECK IN ('cliente','trabajador','admin') | Rol en el sistema |
| `direcciones` | jsonb | DEFAULT '[]' | Array de hasta 3 direcciones guardadas |
| `createdAt` | timestamptz | DEFAULT now() | Fecha de registro |

**Políticas RLS:**
```sql
-- Usuario ve su propio perfil
CREATE POLICY "usuarios_select_own" ON usuarios
  FOR SELECT USING (uid = auth.uid());

-- Usuario actualiza su propio perfil (excepto rol)
CREATE POLICY "usuarios_update_own" ON usuarios
  FOR UPDATE USING (uid = auth.uid())
  WITH CHECK (rol = (SELECT rol FROM usuarios WHERE uid = auth.uid()));

-- Admin ve todos los usuarios
CREATE POLICY "usuarios_select_admin" ON usuarios
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios WHERE uid = auth.uid() AND rol = 'admin')
  );
```

---

### 1.5 `fabricantes`
Proveedores de calzado.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | uuid | PK | Identificador |
| `nombre` | text | NOT NULL | Razón social o nombre comercial |
| `ruc` | text | | RUC del fabricante |
| `direccion` | text | | Dirección física |
| `telefono` | text | | Teléfono de contacto |
| `correo` | text | | Correo electrónico |
| `marcas` | text[] | DEFAULT '{}' | Marcas que provee |
| `ultimoIngreso` | date | | Fecha del último ingreso de mercadería |
| `documentos` | jsonb | DEFAULT '[]' | Array de documentos: [{nombre, url, tipo, fecha}] |
| `observaciones` | text | | Notas internas del fabricante |
| `createdAt` | timestamptz | DEFAULT now() | Fecha de creación |

---

### 1.6 `productoCodigos`
Códigos internos de inventario.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | uuid | PK | Identificador |
| `productId` | uuid | NOT NULL, FK → productos.id ON DELETE CASCADE | Producto al que pertenece el código |
| `codigo` | text | NOT NULL | Código interno de inventario |
| `descripcion` | text | | Descripción del código |
| `createdAt` | timestamptz | DEFAULT now() | Fecha de creación |

---

### 1.7 `productoFinanzas`
Costos y márgenes de productos.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | uuid | PK | Identificador |
| `productId` | uuid | NOT NULL, UNIQUE, FK → productos.id | Producto (relación 1:1) |
| `costo` | numeric(10,2) | NOT NULL | Costo de adquisición en S/ |
| `margenDeseado` | numeric(5,2) | | Margen objetivo (%) |
| `precioSugerido` | numeric(10,2) | | Precio de venta sugerido |
| `margenReal` | numeric(5,2) | GENERATED | (precio - costo) / precio * 100 |
| `updatedAt` | timestamptz | DEFAULT now() | Última actualización |

---

### 1.8 `auditoria`
Log de trazabilidad de operaciones (ISO 9001:2015).

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | uuid | PK | Identificador del registro |
| `adminUid` | text | NOT NULL | UID del administrador que realizó la acción |
| `tipo` | text | NOT NULL | Tipo de operación: CREATE_PRODUCT, UPDATE_PRODUCT, DELETE_PRODUCT, CHANGE_ROLE, etc. |
| `entidad` | text | | Tipo de entidad afectada: producto, usuario, venta |
| `entidadId` | text | | ID de la entidad afectada |
| `valorAnterior` | jsonb | | Estado anterior del objeto modificado |
| `valorNuevo` | jsonb | | Estado nuevo del objeto modificado |
| `descripcion` | text | | Descripción legible de la operación |
| `timestamp` | timestamptz | DEFAULT now() | Momento exacto de la operación |
| `ip` | text | | Dirección IP del cliente (si disponible) |

**Política RLS:**
```sql
-- Solo admin puede leer la auditoría
CREATE POLICY "auditoria_select_admin" ON auditoria
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios WHERE uid = auth.uid() AND rol = 'admin')
  );

-- El sistema puede insertar (usando service_role key)
-- No se permite UPDATE ni DELETE en la tabla de auditoría
```

---

### 1.9 `ire_historial`
Serie temporal del Índice de Riesgo Empresarial.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | uuid | PK | Identificador |
| `fecha` | date | NOT NULL, UNIQUE | Fecha del cálculo (un registro por día) |
| `score` | numeric(5,2) | NOT NULL, CHECK 0-100 | IRE calculado (0=sin riesgo, 100=crítico) |
| `clasificacion` | text | CHECK IN ('Bajo','Moderado','Alto','Crítico') | Clasificación textual |
| `riesgoStock` | numeric(5,2) | | Componente de riesgo de stock (0-100) |
| `riesgoIngresos` | numeric(5,2) | | Componente de riesgo de ingresos (0-100) |
| `riesgoDemanda` | numeric(5,2) | | Componente de riesgo de demanda (0-100) |
| `productosEnAlerta` | integer | | N.° de productos en alerta de stock |
| `productosTotal` | integer | | N.° total de productos activos |
| `horizonDays` | integer | DEFAULT 30 | Horizonte de predicción usado |
| `createdAt` | timestamptz | DEFAULT now() | Timestamp de inserción |

---

### 1.10 `modelo_estado`
Metadatos del último entrenamiento del modelo IA.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | integer | PK, DEFAULT 1 | Singleton: siempre id=1 |
| `data_hash` | text | | Hash de los datos de entrenamiento para detectar cambios |
| `model_type` | text | | Tipo de modelo: 'random_forest', 'hybrid' |
| `n_products_trained` | integer | | N.° de productos con modelo entrenado |
| `n_products_no_data` | integer | | N.° de productos sin historial suficiente |
| `cached_at` | date | | Fecha del último entrenamiento |
| `training_meta` | jsonb | | Metadatos completos del entrenamiento |
| `updatedAt` | timestamptz | DEFAULT now() | Última actualización |

---

## 2. Diagrama de relaciones (conceptual)

```
productos ──────────────────── productoCodigos (1:N)
    │                      └── productoFinanzas (1:1)
    │
    ├── ventasDiarias.productId (N:M via ventas)
    │
pedidos ─── userId (FK → Firebase UID → usuarios.uid)
    │
usuarios ──── auditoria.adminUid
    │
ire_historial (tabla independiente, calculada por servicio IA)
modelo_estado (tabla independiente, singleton)
fabricantes (tabla independiente)
```

---

## 3. Justificación del diseño

### 3.1 JSONB para stock por talla y colores
El campo `tallaStock` usa JSONB en lugar de una tabla normalizada de variantes. Esta decisión se toma porque:
- El catálogo de Calzatura Vilchez es relativamente pequeño (< 500 productos activos).
- Los patrones de consulta son principalmente de lectura del objeto completo (no consultas analíticas sobre tallas individuales).
- JSONB en PostgreSQL tiene índices GIN que permiten búsquedas eficientes por talla específica cuando se necesita.
- La flexibilidad de JSONB permite agregar tallas nuevas sin cambios de esquema.

### 3.2 Desnormalización de `productoNombre` en `ventasDiarias`
El nombre del producto se almacena de forma redundante en `ventasDiarias` para garantizar la integridad histórica del registro de ventas: si el producto se elimina o se renombra, el historial de ventas mantiene el nombre original. Esto sigue el principio de auditoría de ISO 9001 (trazabilidad de operaciones pasadas).

### 3.3 Tabla de auditoría append-only
La tabla `auditoria` no tiene políticas de UPDATE ni DELETE (solo INSERT). Esto garantiza que el log de auditoría es inmutable: una vez registrada una operación, no puede ser eliminada o modificada, cumpliendo con el requisito de no repudio de ISO/IEC 27001 (Control A.12.4.1).

### 3.4 `ire_historial` con UNIQUE en `fecha`
La restricción UNIQUE en el campo `fecha` garantiza que solo existe un registro del IRE por día. El servicio IA usa UPSERT (INSERT ... ON CONFLICT DO UPDATE) para actualizar el registro del día actual si ya existe, evitando duplicados al recalcular el IRE múltiples veces en el mismo día.
