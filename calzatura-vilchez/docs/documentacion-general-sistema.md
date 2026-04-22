# Documentacion General Del Sistema Calzatura Vilchez

## 1. Resumen Del Sistema

Calzatura Vilchez es una plataforma web para comercio, inventario, ventas, administracion y analitica de demanda. El sistema permite que los clientes consulten productos, compren, guarden favoritos y revisen pedidos. Tambien permite que los administradores gestionen catalogo, stock, ventas diarias, fabricantes, usuarios, pedidos e indicadores del negocio.

La solucion esta compuesta por:

- Frontend web en React, TypeScript y Vite.
- Base de datos Cloud Firestore.
- Autenticacion Firebase Auth.
- Reglas de seguridad Firestore Rules.
- Cloud Functions para operaciones sensibles asociadas a Stripe.
- Cloudinary para carga y entrega de imagenes.
- Servicio IA en Python FastAPI para prediccion de demanda y alertas de stock.
- Docker Compose para levantar frontend y servicio IA en desarrollo.

## 2. Objetivo Del Proyecto

Centralizar la gestion comercial y operativa de Calzatura Vilchez mediante una aplicacion web que reduzca errores de inventario, mejore la trazabilidad de ventas y pedidos, facilite la administracion del catalogo y entregue indicadores utiles para la toma de decisiones.

## 3. Tecnologias Utilizadas

| Capa | Tecnologia |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Estilos | CSS propio, Tailwind Vite plugin |
| Rutas | React Router |
| Iconos | lucide-react |
| Notificaciones | react-hot-toast |
| Base de datos | Cloud Firestore |
| Autenticacion | Firebase Auth |
| Backend serverless | Firebase Functions |
| Pagos | Stripe |
| Imagenes | Cloudinary |
| IA | Python, FastAPI, pandas, numpy, scikit-learn |
| Contenedores | Docker, Docker Compose |

## 4. Estructura Principal Del Proyecto

```txt
Cazatura Vilchez V3/
  calzatura-vilchez/
    src/
      components/
      domains/
      firebase/
      routes/
      security/
      types/
      utils/
    functions/
    docs/
    public/
    firestore.rules
    storage.rules
    package.json
  ai-service/
    main.py
    models/
    services/
    requirements.txt
    Dockerfile
  docker-compose.yml
  DOCKER.md
```

## 5. Modulos Funcionales

### 5.1 Modulo Publico

Ubicacion: `src/domains/publico`

Incluye la pagina de inicio, tiendas, login y registro. Permite que visitantes y clientes naveguen por la experiencia publica del sistema.

### 5.2 Modulo Productos

Ubicacion: `src/domains/productos`

Gestiona catalogo, detalle de producto y administracion de productos. Permite manejar nombre, precio, descripcion, imagenes, marca, categoria, tipo de calzado, colores, tallas, stock por talla y stock por color.

### 5.3 Modulo Carrito

Ubicacion: `src/domains/carrito`

Gestiona carrito de compras, cantidades, seleccion de talla/color y checkout. La informacion del carrito se maneja en contexto React para la experiencia del usuario.

### 5.4 Modulo Clientes

Ubicacion: `src/domains/clientes`

Gestiona favoritos y vistas privadas del cliente. Los favoritos se almacenan como subcoleccion del usuario en Firestore.

### 5.5 Modulo Pedidos

Ubicacion: `src/domains/pedidos`

Gestiona creacion de pedidos, historial del cliente, confirmacion de pedido exitoso y administracion de pedidos desde el panel.

### 5.6 Modulo Ventas

Ubicacion: `src/domains/ventas`

Permite registrar ventas diarias manuales, calcular rentabilidad, generar documentos de venta y procesar devoluciones con reposicion de stock.

### 5.7 Modulo Fabricantes

Ubicacion: `src/domains/fabricantes`

Permite registrar fabricantes, datos de contacto, marca, ultimos ingresos, documentos y observaciones.

### 5.8 Modulo Usuarios

Ubicacion: `src/domains/usuarios`

Gestiona registro, autenticacion, perfil, roles y administracion de usuarios.

### 5.9 Modulo Administradores

Ubicacion: `src/domains/administradores`

Incluye layout administrativo, dashboard, predicciones, vista previa de imagenes y servicios auxiliares como Cloudinary.

### 5.10 Servicio IA

Ubicacion: `ai-service`

Expone endpoints para prediccion de demanda, alertas de stock y grafico semanal. Lee datos de Firestore con Firebase Admin y mantiene cache temporal para reducir lecturas.

## 6. Colecciones Firestore

| Coleccion | Uso |
|---|---|
| `productos` | Catalogo publico, stock, imagenes y atributos comerciales. |
| `productoCodigos` | Codigos internos por producto. |
| `productoFinanzas` | Costos, margenes y precios sugeridos. |
| `pedidos` | Pedidos de clientes y estados. |
| `usuarios` | Perfiles, datos personales y roles. |
| `usuarios/{uid}/favoritos` | Productos favoritos por usuario. |
| `ventasDiarias` | Ventas manuales, documentos, ganancias y devoluciones. |
| `fabricantes` | Informacion de fabricantes y documentos asociados. |

## 7. Roles Y Seguridad

El sistema distingue usuarios publicos, clientes, administradores y superadministrador.

La proteccion se aplica en varias capas:

- Rutas protegidas con `AreaRoute`.
- Control de acceso en `src/security/accessControl.ts`.
- Reglas de Firestore en `firestore.rules`.
- Cloud Functions para operaciones sensibles de pago.
- Validaciones de datos antes de escritura.

El archivo de credenciales Firebase Admin del servicio IA debe mantenerse fuera del repositorio:

```txt
ai-service/serviceAccountKey.json
```

## 8. Flujos Principales

### Compra Online

1. Cliente consulta catalogo.
2. Cliente abre detalle de producto.
3. Selecciona talla/color/cantidad.
4. Agrega al carrito.
5. Ingresa a checkout.
6. Registra direccion y metodo de pago.
7. Se crea pedido en Firestore.
8. Si paga con Stripe, se genera sesion de pago.
9. Webhook confirma pago y actualiza estado.

### Registro De Venta Manual

1. Administrador ingresa a ventas.
2. Selecciona producto por marca/codigo.
3. Define talla, color, cantidad y precio.
4. Registra venta.
5. El sistema descuenta stock.
6. Calcula ganancia.
7. Opcionalmente genera nota de venta o guia.

### Gestion De Producto

1. Administrador abre panel de productos.
2. Crea o edita producto.
3. Sube imagen a Cloudinary.
4. Define categoria, tipo, marca, colores, tallas y stock.
5. Registra costo y margenes.
6. Guarda producto, codigo interno y finanzas.

### Prediccion De Demanda

1. Administrador ingresa a predicciones.
2. Frontend consulta el servicio IA.
3. FastAPI lee ventas, pedidos completados y productos desde Firestore.
4. El modelo calcula demanda estimada.
5. La pantalla muestra predicciones, alertas y grafico semanal.

## 9. Instalacion Local

### Frontend

```bash
cd calzatura-vilchez
npm install
npm run dev
```

URL local:

```txt
http://localhost:5173
```

### Servicio IA

```bash
cd ai-service
pip install -r requirements.txt
run.bat
```

URL local:

```txt
http://localhost:8000
```

## 10. Ejecucion Con Docker

Desde la raiz del proyecto:

```bash
docker compose up --build
```

Servicios:

- Frontend: `http://localhost:5173`
- Servicio IA: `http://localhost:8000`

## 11. Validacion Del Proyecto

Desde `calzatura-vilchez`:

```bash
npm run quality
```

Este comando ejecuta lint, typecheck y build.

## 12. Despliegue

### Frontend Y Reglas Firebase

```bash
firebase deploy --only hosting,firestore:rules
```

### Servicio IA

El servicio IA no queda activo si se ejecuta solo con `run.bat` en una computadora local. Para disponibilidad continua debe desplegarse en Render, Railway, Google Cloud Run u otro servidor.

## 13. Mantenibilidad

La arquitectura por dominios permite ubicar cada funcionalidad en su area:

- Cambios de catalogo: `src/domains/productos`.
- Cambios de pedidos: `src/domains/pedidos`.
- Cambios de ventas: `src/domains/ventas`.
- Cambios de administracion: `src/domains/administradores`.
- Cambios de IA: `ai-service`.

Cada nueva funcionalidad debe considerar:

- Ruta en `src/routes/paths.ts`.
- Permisos en `AreaRoute` si no es publica.
- Reglas Firestore si escribe o lee datos sensibles.
- Validacion de entrada.
- Documentacion del flujo si modifica procesos del negocio.

