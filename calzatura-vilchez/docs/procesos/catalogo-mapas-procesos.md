# Catálogo De Mapas De Procesos

Este documento contiene 30 procesos principales del sistema Calzatura Vilchez. Cada proceso puede ser representado en Bizagi Modeler como un diagrama BPMN. En la carpeta `docs/procesos/bpmn` se incluyen archivos `.bpmn` generados como base para importacion o reconstruccion en Bizagi.

## Leyenda

| Campo | Descripción |
|---|---|
| ID | Identificador del proceso. |
| Actor principal | Usuario o sistema que inicia o controla el proceso. |
| Entradas | Información requerida para ejecutar el proceso. |
| Salidas | Resultado esperado. |
| Sistemas | Componentes tecnicos involucrados. |

## PR-01: Navegación Del Catálogo Público

| Campo | Detalle |
|---|---|
| Actor principal | Visitante / Cliente |
| Objetivo | Permitir la exploracion pública de productos disponibles. |
| Entradas | URL del sitio, preferencias de navegación. |
| Salidas | Lista de productos visibles. |
| Sistemas | React, Firestore, Firebase Hosting. |

Pasos:

1. Usuario ingresa al sitio web.
2. Sistema carga página de inicio.
3. Usuario accede al catálogo.
4. Sistema consulta productos publicados.
5. Sistema muestra productos disponibles.
6. Usuario navega categorías o productos.

## PR-02: Registro De Usuario

| Campo | Detalle |
|---|---|
| Actor principal | Cliente |
| Objetivo | Crear una cuenta de usuario para acceder a funciones privadas. |
| Entradas | DNI, nombres, apellidos, correo, contraseña. |
| Salidas | Usuario autenticado y perfil guardado. |
| Sistemas | React, Firebase Auth, Firestore, API DNI. |

Pasos:

1. Usuario abre formulario de registro.
2. Usuario ingresa DNI y datos solicitados.
3. Sistema valida formato del DNI.
4. Sistema consulta API DNI si corresponde.
5. Usuario confirma credenciales.
6. Firebase Auth crea cuenta.
7. Firestore guarda perfil con rol usuario.

## PR-03: Inicio De Sesión

| Campo | Detalle |
|---|---|
| Actor principal | Cliente / Administrador |
| Objetivo | Autenticar al usuario y cargar su perfil. |
| Entradas | Correo y contraseña. |
| Salidas | Sesión activa y acceso segun rol. |
| Sistemas | React, Firebase Auth, Firestore. |

Pasos:

1. Usuario abre login.
2. Usuario ingresa credenciales.
3. Firebase Auth valida credenciales.
4. Sistema consulta perfil en Firestore.
5. Sistema determina rol y permisos.
6. Usuario es redirigido al área correspondiente.

## PR-04: Consulta Y Validación De DNI

| Campo | Detalle |
|---|---|
| Actor principal | Cliente / Administrador |
| Objetivo | Validar identidad basica para registro o documentos de venta. |
| Entradas | Número de DNI. |
| Salidas | Nombres y apellidos validados o mensaje de error. |
| Sistemas | React, API DNI, endpoint serverless. |

Pasos:

1. Usuario ingresa DNI.
2. Sistema valida longitud y formato.
3. Sistema envía consulta al endpoint DNI.
4. Endpoint consulta proveedor externo.
5. Sistema recibe datos de persona.
6. Formulario se completa o muestra error.

## PR-05: Gestión De Perfil Y Direcciones

| Campo | Detalle |
|---|---|
| Actor principal | Cliente |
| Objetivo | Mantener datos de contacto y direcciones del cliente. |
| Entradas | Teléfono, dirección, ciudad, distrito, referencia. |
| Salidas | Perfil actualizado. |
| Sistemas | React, Firestore Rules, Firestore. |

Pasos:

1. Cliente ingresa a perfil.
2. Sistema carga datos actuales.
3. Cliente actualiza teléfono o direcciones.
4. Sistema valida formato de teléfono y dirección.
5. Firestore Rules validan propiedad del documento.
6. Firestore guarda cambios.

## PR-06: Busqueda Y Filtrado De Productos

| Campo | Detalle |
|---|---|
| Actor principal | Visitante / Cliente |
| Objetivo | Encontrar productos por categoría, marca, precio o texto. |
| Entradas | Texto de busqueda, categoría, marca, precio maximo. |
| Salidas | Productos filtrados. |
| Sistemas | React, Firestore. |

Pasos:

1. Usuario ingresa criterio de busqueda.
2. Sistema carga productos.
3. Sistema aplica filtros de categoría, marca y texto.
4. Sistema aplica filtro de precio.
5. Sistema ordena resultados.
6. Sistema muestra coincidencias.

## PR-07: Visualizacion De Detalle De Producto

| Campo | Detalle |
|---|---|
| Actor principal | Visitante / Cliente |
| Objetivo | Consultar información completa del producto. |
| Entradas | ID del producto. |
| Salidas | Detalle, imágenes, tallas, colores y stock. |
| Sistemas | React, Firestore, Cloudinary. |

Pasos:

1. Usuario selecciona producto.
2. Sistema obtiene ID desde la ruta.
3. Sistema consulta documento de producto.
4. Sistema muestra imágenes y descripción.
5. Sistema calcula tallas y colores disponibles.
6. Usuario revisa disponibilidad.

## PR-08: Gestión De Favoritos

| Campo | Detalle |
|---|---|
| Actor principal | Cliente |
| Objetivo | Guardar productos de interes en favoritos. |
| Entradas | ID de usuario, ID de producto. |
| Salidas | Favorito agregado o eliminado. |
| Sistemas | React, Firestore subcolecciones, Firestore Rules. |

Pasos:

1. Cliente presiona boton de favorito.
2. Sistema verifica sesión activa.
3. Sistema determina estado actual.
4. Firestore crea o elimina favorito.
5. Interfaz actualiza indicador visual.
6. Cliente consulta lista de favoritos.

## PR-09: Agregar Producto Al Carrito

| Campo | Detalle |
|---|---|
| Actor principal | Cliente / Visitante |
| Objetivo | Agregar un producto seleccionando talla, color y cantidad. |
| Entradas | Producto, talla, color, cantidad. |
| Salidas | Carrito actualizado. |
| Sistemas | React Context, utilidades de stock. |

Pasos:

1. Usuario elige producto.
2. Usuario selecciona talla y color.
3. Sistema valida stock disponible.
4. Usuario define cantidad.
5. Sistema agrega item al carrito.
6. Sistema muestra confirmación.

## PR-10: Actualizacion Del Carrito

| Campo | Detalle |
|---|---|
| Actor principal | Cliente / Visitante |
| Objetivo | Modificar cantidades o eliminar productos del carrito. |
| Entradas | Item de carrito y nueva cantidad. |
| Salidas | Totales recalculados. |
| Sistemas | React Context. |

Pasos:

1. Usuario abre carrito.
2. Sistema muestra items actuales.
3. Usuario cambia cantidad o elimina item.
4. Sistema valida cantidad minima.
5. Sistema recalcula subtotal.
6. Interfaz actualiza totales.

## PR-11: Checkout Del Pedido

| Campo | Detalle |
|---|---|
| Actor principal | Cliente |
| Objetivo | Registrar dirección, envío, método de pago y confirmar pedido. |
| Entradas | Items, dirección, método de pago, notas. |
| Salidas | Pedido pendiente creado. |
| Sistemas | React, Firestore, Firebase Auth. |

Pasos:

1. Cliente ingresa al checkout.
2. Sistema valida autenticación.
3. Cliente completa dirección.
4. Cliente selecciona método de pago.
5. Sistema calcula subtotal, envío y total.
6. Cliente confirma pedido.
7. Firestore registra pedido pendiente.

## PR-12: Creación De Pedido En Firestore

| Campo | Detalle |
|---|---|
| Actor principal | Cliente |
| Objetivo | Persistir pedido con información comercial y dirección. |
| Entradas | Usuario, items, dirección, total, método de pago. |
| Salidas | Documento en colección `pedidos`. |
| Sistemas | Firestore, Firestore Rules. |

Pasos:

1. Frontend prepara payload de pedido.
2. Sistema agrega estado pendiente.
3. Firestore Rules validan propietario y campos.
4. Firestore crea documento.
5. Sistema recibe ID de pedido.
6. Usuario es redirigido segun método de pago.

## PR-13: Pago Con Stripe

| Campo | Detalle |
|---|---|
| Actor principal | Cliente |
| Objetivo | Procesar pago online con tarjeta. |
| Entradas | ID de pedido, token Firebase, items. |
| Salidas | Sesión de checkout Stripe. |
| Sistemas | React, Firebase Functions, Stripe, Firestore. |

Pasos:

1. Cliente confirma pago con Stripe.
2. Frontend envía ID de pedido a Cloud Function.
3. Function valida token Firebase.
4. Function consulta pedido y productos.
5. Function recalcula precios y stock.
6. Stripe crea sesión de pago.
7. Frontend redirige a Stripe.

## PR-14: Confirmación De Pago Por Webhook

| Campo | Detalle |
|---|---|
| Actor principal | Stripe |
| Objetivo | Confirmar pago y actualizar pedido. |
| Entradas | Evento `checkout.session.completed`. |
| Salidas | Pedido pagado y stock descontado. |
| Sistemas | Stripe Webhook, Firebase Functions, Firestore. |

Pasos:

1. Stripe envía evento al webhook.
2. Function valida firma del evento.
3. Function obtiene ID de pedido.
4. Function consulta pedido.
5. Function descuenta stock en transacción.
6. Function actualiza estado a pagado.

## PR-15: Pedido Contraentrega

| Campo | Detalle |
|---|---|
| Actor principal | Cliente |
| Objetivo | Registrar pedido con pago al recibir. |
| Entradas | Items, dirección, total, método contraentrega. |
| Salidas | Pedido pendiente para gestión administrativa. |
| Sistemas | React, Firestore. |

Pasos:

1. Cliente selecciona contraentrega.
2. Sistema valida dirección e items.
3. Firestore registra pedido pendiente.
4. Sistema muestra confirmación.
5. Administrador revisa pedido.
6. Administrador actualiza estado operativo.

## PR-16: Historial Y Seguimiento De Pedido

| Campo | Detalle |
|---|---|
| Actor principal | Cliente |
| Objetivo | Consultar pedidos realizados y sus estados. |
| Entradas | ID del usuario autenticado. |
| Salidas | Lista de pedidos del cliente. |
| Sistemas | React, Firestore Rules, Firestore. |

Pasos:

1. Cliente ingresa a mis pedidos.
2. Sistema obtiene usuario autenticado.
3. Firestore consulta pedidos por `userId`.
4. Rules validan que sea propietario.
5. Sistema muestra estados y detalle.
6. Cliente revisa avance del pedido.

## PR-17: Consulta Del Dashboard Administrativo

| Campo | Detalle |
|---|---|
| Actor principal | Administrador |
| Objetivo | Visualizar indicadores generales del negocio. |
| Entradas | Productos, pedidos, ventas, finanzas, usuarios. |
| Salidas | KPIs, gráficos y pedidos recientes. |
| Sistemas | React, Firestore. |

Pasos:

1. Administrador ingresa al panel.
2. Sistema valida rol.
3. Sistema consulta productos, pedidos, ventas y usuarios.
4. Sistema calcula ventas, ganancias y pendientes.
5. Sistema arma gráfico de últimos días.
6. Dashboard presenta indicadores.

## PR-18: Alta De Producto

| Campo | Detalle |
|---|---|
| Actor principal | Administrador |
| Objetivo | Registrar un nuevo producto en catálogo. |
| Entradas | Datos comerciales, imágenes, stock, código, finanzas. |
| Salidas | Producto creado con código y finanzas. |
| Sistemas | React, Firestore, Cloudinary. |

Pasos:

1. Administrador abre formulario de producto.
2. Ingresa código, nombre, categoría, precio y descripción.
3. Sube o registra imágenes.
4. Define colores, tallas y stock.
5. Registra costo y margenes.
6. Firestore guarda producto, código y finanzas.

## PR-19: Edicion De Producto

| Campo | Detalle |
|---|---|
| Actor principal | Administrador |
| Objetivo | Actualizar información de un producto existente. |
| Entradas | ID de producto y datos editados. |
| Salidas | Producto actualizado. |
| Sistemas | React, Firestore, Cloudinary. |

Pasos:

1. Administrador selecciona producto.
2. Sistema carga datos actuales.
3. Administrador modifica campos.
4. Sistema recalcula stock por talla/color.
5. Firestore actualiza producto.
6. Firestore actualiza código y finanzas.

## PR-20: Eliminacion De Producto

| Campo | Detalle |
|---|---|
| Actor principal | Administrador |
| Objetivo | Retirar un producto del catálogo. |
| Entradas | ID de producto. |
| Salidas | Producto, código y finanzas eliminados. |
| Sistemas | React, Firestore. |

Pasos:

1. Administrador elige eliminar producto.
2. Sistema solicita confirmación.
3. Administrador confirma accion.
4. Firestore elimina producto.
5. Firestore elimina código asociado.
6. Firestore elimina finanzas asociadas.

## PR-21: Gestión De Código Interno

| Campo | Detalle |
|---|---|
| Actor principal | Administrador |
| Objetivo | Asociar código interno a un producto. |
| Entradas | ID de producto y código. |
| Salidas | Código guardado en `productoCodigos`. |
| Sistemas | React, Firestore Rules, Firestore. |

Pasos:

1. Administrador ingresa código.
2. Sistema normaliza formato.
3. Sistema valida estructura del código.
4. Firestore Rules validan rol admin.
5. Firestore guarda o actualiza código.
6. Código queda disponible para ventas.

## PR-22: Gestión Financiera De Producto

| Campo | Detalle |
|---|---|
| Actor principal | Administrador |
| Objetivo | Calcular y guardar costos, margenes y precios sugeridos. |
| Entradas | Costo de compra, margenes minimo, objetivo y maximo. |
| Salidas | Rango de precios calculado. |
| Sistemas | React, Firestore. |

Pasos:

1. Administrador ingresa costo de compra.
2. Sistema calcula precio minimo.
3. Sistema calcula precio sugerido.
4. Sistema calcula precio maximo.
5. Administrador confirma valores.
6. Firestore guarda finanzas del producto.

## PR-23: Subida Y Normalizacion De Imágenes

| Campo | Detalle |
|---|---|
| Actor principal | Administrador |
| Objetivo | Cargar imágenes optimizadas para productos. |
| Entradas | Archivo JPG, PNG o WebP. |
| Salidas | URL segura de Cloudinary. |
| Sistemas | React, Canvas, Cloudinary. |

Pasos:

1. Administrador selecciona imagen.
2. Sistema valida tipo y tamano.
3. Sistema comprime imagen en navegador.
4. Sistema sube archivo a Cloudinary.
5. Cloudinary devuelve URL segura.
6. Sistema asigna URL al producto.

## PR-24: Administración De Pedidos

| Campo | Detalle |
|---|---|
| Actor principal | Administrador |
| Objetivo | Revisar y actualizar estados de pedidos. |
| Entradas | Pedido y nuevo estado. |
| Salidas | Estado actualizado. |
| Sistemas | React, Firestore Rules, Firestore. |

Pasos:

1. Administrador ingresa a pedidos.
2. Sistema carga pedidos.
3. Administrador revisa detalle.
4. Administrador selecciona nuevo estado.
5. Firestore Rules validan campos permitidos.
6. Firestore actualiza estado.

## PR-25: Registro De Venta Manual

| Campo | Detalle |
|---|---|
| Actor principal | Administrador |
| Objetivo | Registrar ventas presenciales o manuales. |
| Entradas | Producto, código, color, talla, cantidad, precio. |
| Salidas | Venta registrada y stock descontado. |
| Sistemas | React, Firestore. |

Pasos:

1. Administrador abre ventas.
2. Selecciona producto por marca o código.
3. Define talla, color, cantidad y precio.
4. Sistema valida stock disponible.
5. Firestore registra venta diaria.
6. Sistema actualiza stock del producto.

## PR-26: Emision De Documento De Venta

| Campo | Detalle |
|---|---|
| Actor principal | Administrador |
| Objetivo | Generar nota de venta o guia de remision. |
| Entradas | Tipo de documento, DNI, cliente, lineas de venta. |
| Salidas | Documento imprimible o guardable como PDF. |
| Sistemas | React, API DNI, utilidades de documento. |

Pasos:

1. Administrador selecciona tipo de documento.
2. Ingresa DNI del cliente.
3. Sistema valida datos del cliente.
4. Sistema genera número de documento.
5. Sistema registra venta con documento.
6. Sistema abre documento para imprimir.

## PR-27: Devolucion De Venta Y Reposicion De Stock

| Campo | Detalle |
|---|---|
| Actor principal | Administrador |
| Objetivo | Marcar venta devuelta y reponer inventario. |
| Entradas | Venta seleccionada y motivo. |
| Salidas | Venta marcada como devuelta y stock restaurado. |
| Sistemas | React, Firestore. |

Pasos:

1. Administrador abre detalle de venta.
2. Selecciona opcion de devolucion.
3. Ingresa motivo.
4. Sistema marca venta como devuelta.
5. Sistema calcula stock a restaurar.
6. Firestore actualiza producto.

## PR-28: Gestión De Usuarios Y Roles

| Campo | Detalle |
|---|---|
| Actor principal | Administrador / Superadministrador |
| Objetivo | Revisar usuarios y cambiar roles segun autorizacion. |
| Entradas | Usuario objetivo y rol nuevo. |
| Salidas | Rol actualizado o rechazo por permisos. |
| Sistemas | React, Firestore Rules, Firestore. |

Pasos:

1. Administrador abre usuarios.
2. Sistema carga usuarios y pedidos.
3. Administrador filtra o busca usuario.
4. Selecciona nuevo rol.
5. Firestore Rules validan privilegios.
6. Firestore actualiza rol.

## PR-29: Gestión De Fabricantes Y Documentos

| Campo | Detalle |
|---|---|
| Actor principal | Administrador |
| Objetivo | Registrar fabricantes, marcas, ingresos y documentos. |
| Entradas | DNI, nombres, marca, teléfono, documentos, observaciones. |
| Salidas | Fabricante registrado o actualizado. |
| Sistemas | React, Firestore, Cloudinary. |

Pasos:

1. Administrador abre fabricantes.
2. Ingresa datos del fabricante.
3. Carga documentos asociados.
4. Registra último ingreso y observaciones.
5. Firestore Rules validan datos.
6. Firestore guarda fabricante.

## PR-30: Predicción De Demanda Y Alertas De Stock

| Campo | Detalle |
|---|---|
| Actor principal | Administrador |
| Objetivo | Consultar demanda estimada y productos con riesgo de agotarse. |
| Entradas | Horizonte de predicción, ventas, pedidos, productos. |
| Salidas | Predicciones, alertas y gráfico semanal. |
| Sistemas | React, FastAPI, Firestore, modelo Python. |

Pasos:

1. Administrador abre predicciones.
2. Frontend consulta API de IA.
3. FastAPI carga ventas, pedidos y productos.
4. Modelo calcula demanda futura.
5. Modelo identifica alertas de stock.
6. Frontend muestra resultados.

