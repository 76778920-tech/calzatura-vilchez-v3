# Formato 09: Alcance del Proyecto Software

## Datos Generales Del Proyecto

| Campo | Descripcion |
|---|---|
| Nombre del proyecto | Sistema web de e-commerce, inventario, ventas y prediccion de demanda para Calzatura Vilchez |
| Integrantes del equipo | Equipo del proyecto Calzatura Vilchez |
| Modulo / Sistema | Plataforma web comercial y administrativa |
| Docente | Dr. Maglioni Arana Caparachin |
| Fecha | 22/04/2026 |

## Contexto Del Proyecto

Calzatura Vilchez requiere una plataforma web que permita publicar productos de calzado, gestionar inventario, registrar ventas, administrar pedidos, controlar fabricantes, manejar usuarios y consultar indicadores de negocio desde un panel administrativo. La organizacion necesita reducir registros manuales dispersos, centralizar informacion comercial y disponer de una base para tomar decisiones sobre stock, ventas y demanda.

El sistema se implementa como una aplicacion web desarrollada con React, TypeScript y Vite. La persistencia principal se realiza en Firebase Firestore, la autenticacion se gestiona con Firebase Auth, las reglas de seguridad se definen con Firestore Rules, las imagenes de producto se administran mediante Cloudinary y la prediccion de demanda se apoya en un servicio Python FastAPI conectado a Firestore.

### Problema Que Se Busca Resolver

La empresa necesita controlar de forma integrada su catalogo, stock por talla y color, ventas diarias, pedidos de clientes, fabricantes, usuarios y reportes administrativos. Sin un sistema centralizado, se incrementa el riesgo de errores de inventario, duplicidad de informacion, baja trazabilidad de ventas y dificultad para analizar la demanda de productos.

### Objetivo General Del Sistema

Desarrollar una plataforma web que permita gestionar el comercio digital de Calzatura Vilchez, incluyendo catalogo publico, autenticacion de usuarios, carrito de compras, pedidos, ventas, inventario, fabricantes, roles administrativos e indicadores de demanda.

### Usuarios Principales

| Usuario | Descripcion |
|---|---|
| Visitante | Usuario no autenticado que consulta productos, tiendas e informacion publica. |
| Cliente | Usuario registrado que compra productos, guarda favoritos, administra perfil y revisa pedidos. |
| Administrador | Usuario interno que gestiona productos, ventas, pedidos, usuarios, fabricantes y reportes. |
| Superadministrador | Usuario con privilegios superiores para administrar roles sensibles. |
| Servicio externo | Firebase, Cloudinary, Stripe, API DNI y servicio de IA que interactuan con el sistema. |

### Entorno De Uso

El sistema se usa en navegador web, tanto en computadoras como dispositivos moviles. El frontend puede desplegarse en Firebase Hosting u otra plataforma compatible con Vite. Los datos se almacenan en Firebase Firestore. El servicio de IA se ejecuta localmente durante desarrollo o puede desplegarse en un servicio cloud para disponibilidad continua.

## Objetivos Del Sistema

### Objetivo General

Implementar una solucion web integral para la gestion comercial, operativa y administrativa de Calzatura Vilchez.

### Objetivos Especificos

- Publicar un catalogo de productos con imagenes, tallas, colores, precios, stock y filtros de busqueda.
- Permitir registro, autenticacion y perfil de clientes.
- Gestionar carrito de compras, checkout, pedidos y confirmacion de pago.
- Controlar productos, codigos internos, costos, margenes y stock desde el panel administrativo.
- Registrar ventas diarias y calcular rentabilidad.
- Administrar fabricantes y documentos asociados.
- Gestionar usuarios y roles de acceso.
- Mostrar dashboard administrativo con indicadores de productos, ventas, pedidos y usuarios.
- Consultar predicciones de demanda y alertas de stock mediante el servicio de IA.
- Proteger la informacion mediante reglas de seguridad, rutas protegidas y validaciones.

## Alcance Del Proyecto

### Funcionalidades Incluidas (IN SCOPE)

| ID | Funcionalidad | Descripcion | Relacion con requerimientos |
|---|---|---|---|
| IN-01 | Pagina de inicio | Presenta categorias, productos destacados y acceso a secciones comerciales. | RF catalogo, RF navegacion |
| IN-02 | Catalogo publico | Lista productos con filtros por categoria, marca, busqueda y precio. | RF productos |
| IN-03 | Detalle de producto | Muestra imagenes, descripcion, precio, tallas, colores y stock disponible. | RF productos, RF stock |
| IN-04 | Carrito de compras | Permite agregar, quitar y modificar cantidades de productos. | RF carrito |
| IN-05 | Registro de usuarios | Permite crear cuentas con datos personales y validacion de DNI. | RF usuarios, RF seguridad |
| IN-06 | Inicio y cierre de sesion | Gestiona autenticacion mediante Firebase Auth. | RF autenticacion |
| IN-07 | Perfil de usuario | Permite consultar y actualizar telefono y direcciones. | RF clientes |
| IN-08 | Favoritos | Permite guardar y quitar productos favoritos por usuario. | RF clientes |
| IN-09 | Checkout | Captura direccion, metodo de pago y notas del pedido. | RF pedidos |
| IN-10 | Creacion de pedido | Registra pedidos en Firestore con estado pendiente. | RF pedidos |
| IN-11 | Pago con Stripe | Genera sesion de pago y procesa confirmacion mediante Cloud Functions. | RF pagos |
| IN-12 | Pedido contraentrega | Permite registrar pedido con metodo de pago contraentrega. | RF pedidos |
| IN-13 | Historial de pedidos | Permite al cliente revisar sus pedidos. | RF pedidos |
| IN-14 | Panel administrativo | Consolida indicadores de ventas, productos, pedidos y usuarios. | RF administracion |
| IN-15 | Gestion de productos | Permite crear, editar y eliminar productos. | RF inventario |
| IN-16 | Stock por talla y color | Administra disponibilidad detallada por producto. | RF inventario |
| IN-17 | Gestion de imagenes | Permite subir y normalizar imagenes usando Cloudinary. | RF productos |
| IN-18 | Codigos internos | Permite asociar codigos de producto para control interno. | RF inventario |
| IN-19 | Finanzas de producto | Permite registrar costo, margenes y precio sugerido. | RF rentabilidad |
| IN-20 | Gestion de pedidos admin | Permite cambiar estado de pedidos. | RF administracion |
| IN-21 | Registro de ventas diarias | Permite registrar ventas manuales y calcular ganancia. | RF ventas |
| IN-22 | Emision de documentos de venta | Genera nota de venta o guia de remision para imprimir o guardar. | RF ventas |
| IN-23 | Devoluciones | Marca ventas como devueltas y repone stock. | RF ventas, RF inventario |
| IN-24 | Gestion de usuarios | Permite listar usuarios y actualizar roles segun permisos. | RF seguridad |
| IN-25 | Gestion de fabricantes | Registra datos de fabricantes, documentos y ultimos ingresos. | RF fabricantes |
| IN-26 | Prediccion de demanda | Consulta servicio IA para estimar demanda futura por producto. | RF analitica |
| IN-27 | Alertas de stock | Identifica productos con riesgo de agotarse. | RF analitica, RF inventario |
| IN-28 | Reglas de seguridad | Firestore Rules validan lectura, escritura, roles y formatos de datos. | RNF seguridad |
| IN-29 | Despliegue web | Permite publicar frontend en Firebase Hosting. | RNF disponibilidad |
| IN-30 | Docker para desarrollo | Permite levantar frontend y servicio IA con Docker Compose. | RNF mantenibilidad |

### Funcionalidades Excluidas (OUT OF SCOPE)

| ID | Funcionalidad | Justificacion |
|---|---|---|
| OUT-01 | Aplicacion movil nativa Android/iOS | El alcance actual corresponde a aplicacion web responsive. |
| OUT-02 | Facturacion electronica SUNAT completa | Requiere integracion tributaria formal y certificados externos. |
| OUT-03 | Integracion ERP contable | No forma parte del objetivo inicial del proyecto. |
| OUT-04 | Inventario multi-almacen avanzado | El sistema maneja stock por producto, talla y color, no almacenes multiples. |
| OUT-05 | Gestion de compras a proveedores con aprobaciones | Solo se registra informacion de fabricantes y ultimos ingresos. |
| OUT-06 | Pasarela de pago distinta a Stripe | El alcance contempla Stripe y contraentrega. |
| OUT-07 | Chat en tiempo real con clientes | No es una funcionalidad prioritaria del sistema. |
| OUT-08 | Programa de fidelizacion o puntos | Queda para futuras versiones comerciales. |
| OUT-09 | Recomendador IA personalizado por cliente | La IA actual se orienta a demanda y stock, no personalizacion individual. |
| OUT-10 | Auditoria legal completa por usuario | Se cuenta con controles basicos, pero no con modulo formal de auditoria legal. |

## Limites Del Sistema

### Actores Externos

| ID | Actor | Descripcion |
|---|---|---|
| ACT-01 | Cliente | Compra productos, guarda favoritos y consulta pedidos. |
| ACT-02 | Administrador | Gestiona catalogo, ventas, pedidos, usuarios, fabricantes e indicadores. |
| ACT-03 | Superadministrador | Controla asignacion de roles administrativos. |
| ACT-04 | Firebase Auth | Servicio de autenticacion de usuarios. |
| ACT-05 | Cloud Firestore | Base de datos principal del sistema. |
| ACT-06 | Cloudinary | Servicio externo de almacenamiento y entrega de imagenes. |
| ACT-07 | Stripe | Servicio externo para pagos con tarjeta. |
| ACT-08 | API DNI | Servicio para consulta y validacion de datos por DNI. |
| ACT-09 | Servicio IA FastAPI | Backend Python que calcula predicciones y alertas. |
| ACT-10 | Firebase Hosting / Functions | Plataforma de despliegue y funciones serverless. |

### Entradas Al Sistema

| ID | Entrada | Fuente |
|---|---|---|
| E-01 | Datos de registro del usuario | Cliente |
| E-02 | Credenciales de acceso | Cliente / Administrador |
| E-03 | Busqueda y filtros de productos | Visitante / Cliente |
| E-04 | Producto, talla, color y cantidad | Cliente |
| E-05 | Direccion de entrega | Cliente |
| E-06 | Metodo de pago | Cliente |
| E-07 | Datos de producto | Administrador |
| E-08 | Imagenes de producto | Administrador / Cloudinary |
| E-09 | Costos y margenes | Administrador |
| E-10 | Datos de venta manual | Administrador |
| E-11 | Datos de fabricante | Administrador |
| E-12 | Cambios de rol | Administrador / Superadministrador |
| E-13 | Eventos de pago | Stripe |
| E-14 | Datos historicos de ventas y pedidos | Firestore |

### Salidas Del Sistema

| ID | Salida | Destino |
|---|---|---|
| S-01 | Catalogo de productos | Visitante / Cliente |
| S-02 | Confirmacion de registro o login | Usuario |
| S-03 | Carrito actualizado | Cliente |
| S-04 | Pedido creado | Cliente / Firestore |
| S-05 | Sesion de pago Stripe | Cliente / Stripe |
| S-06 | Estado de pedido | Cliente / Administrador |
| S-07 | Dashboard de indicadores | Administrador |
| S-08 | Documento de venta | Administrador / Cliente |
| S-09 | Reporte de ventas y ganancias | Administrador |
| S-10 | Listado de usuarios y roles | Administrador |
| S-11 | Listado de fabricantes | Administrador |
| S-12 | Predicciones de demanda | Administrador |
| S-13 | Alertas de stock | Administrador |
| S-14 | Reglas de acceso aplicadas | Firestore / Usuario |

## Restricciones Y Supuestos

### Restricciones Tecnologicas

- El frontend se desarrolla con React, TypeScript y Vite.
- La base de datos principal es Firebase Firestore.
- La autenticacion depende de Firebase Auth.
- Las imagenes de productos se almacenan en Cloudinary.
- El pago con tarjeta se procesa mediante Stripe.
- El servicio de IA requiere Python, FastAPI y credencial segura de Firebase Admin.
- El archivo `serviceAccountKey.json` no debe subirse al repositorio.

### Restricciones Operativas

- El panel administrativo requiere usuario autenticado con rol autorizado.
- Las operaciones sensibles dependen de reglas de Firestore y Cloud Functions.
- El servicio de IA local solo funciona mientras la computadora o servidor este encendido.
- Para disponibilidad continua del servicio IA se requiere despliegue cloud.
- La carga masiva de productos debe considerar paginacion e indices para evitar exceso de lecturas.

### Restricciones Legales

- Los datos personales de clientes deben protegerse con acceso restringido.
- La consulta DNI depende del proveedor externo configurado.
- La emision de documentos internos no reemplaza una facturacion electronica SUNAT completa.
- Las credenciales privadas no deben publicarse en GitHub ni compartirse sin control.

### Supuestos

- Los usuarios contaran con conexion a internet y navegador actualizado.
- El administrador mantendra actualizados precios, stock, imagenes y datos de producto.
- Firebase y Cloudinary estaran correctamente configurados.
- Stripe estara configurado con claves y webhooks validos antes de operar pagos reales.
- El profesor o evaluador podra revisar el repositorio con permisos de lectura en GitHub.

## Criterios De Aceptacion Del Alcance

- El alcance esta alineado con los requerimientos funcionales del catalogo, usuarios, carrito, pedidos, ventas, fabricantes, administracion e IA.
- Las funcionalidades incluidas y excluidas se encuentran diferenciadas de forma clara.
- Los limites del sistema identifican actores, entradas, salidas e integraciones externas.
- Las restricciones tecnologicas, operativas y legales estan documentadas.
- El proyecto es viable para desarrollo web con Firebase y servicio IA complementario.
- No existen ambiguedades sobre lo que corresponde a la version actual y lo que queda para futuras versiones.
- La documentacion puede ser revisada por el docente y utilizada como base para planificacion posterior.

