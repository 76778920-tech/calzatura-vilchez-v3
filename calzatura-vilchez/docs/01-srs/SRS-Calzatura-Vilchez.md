# SRS — Especificación de Requisitos del Software
## Sistema web de comercio electrónico con modelo de IA para la predicción del riesgo empresarial en Calzatura Vilchez

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | 2026-05-05 |
| Proyecto | Calzatura Vilchez — E-commerce + IA |
| Asesor | Dr. Maglioni Arana Caparachin |
| Norma base | ISO/IEC 25010:2011 — Calidad del producto software |
| Normas complementarias | ISO 9001:2015 — Gestión de calidad; ISO/IEC 27001:2022 — Seguridad de la información |

---

## 1. Introducción

### 1.1 Propósito

Este documento especifica los requisitos del sistema web de comercio electrónico con modelo de inteligencia artificial para la predicción del riesgo empresarial de la empresa Calzatura Vilchez, ubicada en Huancayo, Perú. La especificación está dirigida al equipo de desarrollo, al asesor académico y a los evaluadores del proyecto de tesis.

La norma ISO/IEC 25010 estructura los requisitos de calidad en ocho características: funcionalidad, fiabilidad, usabilidad, eficiencia de rendimiento, mantenibilidad, portabilidad, compatibilidad y seguridad. Cada grupo de requisitos funcionales en este documento mapea a una o más de estas características.

### 1.2 Alcance del sistema

El sistema cubre:

- Catálogo público de productos de calzado con filtros de búsqueda, detalle por producto, imágenes múltiples, tallas, colores y disponibilidad de stock.
- Autenticación y perfil de usuarios clientes (registro, inicio de sesión, favoritos, historial de pedidos).
- Flujo de compra en línea: carrito → checkout → pago con Stripe o contraentrega → confirmación.
- Panel administrativo para gestión de productos, ventas diarias, pedidos, fabricantes y usuarios.
- Servicio de inteligencia artificial (FastAPI + scikit-learn) para predicción de demanda por producto, cálculo del Índice de Riesgo Empresarial (IRE) y alertas de stock.
- Aplicación móvil complementaria (Flutter) con catálogo, carrito y perfil para clientes.

El sistema no cubre: contabilidad formal, integraciones con SUNAT para facturación electrónica, o módulos de RRHH.

### 1.3 Definiciones y acrónimos

| Término | Definición |
|---|---|
| IRE | Índice de Riesgo Empresarial: puntuación 0–100 que combina riesgo de stock (40%), riesgo de ingresos (35%) y riesgo de demanda (25%) |
| SKU | Stock Keeping Unit: unidad mínima de inventario identificada por producto, talla y color |
| TAM | Technology Acceptance Model (Davis, 1989): modelo de aceptación tecnológica |
| TPB | Theory of Planned Behavior (Ajzen, 1991): teoría del comportamiento planificado |
| SEM | Structural Equation Modeling: modelado de ecuaciones estructurales |
| RLS | Row Level Security: políticas de seguridad a nivel de fila en Supabase/PostgreSQL |
| MAE | Mean Absolute Error: error absoluto medio del modelo predictivo |
| sMAPE | Symmetric Mean Absolute Percentage Error: error porcentual medio simétrico |
| SMOTE | Synthetic Minority Oversampling Technique |
| LASSO | Least Absolute Shrinkage and Selection Operator |

### 1.4 Fundamento académico

El sistema se fundamenta en 20 artículos científicos Q1 del estado del arte de la tesis. Los ejes temáticos y sus artículos de referencia son:

**Eje 1 — Comercio electrónico y adopción:** Gefen et al. (2003), Pavlou & Fygenson (2006), Liang & Turban (2011), Hajli (2015), Chen et al. (2012).

**Eje 2 — Modelos de predicción de demanda:** Makridakis et al. (2018), Fischer & Krauss (2018), Hochreiter & Schmidhuber (1997), Breiman (2001), LeCun et al. (2015), Ozbayoglu et al. (2020), Fildes et al. (2022).

**Eje 3 — Predicción del riesgo empresarial:** Altman (1968), Ohlson (1980), Beaver (1966), Tian et al. (2015), Wang et al. (2012).

**Eje 4 — Transformación digital:** Vial (2019), Nambisan (2017), Bharadwaj et al. (2013).

---

## 2. Descripción general del sistema

### 2.1 Perspectiva del producto

Calzatura Vilchez es una PYME del sector calzado en Huancayo que opera principalmente con venta presencial. El sistema representa la digitalización integral de sus operaciones comerciales, siguiendo el marco de transformación digital de Vial (2019), que define la transformación digital como "un proceso que mejora una entidad desencadenando cambios significativos mediante la combinación de tecnologías de información, computación, comunicación y conectividad".

Según Bharadwaj et al. (2013), la estrategia digital de la empresa cubre cuatro dimensiones: (1) Alcance: amplía cobertura geográfica más allá del local físico; (2) Escala: el canal digital crece sin proporcionalidad de costos fijos; (3) Velocidad: el modelo de IA toma decisiones de reabastecimiento en tiempo real; (4) Valor: los datos de ventas se convierten en ventaja competitiva vía predicción de demanda.

### 2.2 Funciones del producto

El sistema realiza las siguientes funciones principales:

1. Publicar y gestionar un catálogo de productos con imágenes, atributos y stock en tiempo real.
2. Procesar el ciclo completo de compra en línea (carrito → checkout → pago → confirmación).
3. Gestionar inventario con control de stock por talla y color.
4. Registrar ventas diarias manuales y calcular rentabilidad por operación.
5. Administrar fabricantes, usuarios y roles de acceso.
6. Predecir la demanda futura por producto usando un modelo RandomForestRegressor (scikit-learn).
7. Calcular y proyectar el Índice de Riesgo Empresarial (IRE) combinando riesgo de stock, ingresos y demanda.
8. Generar alertas de stock con fecha exacta de quiebre y análisis ABC de inventario.

### 2.3 Características de los usuarios

| Tipo de usuario | Nivel técnico | Descripción operacional |
|---|---|---|
| Visitante | Bajo | Navega el catálogo sin autenticación. Accede desde móvil o PC. No requiere formación previa. |
| Cliente | Bajo–Medio | Realiza compras en línea. Familiarizado con e-commerce básico. Accede principalmente desde móvil. |
| Administrador | Medio | Gestiona productos, ventas y pedidos desde el panel web. Formación básica en sistemas. |
| Superadministrador | Alto | Administra roles, configuraciones sensibles y datos financieros. Usuario técnico. |

La caracterización de usuarios se fundamenta en la escala de autoeficacia tecnológica del modelo TPB extendido de Pavlou & Fygenson (2006), que identifica que la capacidad del usuario para navegar y completar transacciones (autoeficacia) es el principal predictor del control conductual percibido. El diseño de la interfaz prioriza la usabilidad para usuarios de bajo nivel técnico.

### 2.4 Restricciones

- La plataforma web opera en navegadores modernos (Chrome 90+, Firefox 90+, Safari 14+).
- El servicio de IA requiere conexión a Supabase para leer datos históricos de ventas.
- Las predicciones del modelo son más precisas con al menos 14 días de historial de ventas por producto (umbral validado por Makridakis et al., 2018, para series cortas en contextos PYME).
- Los pagos con Stripe requieren cuenta empresarial activa y webhook configurado.
- El sistema no opera en modo offline.

### 2.5 Dependencias

| Servicio | Proveedor | Uso |
|---|---|---|
| Base de datos relacional | Supabase (PostgreSQL) | Datos de productos, pedidos, ventas, usuarios, fabricantes |
| Autenticación | Firebase Auth | Registro, inicio de sesión, tokens JWT |
| Almacenamiento de imágenes | Cloudinary | Subida, transformación y entrega de imágenes de productos |
| Procesamiento de pagos | Stripe | Sesiones de pago, webhooks de confirmación |
| Funciones serverless | Firebase Cloud Functions | Procesamiento seguro de pagos y webhooks |
| Servicio IA | FastAPI + scikit-learn en Render.com | Predicciones de demanda, IRE, alertas de stock |

---

## 3. Requisitos funcionales

### 3.1 Módulo de catálogo público

**RF-01 — Listado de productos**
El sistema muestra un catálogo de productos con imagen principal, nombre, precio, precio con descuento (si aplica), categoría y estado de stock. Los productos se ordenan por relevancia (destacados primero) y se paginan en grupos de 20.

*Fundamento ISO/IEC 25010:* Funcionalidad — Completitud funcional. *Artículo de referencia:* Gefen et al. (2003) identifica que la utilidad percibida (facilidad para encontrar productos) es determinante de la intención de compra (β = 0.54, p < 0.001).

**RF-02 — Filtros de búsqueda**
El sistema permite filtrar el catálogo por categoría (hombre, dama, juvenil, nino, bebe), marca, rango de precio y texto de búsqueda. Los filtros se aplican en tiempo real sin recarga de página.

*Fundamento ISO/IEC 25010:* Usabilidad — Capacidad de reconocimiento de adecuación. *Artículo de referencia:* Pavlou & Fygenson (2006) distingue la fase de búsqueda de información de la fase de transacción; el diseño del catálogo atiende la primera fase (R² = 0.60 para intención de búsqueda).

**RF-03 — Detalle de producto**
La página de detalle muestra: todas las imágenes del producto (carrusel), descripción, precio, descuento porcentual, tallas disponibles con stock por talla, selector de cantidad, código interno, marca, tipo de calzado y botón de agregar al carrito.

*Fundamento ISO/IEC 25010:* Funcionalidad — Exactitud funcional. *Artículo de referencia:* Hajli (2015) demuestra que los ratings y reseñas son el factor de mayor impacto sobre la confianza (β = 0.48); el detalle de producto es el punto de materialización de la confianza transaccional.

**RF-04 — Carrusel de imágenes**
El detalle de producto muestra hasta 5 imágenes en un carrusel con navegación manual y transición suave. Las imágenes se sirven desde Cloudinary con optimización automática de formato y resolución.

**RF-05 — Estado de disponibilidad**
El sistema muestra visualmente el estado de stock: "Disponible", "Últimas unidades" (stock < 5), "Agotado". Los productos agotados no permiten agregar al carrito pero permanecen visibles en el catálogo.

### 3.2 Módulo de autenticación y usuarios

**RF-06 — Registro de usuario**
El sistema permite registrar nuevos usuarios con: nombre completo, correo electrónico, contraseña (mínimo 8 caracteres), número de teléfono y número de DNI. El DNI se valida mediante la API de RENIEC. La contraseña se gestiona exclusivamente por Firebase Auth (nunca almacenada en texto plano).

*Fundamento ISO/IEC 27001:* Control A.9.4 — Control de acceso a sistemas y aplicaciones. La validación de DNI aumenta la confianza institucional del sistema, mecanismo validado por Gefen et al. (2003) como antecedente clave de la confianza en e-commerce.

**RF-07 — Inicio de sesión**
El sistema autentica usuarios con correo y contraseña mediante Firebase Auth. Soporta persistencia de sesión entre visitas. Implementa límite de intentos fallidos (5 intentos → bloqueo temporal de 15 minutos).

**RF-08 — Perfil de usuario**
El usuario autenticado puede consultar y actualizar: nombre, teléfono, y hasta 3 direcciones de envío. El correo electrónico no es modificable desde el perfil (solo desde Firebase Auth).

**RF-09 — Favoritos**
El usuario puede guardar y quitar productos de su lista de favoritos. Los favoritos se almacenan como subcolección del usuario en Firestore y son visibles en la sección de perfil.

**RF-10 — Historial de pedidos del cliente**
El cliente puede consultar el historial de todos sus pedidos con: fecha, productos, talla/color, monto total y estado actual (pendiente, confirmado, en proceso, enviado, entregado, cancelado).

### 3.3 Módulo de carrito y checkout

**RF-11 — Gestión del carrito**
El sistema mantiene un carrito de compras en el estado de la aplicación React. Permite: agregar productos con talla y color seleccionados, modificar cantidades (validadas contra stock disponible), eliminar productos y vaciar el carrito. El carrito persiste en localStorage entre sesiones.

*Fundamento ISO/IEC 25010:* Usabilidad — Protección contra errores del usuario (evitar agregar más unidades que el stock disponible).

**RF-12 — Checkout**
El proceso de checkout captura: dirección de envío (nueva o guardada en perfil), notas del pedido y método de pago (Stripe o contraentrega). El formulario valida todos los campos antes de proceder al pago.

*Fundamento artículo:* Pavlou & Fygenson (2006): el proceso de checkout completa la fase transaccional del e-commerce. La simplificación del flujo mejora el control conductual percibido (β = 0.61 para autoeficacia tecnológica).

**RF-13 — Pago con Stripe**
El sistema genera una sesión de pago en Stripe (mediante Firebase Cloud Functions) y redirige al cliente a la página de pago de Stripe. Al completar el pago, el webhook de Stripe confirma la transacción y actualiza el estado del pedido.

*Fundamento ISO/IEC 27001:* Control A.14.1.2 — Aseguramiento de los servicios de la aplicación en redes públicas. Los datos de tarjeta nunca pasan por los servidores del sistema (procesados directamente por Stripe PCI DSS Level 1).

**RF-14 — Pago contraentrega**
El sistema crea el pedido directamente en Supabase con estado "pendiente" y método de pago "contraentrega". No requiere procesamiento de tarjeta.

**RF-15 — Confirmación de pedido**
Tras completar el pago (Stripe o contraentrega), el sistema muestra una página de confirmación con el número de pedido, resumen de productos y estado "Pedido recibido".

### 3.4 Módulo administrativo — Productos

**RF-16 — Gestión de productos**
El administrador puede crear, editar y eliminar productos. Cada producto contiene: nombre, descripción, precio de venta, precio original (para calcular descuento), categoría, tipo de calzado, marca, imágenes (hasta 5), colores disponibles, tallas disponibles y stock por talla.

**RF-17 — Subida de imágenes**
El sistema sube imágenes a Cloudinary con transformación automática: conversión a WebP, redimensionamiento a 800×800 px y compresión optimizada. Cada imagen recibe una URL pública permanente almacenada en el registro del producto en Supabase.

**RF-18 — Códigos internos**
El administrador puede asignar códigos internos de inventario a cada producto (tabla `productoCodigos`). Los códigos permiten identificar el producto en el módulo de ventas manuales sin buscar por nombre.

**RF-19 — Finanzas de producto**
El administrador registra para cada producto: costo de adquisición, margen deseado y precio sugerido de venta. El sistema calcula automáticamente el margen real comparando precio de venta actual con el costo. Los datos se almacenan en la tabla `productoFinanzas`.

**RF-20 — Gestión de stock**
El sistema descuenta automáticamente el stock cuando se confirma un pedido o se registra una venta manual. El administrador puede ajustar el stock manualmente desde el panel de edición de productos.

### 3.5 Módulo administrativo — Ventas y pedidos

**RF-21 — Registro de ventas manuales**
El administrador registra ventas realizadas presencialmente: selecciona producto por marca/código interno, define talla, color, cantidad y precio. El sistema descuenta el stock, calcula la ganancia y registra la venta en la tabla `ventasDiarias`.

**RF-22 — Documentos de venta**
El sistema genera nota de venta o guía de remisión en formato imprimible (HTML/PDF) con los datos de la venta registrada.

**RF-23 — Devoluciones**
El administrador puede marcar una venta como devuelta. El sistema revierte el descuento de stock y registra la devolución en el campo `devolucion` de la tabla `ventasDiarias`.

**RF-24 — Administración de pedidos**
El administrador visualiza todos los pedidos en una tabla con filtros por estado y fecha. Puede cambiar el estado de cada pedido (pendiente → confirmado → en proceso → enviado → entregado / cancelado).

### 3.6 Módulo administrativo — Fabricantes y usuarios

**RF-25 — Gestión de fabricantes**
El administrador registra fabricantes con: nombre, RUC, dirección, teléfono, correo, marca(s) que proveen, último ingreso de mercadería y documentos adjuntos (facturas, guías). Los datos se almacenan en la tabla `fabricantes`.

**RF-26 — Gestión de usuarios y roles**
El superadministrador puede consultar la lista de usuarios registrados y cambiar sus roles (cliente, trabajador, admin). Los cambios de rol se registran en la tabla `auditoria` para trazabilidad ISO 9001.

### 3.7 Módulo de inteligencia artificial

**RF-27 — Predicción de demanda**
El servicio de IA (FastAPI) lee el historial de ventas diarias y pedidos completados de Supabase para los últimos N días (configurable, mínimo 14, máximo 365). Aplica un modelo RandomForestRegressor de scikit-learn para predecir las unidades que se venderán de cada producto en el horizonte configurado (7, 15 o 30 días).

*Fundamento académico:* Breiman (2001) establece que Random Forest es robusto frente a ruido y datasets pequeños, superando a árboles individuales en 9/14 benchmarks. Fildes et al. (2022) confirman que los métodos ML con covariables son superiores para series con alta variabilidad (reducción de RMSE del 15-25%). Makridakis et al. (2018) justifican que para series cortas (< 200 observaciones), los métodos estadísticos y el ML tienen precisión comparable, validando la arquitectura híbrida implementada.

**RF-28 — Alertas de stock**
El sistema calcula para cada producto la fecha exacta en que se agotará el stock, dividiendo el stock actual entre la predicción de demanda diaria. Genera alertas clasificadas en: crítico (< 7 días), alerta (< 15 días), aviso (< 30 días).

**RF-29 — Índice de Riesgo Empresarial (IRE) actual**
El sistema calcula el IRE como combinación ponderada: IRE = (riesgo_stock × 0.40) + (riesgo_ingresos × 0.35) + (riesgo_demanda × 0.25). Clasifica en: Bajo (0–25), Moderado (26–50), Alto (51–75), Crítico (76–100).

*Fundamento académico:* Beaver (1966) demuestra que el deterioro de ratios financieros es detectable con 2-5 años de anticipación. Altman (1968) valida el uso de análisis discriminante multivariado para predecir riesgo empresarial (precisión 95% a 1 año). Ohlson (1980) proporciona el fundamento para expresar el riesgo como probabilidad directa [0,1].

**RF-30 — IRE proyectado**
El sistema proyecta el IRE al horizonte configurado descontando el consumo estimado del stock actual mediante la predicción de demanda, permitiendo anticipar el riesgo futuro antes de que se materialice.

**RF-31 — Historial del IRE**
El sistema registra el score diario del IRE en Supabase (tabla `ire_historial`) con: fecha, score, clasificación, componentes (riesgo_stock, riesgo_ingresos, riesgo_demanda) y conteo de productos en alerta. Esto evidencia la evolución temporal del riesgo.

**RF-32 — Análisis ABC de inventario**
El sistema clasifica los productos en categorías A (top 80% de ingresos), B (siguiente 15%) y C (último 5%), según su contribución histórica al ingreso total. Permite identificar los productos críticos para la salud financiera de la empresa.

**RF-33 — Gráfico semanal de ventas**
El servicio de IA genera un gráfico de las ventas diarias de los últimos 7 días, mostrando la tendencia reciente de la demanda global de la tienda.

*Fundamento ISO/IEC 25010:* Funcionalidad — Adecuación funcional. *Artículo de referencia:* Chen et al. (2012) identifica el análisis predictivo como una de las 6 áreas de alto impacto de BI&A en e-commerce. El dashboard de IA implementa directamente las capacidades de BI&A 2.0 descritas en ese marco.

### 3.8 Módulo de seguridad

**RF-34 — Control de acceso por roles**
El sistema implementa control de acceso basado en roles (RBAC) en cuatro capas: (1) rutas protegidas en React Router (componente `AreaRoute`), (2) control de acceso en `src/security/accessControl.ts`, (3) políticas RLS en Supabase que filtran datos por `uid` del usuario autenticado, y (4) Cloud Functions que verifican el token Firebase Auth antes de procesar pagos.

*Fundamento ISO/IEC 27001:* Dominio A.9 — Control de acceso. Control A.9.1.1 — Política de control de acceso; A.9.2.1 — Registro y baja de usuarios; A.9.4.1 — Restricción de acceso a la información.

**RF-35 — Trazabilidad de operaciones**
Las operaciones administrativas sensibles (cambio de roles, eliminación de productos, ajuste de stock) se registran en la tabla `auditoria` con: usuario que realizó la operación, timestamp, tipo de operación, ID del objeto modificado y valores anterior/posterior.

*Fundamento ISO 9001:2015:* Cláusula 7.5 — Información documentada. La trazabilidad de operaciones es evidencia objetiva del control de procesos y facilita auditorías de calidad.

**RF-36 — Seguridad en comunicaciones**
Toda comunicación entre el cliente y los servidores utiliza HTTPS/TLS 1.2+. Las credenciales de Firebase, Supabase y Stripe se almacenan como variables de entorno y nunca se exponen en el código fuente del repositorio.

*Fundamento ISO/IEC 27001:* Control A.10.1 — Controles criptográficos; A.13.2.1 — Políticas y procedimientos de transferencia de información.

---

## 4. Requisitos no funcionales (ISO/IEC 25010)

### 4.1 Fiabilidad

**RNF-01 — Disponibilidad**
El sistema web debe alcanzar una disponibilidad mínima del 99% mensual. El servicio de IA puede tolerar indisponibilidad temporal hasta 2 horas sin afectar el funcionamiento del e-commerce (el frontend degrada graciosamente si el servicio de IA no responde).

**RNF-02 — Recuperabilidad**
En caso de falla en el procesamiento de pagos, el sistema debe preservar el estado del carrito del cliente y redirigirlo a una página de reintento con el resumen de su pedido.

**RNF-03 — Tolerancia a fallos**
El servicio de IA implementa un caché de datos de Supabase con TTL de 2 horas. Ante una falla de conectividad a Supabase, el servicio responde con los datos del caché hasta su expiración.

### 4.2 Usabilidad

**RNF-04 — Facilidad de aprendizaje**
Un usuario cliente debe poder completar su primera compra en menos de 5 minutos sin instrucciones previas. Un administrador debe poder registrar una venta manual en menos de 3 minutos.

*Fundamento:* Gefen et al. (2003) demuestra que la facilidad de uso percibida (curva de aprendizaje) es una dimensión clave del TAM con efecto directo sobre la utilidad percibida. La usabilidad reduce el abandono de carrito, cuya tasa alta fue la motivación central del estudio.

**RNF-05 — Diseño responsivo**
El sistema web debe operar correctamente en pantallas desde 320 px (móvil pequeño) hasta 2560 px (monitor 4K). La aplicación móvil Flutter debe operar en Android 8+ y iOS 13+.

**RNF-06 — Accesibilidad**
Los componentes interactivos deben cumplir WCAG 2.1 nivel AA: contraste de texto mínimo 4.5:1, etiquetas ARIA en formularios, navegación por teclado en el panel administrativo.

### 4.3 Eficiencia de rendimiento

**RNF-07 — Tiempo de carga del catálogo**
La página de catálogo debe cargar en menos de 2 segundos en conexión de 10 Mbps. Las imágenes de producto se sirven desde Cloudinary en formato WebP con lazy loading para reducir el peso total de la página.

**RNF-08 — Tiempo de respuesta del servicio de IA**
El endpoint `/api/predict/demand` debe responder en menos de 3 segundos para un catálogo de hasta 500 productos. El caché de 2 horas reduce la latencia en solicitudes posteriores a menos de 500 ms.

**RNF-09 — Capacidad concurrente**
El frontend debe soportar hasta 100 usuarios concurrentes sin degradación perceptible. El servicio de IA aplica rate limiting de 20 solicitudes/minuto por IP para proteger el servicio de IA y la cuota de Supabase.

### 4.4 Mantenibilidad

**RNF-10 — Arquitectura modular**
El código se organiza en dominios funcionales independientes (`src/domains/productos`, `src/domains/pedidos`, etc.). Cada dominio contiene sus propios componentes, hooks, servicios y tipos. Un cambio en un dominio no debe requerir modificaciones en otros dominios.

**RNF-11 — Cobertura de pruebas**
Las funciones críticas del servicio de IA (cálculo del IRE, predicción de demanda, alertas de stock) deben tener cobertura de pruebas unitarias ≥ 80%. Los módulos administrativos críticos (gestión de productos, ventas, pedidos) deben tener pruebas de integración que cubran los flujos principales.

**RNF-12 — Calidad de código**
El código TypeScript del frontend debe pasar la validación de ESLint sin errores con la configuración `eslint-config-react-app`. El código Python del servicio de IA debe pasar `flake8` y `mypy` sin errores.

### 4.5 Seguridad (ISO/IEC 27001)

**RNF-13 — Autenticación fuerte**
Las contraseñas de usuarios se gestionan exclusivamente por Firebase Auth (bcrypt). El sistema no almacena contraseñas en Supabase. Los tokens JWT de Firebase Auth tienen un tiempo de expiración de 1 hora y se renuevan automáticamente.

**RNF-14 — Autorización granular**
Las políticas RLS de Supabase garantizan que: (1) los clientes solo pueden leer sus propios pedidos, (2) los administradores pueden leer y escribir en las tablas de gestión, (3) los datos financieros (`productoFinanzas`) solo son accesibles por administradores. Los visitantes no autenticados solo pueden leer la tabla `productos`.

*Fundamento ISO/IEC 27001:* Control A.9.4.1 — Restricción de acceso a la información. Las políticas RLS implementan el principio de mínimo privilegio (least privilege) a nivel de base de datos.

**RNF-15 — Protección de datos personales**
Los datos personales de clientes (nombre, DNI, teléfono, direcciones) se almacenan en Supabase con cifrado en reposo (AES-256) provisto por la plataforma. La API de DNI se llama en tiempo de registro y el resultado no se almacena (solo se usa para validación).

### 4.6 Portabilidad

**RNF-16 — Despliegue en contenedores**
El sistema incluye un `docker-compose.yml` que levanta el frontend (Node.js) y el servicio de IA (Python/FastAPI) en contenedores independientes para desarrollo local y entornos de staging.

**RNF-17 — Independencia de plataforma cloud**
El servicio de IA está diseñado para desplegarse en cualquier plataforma que soporte contenedores Docker (Render.com, Railway, Google Cloud Run, AWS ECS). La configuración se inyecta exclusivamente mediante variables de entorno.

---

## 5. Requisitos de interfaz

### 5.1 Interfaz de usuario

- La interfaz web usa la paleta de colores corporativa: negro `#0D0D0D`, dorado `#C9A227`, beige `#F8F7F4`.
- El panel administrativo es accesible desde `/admin` y usa un layout de dos columnas (sidebar izquierdo + contenido principal).
- La aplicación móvil Flutter usa navegación de bottom tab con tres secciones: Tienda, Carrito y Perfil.

### 5.2 Interfaces de sistema

- **Firebase Auth SDK:** Gestión de tokens JWT y ciclo de vida de sesiones.
- **Supabase PostgREST API:** CRUD sobre tablas de negocio con filtros RLS automáticos.
- **Cloudinary Upload API:** Subida y transformación de imágenes.
- **Stripe API:** Creación de sesiones de pago y gestión de webhooks.
- **API de RENIEC (via proveedor):** Validación de DNI en el registro de usuarios.
- **FastAPI IA Service:** Predicción de demanda, IRE y alertas en endpoints REST.

---

## 6. Requisitos de datos

### 6.1 Modelo conceptual de datos

Las entidades principales del sistema son:

| Entidad | Tabla Supabase | Descripción |
|---|---|---|
| Producto | `productos` | Catálogo con precio, stock por talla, imágenes, atributos |
| Pedido | `pedidos` | Transacciones de compra online con estado y método de pago |
| Venta Diaria | `ventasDiarias` | Ventas presenciales manuales con cálculo de ganancia |
| Usuario | `usuarios` | Perfiles de clientes y administradores con roles |
| Fabricante | `fabricantes` | Proveedores con datos de contacto y documentos |
| Código Interno | `productoCodigos` | Códigos de inventario por producto |
| Finanzas Producto | `productoFinanzas` | Costos, márgenes y precios sugeridos |
| Auditoría | `auditoria` | Log de operaciones administrativas (ISO 9001) |
| Historial IRE | `ire_historial` | Serie temporal del índice de riesgo diario |
| Estado del Modelo | `modelo_estado` | Metadatos del último entrenamiento del modelo IA |

### 6.2 Retención y calidad de datos

- Las ventas diarias se retienen indefinidamente para el entrenamiento del modelo IA.
- El historial del IRE se retiene por 365 días para análisis de tendencias.
- Los pedidos se retienen 5 años por obligación legal (tributaria peruana).
- La calidad de los datos de entrada del modelo IA se verifica: se requiere al menos el 70% de días con ventas registradas en el período de entrenamiento para producir predicciones confiables (campo `confianza` en la respuesta del API).

*Fundamento:* Chen et al. (2012) identifica la completitud del dato como variable mediadora crítica de la calidad del análisis BI&A. El umbral del 70% se establece en consonancia con los criterios de calidad de Fildes et al. (2022) para series de retail.

---

## 7. Trazabilidad de requisitos con artículos del estado del arte

| ID Requisito | Artículo(s) de referencia | Principio aplicado |
|---|---|---|
| RF-01, RF-02, RF-03 | Gefen et al. (2003) — Art. 1 | Utilidad percibida y facilidad de uso como determinantes de intención de compra |
| RF-06, RF-13, RF-34 | Gefen et al. (2003) — Art. 1; Hajli (2015) — Art. 4 | Confianza institucional y mecanismos de seguridad para reducir percepción de riesgo |
| RF-11, RF-12, RF-15 | Pavlou & Fygenson (2006) — Art. 2 | Simplificación del proceso transaccional para aumentar control conductual percibido |
| RF-09 | Liang & Turban (2011) — Art. 3; Hajli (2015) — Art. 4 | Funcionalidades de social commerce (favoritos como wishlist) |
| RF-27, RF-28, RF-32, RF-33 | Chen et al. (2012) — Art. 5 | BI&A 2.0: análisis predictivo y gestión de inventario inteligente |
| RF-27 (modelo) | Makridakis et al. (2018) — Art. 6 | Validación de métodos estadísticos/ML para series cortas PYME |
| RF-27 (RandomForest) | Breiman (2001) — Art. 9 | Fundamento del algoritmo RandomForestRegressor usado en el modelo |
| RF-27 (arquitectura) | Fildes et al. (2022) — Art. 12 | Recomendaciones específicas para forecasting de demanda retail por SKU |
| RF-29, RF-30 | Altman (1968) — Art. 13; Beaver (1966) — Art. 15 | Fundamento del IRE como índice multivariado de riesgo empresarial |
| RF-29 (probabilidad) | Ohlson (1980) — Art. 14 | Expresión del riesgo como probabilidad directa [0,1] |
| RF-29 (selección de variables) | Tian et al. (2015) — Art. 16 | LASSO para selección de variables financieras relevantes |
| RF-29 (desbalance) | Wang et al. (2012) — Art. 17 | Manejo del desbalance de clases con SMOTE en datos de riesgo |
| RNF-01 a RNF-17 | Vial (2019) — Art. 18 | Marco de transformación digital: los RNF garantizan la sostenibilidad del proceso |
| Arquitectura general | Bharadwaj et al. (2013) — Art. 20 | Estrategia de negocio digital: alcance, escala, velocidad y valor por datos |
| Arquitectura general | Nambisan (2017) — Art. 19 | Maleabilidad digital y velocidad de iteración como ventaja competitiva |
| RF-27 (LSTM futuro) | Fischer & Krauss (2018) — Art. 7; Hochreiter & Schmidhuber (1997) — Art. 8 | Fundamento para evolución a LSTM cuando el historial supere los 2 años |
| RF-27 (deep learning futuro) | LeCun et al. (2015) — Art. 10; Ozbayoglu et al. (2020) — Art. 11 | Proyección de migración a arquitecturas DL cuando el volumen de datos lo justifique |

---

## 8. Criterios de aceptación del sistema

| Criterio | Métrica | Umbral de aceptación |
|---|---|---|
| Tasa de conversión | Visitantes que completan compra / total visitantes | ≥ 2% en los primeros 3 meses |
| Precisión del modelo de demanda | MAE en validación walk-forward (últimos 30 días) | MAE ≤ 3 unidades/producto/período |
| Confianza del IRE | Score de confianza del modelo en el 80% de productos | ≥ 60 (sobre 100) |
| Disponibilidad web | Uptime mensual medido en Firebase Hosting | ≥ 99% |
| Tiempo de respuesta | Percentil 95 del tiempo de carga del catálogo | ≤ 2 segundos |
| Cobertura de pruebas | Líneas cubiertas en módulos críticos del servicio IA | ≥ 80% |
| Seguridad | Vulnerabilidades críticas en auditoría | 0 vulnerabilidades críticas abiertas |

---

*Documento elaborado bajo ISO/IEC 25010:2011, ISO 9001:2015 e ISO/IEC 27001:2022.*
*Referencias completas en `estado_del_arte.md` del repositorio.*
