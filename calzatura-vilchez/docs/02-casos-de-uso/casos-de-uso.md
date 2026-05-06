# Especificación de Casos de Uso — Calzatura Vilchez

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | 2026-05-05 |
| Norma base | ISO/IEC 25010:2011 — Funcionalidad completa |
| Referencia SRS | docs/01-srs/SRS-Calzatura-Vilchez.md |

---

## Actores del sistema

| Actor | Tipo | Descripción |
|---|---|---|
| Visitante | Primario | Usuario no autenticado que navega el catálogo público |
| Cliente | Primario | Usuario registrado que realiza compras y gestiona su perfil |
| Administrador | Primario | Empleado interno que gestiona el back-office del negocio |
| Superadministrador | Primario | Usuario con acceso completo, incluyendo gestión de roles |
| Firebase Auth | Secundario | Sistema de autenticación externo |
| Stripe | Secundario | Pasarela de pago externa |
| Supabase | Secundario | Base de datos y API REST externa |
| Servicio IA | Secundario | FastAPI con modelo RandomForestRegressor |
| Cloudinary | Secundario | CDN de imágenes externo |

---

## CU-01: Navegar catálogo de productos

**Actores:** Visitante, Cliente  
**Precondición:** El sistema está disponible. No requiere autenticación.  
**Postcondición:** El usuario visualiza una lista de productos con sus atributos principales.

**Flujo principal:**
1. El usuario accede a la ruta `/` o `/catalog`.
2. El sistema carga los productos de Supabase tabla `productos` (filtro: `publicado = true`).
3. El sistema muestra los productos ordenados por `destacado DESC, createdAt DESC` en una grilla responsiva.
4. El usuario puede aplicar filtros: categoría, marca, precio mínimo/máximo o texto de búsqueda.
5. Los filtros se aplican en tiempo real mediante re-consulta a Supabase con los parámetros correspondientes.
6. El sistema pagina los resultados en grupos de 20 productos.

**Flujos alternativos:**
- 4a. Si no hay productos con los filtros aplicados: el sistema muestra el mensaje "No se encontraron productos con estos filtros" y un botón para limpiar filtros.
- 2a. Si Supabase no responde en 5 segundos: el sistema muestra un skeleton loader y reintenta la consulta una vez.

**Referencia ISO/IEC 25010:** Funcionalidad — Completitud funcional; Fiabilidad — Disponibilidad.  
**Artículo relacionado:** Pavlou & Fygenson (2006) — La fase de búsqueda de información en e-commerce tiene determinantes diferentes a la fase de transacción; este CU cubre la primera fase (R² = 0.60 en intención de búsqueda).

---

## CU-02: Consultar detalle de producto

**Actores:** Visitante, Cliente  
**Precondición:** El producto existe y está publicado en el catálogo.  
**Postcondición:** El usuario puede ver todos los atributos del producto y agregar al carrito.

**Flujo principal:**
1. El usuario hace clic en un producto en el catálogo.
2. El sistema navega a la ruta `/productos/:id`.
3. El sistema carga los datos del producto desde Supabase: nombre, descripción, precio, precio original, descuento, imágenes, tallas, stock por talla, colores, tipo de calzado, marca.
4. El sistema muestra un carrusel de imágenes (hasta 5) con navegación manual.
5. El sistema muestra las tallas disponibles con indicador de stock: disponible (verde), últimas unidades (naranja, stock < 5), agotado (gris).
6. El usuario selecciona talla y cantidad.
7. El usuario hace clic en "Agregar al carrito".
8. El sistema valida que la cantidad seleccionada ≤ stock disponible para la talla.
9. El sistema agrega el producto al carrito local (localStorage) y muestra una notificación de confirmación.

**Flujos alternativos:**
- 5a. Si el producto está agotado en todas las tallas: el botón "Agregar al carrito" está deshabilitado y se muestra "Producto agotado".
- 8a. Si la cantidad supera el stock: el sistema reduce automáticamente la cantidad al máximo disponible y notifica al usuario.

**Referencia ISO/IEC 25010:** Usabilidad — Protección contra errores del usuario; Funcionalidad — Exactitud funcional.  
**Artículo relacionado:** Hajli (2015) — Los ratings y reseñas (a incorporar en iteración futura) tienen el mayor impacto sobre la confianza del consumidor (β = 0.48, p < 0.001).

---

## CU-03: Registrar cuenta de usuario

**Actores:** Visitante, Firebase Auth  
**Precondición:** El visitante no tiene cuenta en el sistema.  
**Postcondición:** El usuario tiene una cuenta activa y puede iniciar sesión como Cliente.

**Flujo principal:**
1. El visitante accede a la ruta `/register`.
2. El sistema muestra el formulario de registro: nombre completo, correo, contraseña, confirmación de contraseña, teléfono, DNI.
3. El usuario completa el formulario.
4. El sistema valida en el cliente: formato de correo, contraseña mínimo 8 caracteres, coincidencia de contraseñas, formato de DNI (8 dígitos).
5. El sistema llama a la API de RENIEC para validar el DNI.
6. La API confirma que el DNI existe y retorna el nombre completo registrado.
7. El sistema crea la cuenta en Firebase Auth con correo y contraseña.
8. Firebase Auth retorna el `uid` del nuevo usuario.
9. El sistema crea el registro del usuario en Supabase tabla `usuarios` con: `uid`, nombre, correo, teléfono, DNI, `rol = 'cliente'`.
10. El sistema inicia sesión automáticamente y redirige al usuario a la página de inicio.

**Flujos alternativos:**
- 5a. Si el DNI no existe en RENIEC: el sistema muestra "DNI no encontrado. Verifica el número ingresado."
- 7a. Si el correo ya está registrado en Firebase: el sistema muestra "Ya existe una cuenta con este correo electrónico."
- 4a. Si alguna validación de formulario falla: el sistema muestra el error específico junto al campo correspondiente.

**Referencia ISO/IEC 27001:** Control A.9.2.1 — Registro y baja de usuarios.  
**Artículo relacionado:** Gefen et al. (2003) — La validación de DNI refuerza la confianza institucional del sistema. La familiaridad con el vendedor y las garantías institucionales son antecedentes clave de la confianza (β directo sobre utilidad percibida = 0.54).

---

## CU-04: Completar compra con pago Stripe

**Actores:** Cliente, Stripe, Firebase Auth, Supabase  
**Precondición:** El cliente tiene sesión iniciada y el carrito contiene al menos un producto con stock disponible.  
**Postcondición:** El pedido está registrado en Supabase con estado "pagado" y el stock se ha decrementado.

**Flujo principal:**
1. El cliente accede a `/cart` y revisa los productos del carrito.
2. El cliente hace clic en "Proceder al checkout".
3. El sistema navega a `/checkout`.
4. El cliente selecciona o ingresa una dirección de envío.
5. El cliente selecciona "Pago con tarjeta (Stripe)".
6. El cliente hace clic en "Confirmar pedido".
7. El sistema crea un registro provisional del pedido en Supabase con estado "pendiente".
8. El sistema llama a Firebase Cloud Functions para crear una sesión de pago en Stripe.
9. Stripe retorna una URL de sesión de pago.
10. El sistema redirige al cliente a la página de pago de Stripe.
11. El cliente ingresa los datos de su tarjeta en el formulario de Stripe.
12. Stripe procesa el pago y redirige al cliente a `/pedido-exitoso?session_id=...`.
13. El webhook de Stripe notifica a Firebase Cloud Functions que el pago fue exitoso.
14. La Cloud Function actualiza el pedido en Supabase: estado = "confirmado", decrementa el stock de los productos en la tabla `productos`.
15. El sistema muestra la página de confirmación con el número de pedido.

**Flujos alternativos:**
- 11a. Si el pago es rechazado por Stripe: Stripe muestra un mensaje de error en su página. El cliente puede reintentar. El pedido provisional en Supabase permanece en estado "pendiente" por 24 horas antes de ser cancelado automáticamente.
- 8a. Si la Cloud Function falla: el sistema muestra "Error al procesar el pago. Por favor, intenta de nuevo." y preserva el carrito del cliente.

**Referencia ISO/IEC 27001:** Control A.14.1.2 — Aseguramiento de servicios de la aplicación en redes públicas. Los datos de tarjeta se procesan exclusivamente en la infraestructura PCI DSS Nivel 1 de Stripe.  
**Artículo relacionado:** Pavlou & Fygenson (2006) — La confianza es el principal predictor de la intención de transacción (β = 0.42). La integración con Stripe (proveedor de confianza reconocida) eleva la confianza percibida en el proceso de pago.

---

## CU-05: Registrar venta presencial manual

**Actores:** Administrador, Supabase  
**Precondición:** El administrador tiene sesión iniciada con rol `admin` o `trabajador`. El producto a vender tiene stock disponible.  
**Postcondición:** La venta queda registrada en `ventasDiarias`, el stock del producto se decrementa y se calcula la ganancia.

**Flujo principal:**
1. El administrador accede al panel en `/admin/ventas`.
2. El administrador hace clic en "Nueva venta".
3. El sistema muestra el formulario de venta: campo de búsqueda de producto (por nombre o código interno), talla, color, cantidad, precio de venta.
4. El administrador escribe el código interno o nombre del producto.
5. El sistema busca en `productos` y `productoCodigos` y muestra los resultados coincidentes.
6. El administrador selecciona el producto.
7. El sistema autocompleta: precio de venta (del campo `precio` en `productos`) y las tallas/colores disponibles.
8. El administrador selecciona talla, color y cantidad.
9. El administrador confirma el precio (puede modificarlo si aplica).
10. El administrador hace clic en "Registrar venta".
11. El sistema crea el registro en `ventasDiarias`: productId, talla, color, cantidad, precioVenta, ganancia calculada (precioVenta - costo de `productoFinanzas`), fecha.
12. El sistema decrementa el stock del producto en la talla/color correspondiente.
13. El sistema muestra confirmación y opción de generar documento de venta.

**Flujos alternativos:**
- 8a. Si la cantidad supera el stock disponible: el sistema muestra "Stock insuficiente. Disponible: N unidades."
- 10a. Si la consulta a Supabase falla: el sistema muestra un mensaje de error y no registra la venta (atomicidad).

**Referencia ISO 9001:2015:** Cláusula 8.5.1 — Control de la producción y de la provisión del servicio. El registro de ventas manuales garantiza la trazabilidad operativa del proceso comercial.

---

## CU-06: Consultar predicciones de demanda e IRE

**Actores:** Administrador, Servicio IA  
**Precondición:** El administrador tiene sesión iniciada. El servicio IA está disponible en Render.com.  
**Postcondición:** El administrador visualiza las predicciones de demanda, alertas de stock, el IRE actual y proyectado.

**Flujo principal:**
1. El administrador accede al panel en `/admin/predictions`.
2. El frontend realiza una solicitud GET a `[RENDER_URL]/api/predict/demand?horizon=30&history=90` con el Bearer Token de autenticación.
3. El servicio IA verifica el token de autorización.
4. El servicio IA carga los datos de Supabase (ventas diarias, pedidos completados, productos) desde el caché o haciendo consultas frescas si el caché expiró.
5. El modelo RandomForestRegressor predice las unidades a vender por producto en los próximos 30 días.
6. El servicio retorna: lista de predicciones por producto (unidades estimadas, tendencia, confianza), alertas de stock (productos en riesgo de agotarse), gráfico semanal de ventas.
7. El frontend realiza una segunda solicitud GET a `/api/ire` para obtener el IRE actual y proyectado.
8. El servicio calcula el IRE: riesgo_stock (productos agotados / total), riesgo_ingresos (caída de ingresos vs. media histórica), riesgo_demanda (predicción negativa).
9. El frontend muestra: tarjeta del IRE con clasificación (Bajo/Moderado/Alto/Crítico), gráfico de la evolución histórica del IRE, tabla de predicciones por producto con alertas, gráfico semanal.
10. El administrador puede cambiar el horizonte de predicción (7/15/30 días) mediante un selector.
11. Al cambiar el horizonte, el frontend repite el flujo desde el paso 2 con el nuevo parámetro `horizon`.

**Flujos alternativos:**
- 2a. Si el servicio IA no responde en 5 segundos: el frontend muestra el mensaje "El servicio de predicciones no está disponible en este momento" y un botón de reintento.
- 5a. Si un producto tiene menos de 14 días de historial: el servicio lo incluye en la respuesta con `sin_historial: true` y `confianza: 0`. El frontend lo marca visualmente como "Sin historial suficiente".

**Referencia artículos:** Chen et al. (2012) — BI&A 2.0 para e-commerce; Breiman (2001) — fundamento del RandomForest; Makridakis et al. (2018) — validación del modelo para series cortas; Altman (1968), Beaver (1966) — fundamento del IRE.

---

## CU-07: Gestionar productos del catálogo

**Actores:** Administrador, Cloudinary, Supabase  
**Precondición:** El administrador tiene sesión con rol `admin`.  
**Postcondición:** El producto está creado/actualizado/eliminado en Supabase con sus imágenes en Cloudinary.

**Flujo principal (crear producto):**
1. El administrador accede a `/admin/products` y hace clic en "Nuevo producto".
2. El sistema muestra el formulario de producto: nombre, descripción, precio, precio original, categoría, tipo de calzado, marca, descuento, destacado (checkbox), tallas, stock por talla, colores, imágenes.
3. El administrador completa los campos y sube hasta 5 imágenes.
4. El sistema envía cada imagen a Cloudinary (Upload API), que retorna la URL permanente.
5. El sistema guarda el producto en Supabase `productos` con las URLs de Cloudinary.
6. El sistema registra la operación en `auditoria`: usuario, timestamp, tipo = "CREATE_PRODUCT", productId.
7. El sistema muestra el mensaje "Producto creado correctamente" y redirige al listado.

**Flujos alternativos:**
- 4a. Si Cloudinary rechaza la imagen (formato no soportado): el sistema muestra "Formato de imagen no soportado. Usa JPG, PNG o WebP."
- 5a. Si algún campo requerido (nombre, precio, categoría) está vacío: el sistema muestra el error junto al campo antes de intentar guardar.

**Referencia ISO 9001:2015:** Cláusula 8.4.3 — Información para los proveedores externos. La integración con Cloudinary está documentada y auditada.

---

## CU-08: Gestionar usuarios y roles

**Actores:** Superadministrador, Supabase  
**Precondición:** El usuario tiene sesión con rol `admin` y es el superadministrador (correo específico).  
**Postcondición:** El rol del usuario objetivo ha sido actualizado y la operación queda registrada en `auditoria`.

**Flujo principal:**
1. El superadministrador accede a `/admin/users`.
2. El sistema carga la lista de usuarios desde Supabase `usuarios`.
3. El superadministrador selecciona un usuario y hace clic en "Cambiar rol".
4. El sistema muestra un modal con el selector de rol: cliente, trabajador, admin.
5. El superadministrador selecciona el nuevo rol y confirma.
6. El sistema actualiza el campo `rol` en Supabase `usuarios`.
7. El sistema registra la operación en `auditoria`: adminUid, timestamp, tipo = "CHANGE_ROLE", usuarioAfectadoUid, rolAnterior, rolNuevo.
8. El sistema muestra confirmación del cambio.

**Referencia ISO/IEC 27001:** Control A.9.2.2 — Gestión de los derechos de acceso de usuarios; Control A.12.4.1 — Registro de eventos (audit trail).

---

## CU-09: Consultar historial de pedidos (cliente)

**Actores:** Cliente, Supabase  
**Precondición:** El cliente tiene sesión iniciada.  
**Postcondición:** El cliente visualiza el historial completo de sus pedidos con estados actualizados.

**Flujo principal:**
1. El cliente accede a `/profile/orders`.
2. El sistema consulta Supabase `pedidos` con filtro `userId = currentUser.uid` y orden `createdAt DESC`.
3. Las políticas RLS garantizan que el cliente solo recibe sus propios pedidos.
4. El sistema muestra la lista de pedidos: número, fecha, productos (imagen + nombre + talla + color), monto total, estado.
5. El cliente puede hacer clic en un pedido para ver el detalle completo.

**Referencia ISO/IEC 27001:** Control A.9.4.1 — Restricción de acceso a la información (RLS garantiza aislamiento de datos entre usuarios).

---

## CU-10: Registrar devolución de venta

**Actores:** Administrador, Supabase  
**Precondición:** La venta existe en `ventasDiarias` y no ha sido devuelta previamente.  
**Postcondición:** La venta está marcada como devuelta y el stock ha sido repuesto.

**Flujo principal:**
1. El administrador localiza la venta en el listado de ventas diarias.
2. El administrador hace clic en "Registrar devolución".
3. El sistema muestra un modal de confirmación con los detalles de la venta.
4. El administrador confirma la devolución.
5. El sistema actualiza `ventasDiarias`: `devolucion = true`, `fechaDevolucion = now()`.
6. El sistema incrementa el stock del producto en la talla/color correspondiente.
7. El sistema registra la operación en `auditoria`.
8. El sistema muestra "Devolución registrada. Stock repuesto."

**Referencia ISO 9001:2015:** Cláusula 8.7 — Control de las salidas no conformes. La gestión de devoluciones es parte del control de calidad del proceso de venta.
