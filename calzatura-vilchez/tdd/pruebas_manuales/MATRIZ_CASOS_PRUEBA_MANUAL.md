# Matriz De Casos De Prueba Manual

## Modulo: Pagina Principal

| ID | Caso | Precondicion | Pasos | Resultado Esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| PM-001 | Cargar pagina principal | Aplicacion disponible | 1. Abrir la URL principal | La pagina carga sin errores y muestra la marca Calzatura Vilchez | Pendiente |
| PM-002 | Ver productos destacados | Existen productos destacados | 1. Abrir inicio 2. Revisar seccion de destacados | Se muestran productos destacados con imagen, nombre y precio | Pendiente |
| PM-003 | Navegar a productos | Pagina principal abierta | 1. Clic en Productos | El sistema muestra el catalogo | Pendiente |

## Modulo: Catalogo De Productos

| ID | Caso | Precondicion | Pasos | Resultado Esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| PM-004 | Listar productos | Existen productos registrados | 1. Abrir `/productos` | Se muestra listado de productos | Pendiente |
| PM-005 | Buscar producto | Existen productos registrados | 1. Escribir texto en buscador | Se filtran productos relacionados | Pendiente |
| PM-006 | Filtrar por categoria | Existen productos por categoria | 1. Seleccionar categoria Hombre/Mujer/Ninos | Se muestran solo productos de esa categoria | Pendiente |
| PM-007 | Filtrar por precio | Existen productos con distintos precios | 1. Mover filtro de precio | Se muestran productos dentro del rango seleccionado | Pendiente |
| PM-008 | Ordenar por precio menor a mayor | Catalogo abierto | 1. Seleccionar orden precio ascendente | Los productos se ordenan de menor a mayor precio | Pendiente |
| PM-009 | Estado sin resultados | Catalogo abierto | 1. Buscar texto inexistente | Se muestra mensaje de que no hay productos | Pendiente |

## Modulo: Detalle De Producto

| ID | Caso | Precondicion | Pasos | Resultado Esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| PM-010 | Abrir detalle de producto | Existen productos | 1. Clic en un producto | Se muestra imagen, nombre, precio, descripcion, stock y tallas | Pendiente |
| PM-011 | Seleccionar talla | Producto con tallas | 1. Abrir producto 2. Seleccionar talla | La talla queda seleccionada visualmente | Pendiente |
| PM-012 | Cambiar cantidad | Producto con stock | 1. Abrir producto 2. Aumentar y disminuir cantidad | La cantidad cambia sin bajar de 1 | Pendiente |
| PM-013 | Producto sin stock | Producto con stock 0 | 1. Abrir producto sin stock | El boton de agregar al carrito aparece deshabilitado | Pendiente |
| PM-014 | Agregar al carrito | Producto con stock | 1. Seleccionar talla 2. Clic en Agregar al carrito | Producto aparece en carrito | Pendiente |

## Modulo: Carrito

| ID | Caso | Precondicion | Pasos | Resultado Esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| PM-015 | Abrir carrito | Producto agregado | 1. Clic en icono carrito | Se muestra el producto agregado | Pendiente |
| PM-016 | Actualizar cantidad | Producto en carrito | 1. Aumentar/disminuir cantidad | Subtotal y total se actualizan correctamente | Pendiente |
| PM-017 | Eliminar producto | Producto en carrito | 1. Clic en eliminar | El producto desaparece del carrito | Pendiente |
| PM-018 | Carrito vacio | Sin productos | 1. Abrir carrito | Se muestra mensaje de carrito vacio | Pendiente |
| PM-019 | Ir a checkout | Cliente con producto en carrito | 1. Clic en finalizar compra | El sistema navega a checkout | Pendiente |

## Modulo: Registro

| ID | Caso | Precondicion | Pasos | Resultado Esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| PM-020 | Registro correcto | Usuario no registrado | 1. Abrir registro 2. Completar datos validos 3. Enviar | Usuario se registra correctamente | Pendiente |
| PM-021 | Password corta | Registro abierto | 1. Ingresar password menor a 6 caracteres | Se muestra mensaje de validacion | Pendiente |
| PM-022 | Password no coincide | Registro abierto | 1. Ingresar passwords diferentes | Se muestra mensaje de error | Pendiente |
| PM-023 | Correo ya registrado | Correo existente | 1. Registrar con correo ya usado | Se muestra error de registro | Pendiente |

## Modulo: Login

| ID | Caso | Precondicion | Pasos | Resultado Esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| PM-024 | Login correcto | Usuario registrado | 1. Abrir login 2. Ingresar credenciales validas | Usuario inicia sesion y vuelve al inicio | Pendiente |
| PM-025 | Login incorrecto | Usuario registrado | 1. Ingresar password incorrecta | Se muestra mensaje de error | Pendiente |
| PM-026 | Cerrar sesion | Usuario autenticado | 1. Abrir menu usuario 2. Clic cerrar sesion | Sesion se cierra y cambia la cabecera | Pendiente |

## Modulo: Checkout

| ID | Caso | Precondicion | Pasos | Resultado Esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| PM-027 | Acceso sin login | Producto en carrito y sin sesion | 1. Ir a checkout | El sistema solicita iniciar sesion | Pendiente |
| PM-028 | Validar direccion obligatoria | Usuario logueado con carrito | 1. Dejar direccion vacia 2. Continuar | Se muestra error de campos requeridos | Pendiente |
| PM-029 | Completar direccion | Usuario logueado con carrito | 1. Completar datos de entrega 2. Continuar | Se muestra pantalla de metodo de pago | Pendiente |
| PM-030 | Pago contraentrega | Usuario logueado con carrito | 1. Elegir contraentrega 2. Confirmar pedido | Se crea pedido y muestra pantalla de exito | Pendiente |
| PM-031 | Pago con tarjeta | Usuario logueado con carrito y Stripe configurado | 1. Elegir tarjeta 2. Confirmar pedido | Redirige a Stripe Checkout | Pendiente |

## Modulo: Pedido Exitoso E Historial

| ID | Caso | Precondicion | Pasos | Resultado Esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| PM-032 | Ver pagina de exito | Pedido creado | 1. Confirmar pedido | Muestra numero de pedido, estado y total | Pendiente |
| PM-033 | Ver mis pedidos | Usuario con pedidos | 1. Ir a Mis Pedidos | Se muestran pedidos del usuario autenticado | Pendiente |
| PM-034 | Validar pedido ajeno | Usuario A y pedido de Usuario B | 1. Intentar acceder a pedido ajeno por URL | El sistema no debe mostrar informacion ajena | Pendiente |

## Modulo: Perfil

| ID | Caso | Precondicion | Pasos | Resultado Esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| PM-035 | Ver perfil | Usuario autenticado | 1. Ir a Perfil | Se muestran datos del usuario | Pendiente |
| PM-036 | Actualizar telefono | Usuario autenticado | 1. Cambiar telefono 2. Guardar | El dato se actualiza correctamente | Pendiente |

## Modulo: Administracion

| ID | Caso | Precondicion | Pasos | Resultado Esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| PM-037 | Acceso admin permitido | Usuario admin | 1. Ir a `/admin` | Se muestra panel administrativo | Pendiente |
| PM-038 | Acceso admin denegado | Usuario cliente | 1. Ir a `/admin` | El sistema redirige o bloquea el acceso | Pendiente |
| PM-039 | Crear producto | Usuario admin | 1. Ir a admin productos 2. Nuevo producto 3. Guardar | Producto se crea y aparece en catalogo | Pendiente |
| PM-040 | Editar producto | Usuario admin y producto existente | 1. Editar producto 2. Guardar | Cambios se reflejan correctamente | Pendiente |
| PM-041 | Eliminar producto | Usuario admin y producto existente | 1. Eliminar producto 2. Confirmar | Producto desaparece del listado | Pendiente |
| PM-042 | Ver pedidos admin | Usuario admin | 1. Ir a admin pedidos | Se listan pedidos registrados | Pendiente |
| PM-043 | Cambiar estado pedido | Usuario admin y pedido existente | 1. Cambiar estado del pedido | Estado se actualiza correctamente | Pendiente |

## Modulo: Seguridad Basica

| ID | Caso | Precondicion | Pasos | Resultado Esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| PM-044 | Cliente no ve panel admin | Usuario cliente | 1. Intentar entrar a `/admin` | Acceso denegado | Pendiente |
| PM-045 | Usuario no autenticado no ve checkout | Visitante con carrito | 1. Ir a checkout | Solicita iniciar sesion | Pendiente |
| PM-046 | Usuario solo ve sus pedidos | Dos usuarios con pedidos | 1. Login Usuario A 2. Ver Mis Pedidos | Solo aparecen pedidos de Usuario A | Pendiente |

## Modulo: Responsive

| ID | Caso | Precondicion | Pasos | Resultado Esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| PM-047 | Vista movil inicio | Navegador en ancho movil | 1. Abrir inicio | La pagina se adapta sin desbordes | Pendiente |
| PM-048 | Menu movil | Vista movil | 1. Clic en menu hamburguesa | Se abre menu correctamente | Pendiente |
| PM-049 | Checkout movil | Vista movil y carrito con producto | 1. Ir a checkout | Formulario se visualiza correctamente | Pendiente |
| PM-050 | Admin movil | Usuario admin en vista movil | 1. Ir a admin | Panel se puede usar sin romper layout | Pendiente |

