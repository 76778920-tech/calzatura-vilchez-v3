# Historias de Usuario — Calzatura Vilchez

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | 2026-05-05 |
| Metodología | Agile — formato "Como [rol], quiero [acción] para [beneficio]" |
| Referencia SRS | docs/01-srs/SRS-Calzatura-Vilchez.md |

Las historias de usuario se organizan por épica funcional y cada una incluye criterios de aceptación (Given / When / Then), la referencia al requisito del SRS y el artículo científico que fundamenta su valor.

---

## ÉPICA 1: Descubrimiento y navegación de productos

### HU-01 — Explorar el catálogo sin registrarse
**Como** visitante del sitio,  
**quiero** navegar el catálogo de productos sin necesidad de crear una cuenta,  
**para** conocer la oferta de Calzatura Vilchez antes de decidir comprar.

**Criterios de aceptación:**
- **Given** que soy un visitante no autenticado
- **When** accedo a la página principal o a `/catalog`
- **Then** veo una grilla de productos con imagen, nombre, precio y categoría
- **And** puedo filtrar por categoría, marca, precio y texto
- **And** no me redirige a login ni me solicita autenticación

**Referencia SRS:** RF-01, RF-02  
**Artículo:** Pavlou & Fygenson (2006) — La fase de búsqueda de información es independiente de la intención de transacción; bloquear el catálogo reduce la tasa de conversión.

---

### HU-02 — Filtrar productos por categoría
**Como** cliente que busca calzado de dama,  
**quiero** filtrar el catálogo por categoría "dama",  
**para** ver solo los productos relevantes para mí y ahorrar tiempo de búsqueda.

**Criterios de aceptación:**
- **Given** que estoy en el catálogo con productos de múltiples categorías
- **When** selecciono el filtro "Dama"
- **Then** solo se muestran productos con `categoria = 'dama'`
- **And** el conteo de resultados se actualiza inmediatamente
- **And** puedo combinar el filtro de categoría con otros filtros (marca, precio)

**Referencia SRS:** RF-02  
**Artículo:** Gefen et al. (2003) — La facilidad de uso percibida (encontrar el producto deseado) es antecedente directo de la utilidad percibida.

---

### HU-03 — Ver detalle completo de un producto
**Como** cliente interesado en un modelo específico,  
**quiero** ver todas las imágenes, tallas disponibles con stock, precio y descripción del producto,  
**para** tomar una decisión de compra informada sin necesidad de ir a la tienda física.

**Criterios de aceptación:**
- **Given** que estoy en la página de detalle de un producto
- **When** cargo la página
- **Then** veo un carrusel con todas las imágenes del producto (hasta 5)
- **And** veo las tallas disponibles con indicador visual: verde (disponible), naranja (< 5 unidades), gris (agotado)
- **And** veo el precio con descuento resaltado si aplica, y el precio original tachado
- **And** el botón "Agregar al carrito" está deshabilitado si el producto está agotado en todas las tallas

**Referencia SRS:** RF-03, RF-04, RF-05  
**Artículo:** Hajli (2015) — La información completa del producto en el detalle reduce la incertidumbre del comprador y aumenta la confianza (efecto mediado β = 0.52).

---

## ÉPICA 2: Proceso de compra

### HU-04 — Agregar productos al carrito
**Como** cliente que quiere comprar,  
**quiero** agregar un producto al carrito indicando la talla y la cantidad,  
**para** acumular todos los productos que deseo comprar antes de pagar.

**Criterios de aceptación:**
- **Given** que estoy en la página de detalle de un producto disponible
- **When** selecciono una talla con stock disponible, ingreso la cantidad y hago clic en "Agregar al carrito"
- **Then** el producto se agrega al carrito y el ícono del carrito muestra el nuevo conteo
- **And** aparece una notificación de confirmación "Producto agregado al carrito"
- **And** si intento agregar más unidades que el stock disponible, el sistema me avisa y limita la cantidad al máximo

**Referencia SRS:** RF-11

---

### HU-05 — Pagar con tarjeta de crédito/débito
**Como** cliente que ha completado su carrito,  
**quiero** pagar con mi tarjeta de crédito o débito de forma segura,  
**para** completar mi compra sin tener que ir a la tienda física.

**Criterios de aceptación:**
- **Given** que tengo sesión iniciada y mi carrito tiene productos
- **When** selecciono "Pago con tarjeta" y confirmo el pedido
- **Then** soy redirigido a la página de pago de Stripe con el monto correcto
- **And** Stripe procesa el pago de forma segura (PCI DSS)
- **And** al completar el pago soy redirigido a una página de confirmación con el número de pedido
- **And** recibo una notificación del estado del pedido

**Referencia SRS:** RF-13  
**Artículo:** Gefen et al. (2003) — Las garantías institucionales (Stripe como proveedor de pago reconocido) son un mecanismo de confianza institucional que reduce el riesgo percibido de la transacción.

---

### HU-06 — Pagar contra entrega
**Como** cliente que no confía en pagar en línea,  
**quiero** hacer mi pedido y pagar cuando me llegue el producto,  
**para** reducir mi riesgo percibido en mi primera compra online.

**Criterios de aceptación:**
- **Given** que tengo sesión iniciada y mi carrito tiene productos
- **When** selecciono "Pago contraentrega" y confirmo el pedido
- **Then** el pedido se registra en Supabase con estado "pendiente" y método "contraentrega"
- **And** veo la confirmación del pedido con el número asignado
- **And** no se requiere ningún dato de tarjeta

**Referencia SRS:** RF-14  
**Artículo:** Pavlou & Fygenson (2006) — El riesgo percibido es una barrera en la intención de transacción; la opción de contraentrega reduce este riesgo para compradores nuevos.

---

## ÉPICA 3: Perfil y cuenta de usuario

### HU-07 — Registrar mi cuenta
**Como** visitante que quiere comprar,  
**quiero** crear una cuenta con mis datos y validar mi identidad con mi DNI,  
**para** tener un perfil personal donde guardar mis pedidos y direcciones.

**Criterios de aceptación:**
- **Given** que soy un visitante sin cuenta
- **When** completo el formulario de registro con nombre, correo, contraseña, teléfono y DNI válido
- **Then** el sistema valida mi DNI con la API de RENIEC en tiempo real
- **And** si el DNI es válido, se crea mi cuenta y soy redirigido automáticamente
- **And** si el correo ya existe, veo el mensaje "Ya existe una cuenta con este correo"
- **And** si el DNI no existe en RENIEC, veo el mensaje "DNI no encontrado"

**Referencia SRS:** RF-06  
**Artículo:** Gefen et al. (2003) — La verificación de identidad refuerza la confianza institucional del sistema, mecanismo clave para reducir el abandono en el proceso de registro.

---

### HU-08 — Guardar productos en favoritos
**Como** cliente que explora productos,  
**quiero** guardar los productos que me interesan en mi lista de favoritos,  
**para** poder encontrarlos fácilmente en mi próxima visita.

**Criterios de aceptación:**
- **Given** que tengo sesión iniciada
- **When** hago clic en el ícono de corazón en un producto
- **Then** el producto se guarda en mi lista de favoritos (Firestore)
- **And** el ícono de corazón cambia a rojo para indicar que está guardado
- **And** puedo ver todos mis favoritos en mi perfil en `/profile/favorites`
- **And** puedo quitar un producto de favoritos haciendo clic nuevamente en el ícono

**Referencia SRS:** RF-09  
**Artículo:** Liang & Turban (2011); Hajli (2015) — Los favoritos (wishlist) son una funcionalidad de social commerce que aumenta el engagement y la recurrencia de visita al sitio.

---

## ÉPICA 4: Administración del catálogo

### HU-09 — Crear un nuevo producto
**Como** administrador de la tienda,  
**quiero** crear nuevos productos con imágenes, tallas, stock por talla y precio,  
**para** mantener el catálogo actualizado y publicar los modelos nuevos que llegan al negocio.

**Criterios de aceptación:**
- **Given** que tengo sesión con rol admin
- **When** completo el formulario de nuevo producto y subo las imágenes
- **Then** las imágenes se suben a Cloudinary y se almacenan las URLs en Supabase
- **And** el producto aparece inmediatamente en el catálogo público
- **And** puedo definir el stock inicial por talla (ej. Talla 36: 3 unidades, Talla 37: 5 unidades)
- **And** la operación queda registrada en la tabla de auditoría

**Referencia SRS:** RF-16, RF-17, RF-35  
**Norma:** ISO 9001:2015 Cláusula 8.5.1 — Control de producción y provisión del servicio.

---

### HU-10 — Ver alertas de stock antes de que se agoten
**Como** administrador de la tienda,  
**quiero** recibir alertas cuando un producto esté próximo a agotarse,  
**para** hacer el pedido de reposición a tiempo y evitar perder ventas por falta de stock.

**Criterios de aceptación:**
- **Given** que estoy en el panel de predicciones
- **When** el modelo de IA calcula que un producto se agotará en menos de 7 días
- **Then** ese producto aparece en la sección "Alertas críticas" con la fecha exacta estimada de quiebre
- **And** si el agotamiento es entre 8 y 15 días, aparece en "Alertas"
- **And** si es entre 16 y 30 días, aparece en "Avisos"
- **And** la fecha de quiebre se calcula como: fecha_actual + (stock_actual / predicción_diaria)

**Referencia SRS:** RF-28  
**Artículo:** Fildes et al. (2022) — Las alertas de stock son la aplicación operativa más directa del forecasting de retail; reducen los quiebres de stock en 15-25%.

---

### HU-11 — Registrar una venta presencial
**Como** trabajador en la tienda física,  
**quiero** registrar rápidamente una venta presencial buscando el producto por código interno,  
**para** mantener el inventario actualizado en tiempo real sin necesidad de proceso manual separado.

**Criterios de aceptación:**
- **Given** que tengo sesión con rol trabajador o admin
- **When** busco un producto por código interno o nombre y lo selecciono
- **Then** el sistema autocompleta el precio y me muestra las tallas/colores disponibles
- **And** al confirmar la venta, el stock se descuenta automáticamente
- **And** el sistema calcula la ganancia (precioVenta - costoProducto) y la muestra
- **And** puedo imprimir la nota de venta desde el mismo formulario

**Referencia SRS:** RF-21, RF-22

---

## ÉPICA 5: Inteligencia artificial y riesgo

### HU-12 — Conocer el riesgo actual del negocio
**Como** gerente de Calzatura Vilchez,  
**quiero** ver un índice único que me diga qué tan en riesgo está el negocio hoy,  
**para** tomar decisiones preventivas antes de que los problemas se materialicen en pérdidas.

**Criterios de aceptación:**
- **Given** que tengo sesión como admin y el servicio IA está disponible
- **When** accedo al panel de predicciones
- **Then** veo el IRE actual con un número de 0 a 100 y su clasificación (Bajo / Moderado / Alto / Crítico)
- **And** veo los tres componentes del IRE: riesgo de stock, riesgo de ingresos, riesgo de demanda con sus valores individuales
- **And** veo el IRE proyectado a 30 días (qué pasará si no hago nada)
- **And** veo una gráfica de la evolución del IRE en los últimos 30 días

**Referencia SRS:** RF-29, RF-30, RF-31  
**Artículos:** Altman (1968) — Z-score como índice multivariado de riesgo; Beaver (1966) — deterioro de indicadores detectable con anticipación; Ohlson (1980) — expresión del riesgo como probabilidad directa.

---

### HU-13 — Ver cuánto se venderá de cada producto
**Como** administrador de compras,  
**quiero** ver una estimación de cuántas unidades se venderán de cada producto en los próximos 30 días,  
**para** planificar los pedidos a fabricantes con anticipación y evitar sobrestock o faltantes.

**Criterios de aceptación:**
- **Given** que estoy en el panel de predicciones
- **When** el servicio de IA procesa las predicciones
- **Then** veo una tabla con cada producto, la predicción de unidades en el horizonte seleccionado y la tendencia (subiendo/estable/bajando)
- **And** los productos con menos de 14 días de historial muestran "Sin historial suficiente"
- **And** puedo cambiar el horizonte de predicción entre 7, 15 y 30 días
- **And** la confianza del modelo (0-100) se muestra para cada predicción

**Referencia SRS:** RF-27  
**Artículos:** Breiman (2001) — RandomForestRegressor; Makridakis et al. (2018) — validación para series cortas; Fildes et al. (2022) — forecasting retail por SKU.

---

### HU-14 — Clasificar inventario por importancia ABC
**Como** gerente de operaciones,  
**quiero** ver qué productos generan el 80% de mis ingresos (categoría A),  
**para** priorizar el reabastecimiento de los productos críticos y reducir capital inmovilizado en categoría C.

**Criterios de aceptación:**
- **Given** que estoy en el panel de predicciones
- **When** cargo la sección de análisis ABC
- **Then** veo los productos clasificados en A (top 80% de ingresos), B (siguiente 15%) y C (último 5%)
- **And** puedo filtrar la vista para ver solo una categoría ABC
- **And** veo el valor de inventario inmovilizado por categoría

**Referencia SRS:** RF-32  
**Artículo:** Chen et al. (2012) — El análisis BI&A en e-commerce incluye la clasificación de productos para optimización de inventario como una de las 6 aplicaciones de alto impacto.
