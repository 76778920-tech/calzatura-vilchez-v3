# Documentacion General Del Sistema Calzatura Vilchez

## 1. Resumen Del Sistema

Calzatura Vilchez es una plataforma web para comercio, inventario, ventas, administración y analítica de demanda. El sistema permite que los clientes consulten productos, compren, guarden favoritos y revisen pedidos. También permite que los administradores gestionen catálogo, stock, ventas diarias, fabricantes, usuarios, pedidos e indicadores del negocio.

La solución esta compuesta por:

- Frontend web en React, TypeScript y Vite.
- Base de datos Supabase (PostgreSQL) con políticas RLS.
- Autenticación Firebase Auth.
- Cloud Functions para operaciones sensibles asociadas a Stripe.
- Cloudinary para carga y entrega de imágenes.
- Servicio IA en Python FastAPI para predicción de demanda y alertas de stock.
- Docker Compose para levantar frontend y servicio IA en desarrollo.

## 2. Objetivo Del Proyecto

Centralizar la gestión comercial y operativa de Calzatura Vilchez mediante una aplicación web que reduzca errores de inventario, mejore la trazabilidad de ventas y pedidos, facilite la administración del catálogo y entregue indicadores útiles para la toma de decisiones.

## 3. Tecnologias Utilizadas

| Capa | Tecnologia |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Estilos | CSS propio, Tailwind Vite plugin |
| Rutas | React Router |
| Iconos | lucide-react |
| Notificaciones | react-hot-toast |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Firebase Auth |
| Backend serverless | Firebase Functions (pagos Stripe) |
| Pagos | Stripe |
| Imágenes | Cloudinary |
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

## 5. Módulos Funcionales

### 5.1 Módulo Público

Ubicacion: `src/domains/público`

Incluye la página de inicio, tiendas, login y registro. Permite que visitantes y clientes naveguen por la experiencia pública del sistema.

### 5.2 Módulo Productos

Ubicacion: `src/domains/productos`

Gestiona catálogo, detalle de producto y administración de productos. Permite manejar nombre, precio, descripción, imágenes, marca, categoría, tipo de calzado, colores, tallas, stock por talla y stock por color.

### 5.3 Módulo Carrito

Ubicacion: `src/domains/carrito`

Gestiona carrito de compras, cantidades, seleccion de talla/color y checkout. La información del carrito se maneja en contexto React para la experiencia del usuario.

### 5.4 Módulo Clientes

Ubicacion: `src/domains/clientes`

Gestiona favoritos y vistas privadas del cliente. Los favoritos se almacenan como subcoleccion del usuario en Firestore.

### 5.5 Módulo Pedidos

Ubicacion: `src/domains/pedidos`

Gestiona creación de pedidos, historial del cliente, confirmación de pedido exitoso y administración de pedidos desde el panel.

### 5.6 Módulo Ventas

Ubicacion: `src/domains/ventas`

Permite registrar ventas diarias manuales, calcular rentabilidad, generar documentos de venta y procesar devoluciones con reposicion de stock.

### 5.7 Módulo Fabricantes

Ubicacion: `src/domains/fabricantes`

Permite registrar fabricantes, datos de contacto, marca, últimos ingresos, documentos y observaciones.

### 5.8 Módulo Usuarios

Ubicacion: `src/domains/usuarios`

Gestiona registro, autenticación, perfil, roles y administración de usuarios.

### 5.9 Módulo Administradores

Ubicacion: `src/domains/administradores`

Incluye layout administrativo, dashboard, predicciones, vista previa de imágenes y servicios auxiliares como Cloudinary.

### 5.10 Servicio IA

Ubicacion: `ai-service`

Expone endpoints para predicción de demanda, alertas de stock y gráfico semanal. Lee datos de Supabase y mantiene cache temporal para reducir consultas.

## 6. Tablas Supabase

| Tabla | Uso |
|---|---|
| `productos` | Catálogo público, stock, imágenes y atributos comerciales. |
| `productoCodigos` | Códigos internos por producto. |
| `productoFinanzas` | Costos, margenes y precios sugeridos. |
| `pedidos` | Pedidos de clientes y estados. |
| `usuarios` | Perfiles, datos personales y roles. |
| `ventasDiarias` | Ventas manuales, documentos, ganancias y devoluciones. |
| `fabricantes` | Información de fabricantes y documentos asociados. |
| `auditoria` | Trazabilidad ISO 9001 de operaciones admin. |

## 7. Roles Y Seguridad

El sistema distingue usuarios públicos, clientes, administradores y superadministrador.

La proteccion se aplica en varias capas:

- Rutas protegidas con `AreaRoute`.
- Control de acceso en `src/security/accessControl.ts`.
- Políticas RLS en Supabase para tablas de negocio.
- Cloud Functions para operaciones sensibles de pago.
- Validaciones de datos antes de escritura.

El archivo de credenciales Firebase Admin del servicio IA debe mantenerse fuera del repositorio:

```txt
ai-service/serviceAccountKey.json
```

## 8. Flujos Principales

### Compra Online

1. Cliente consulta catálogo.
2. Cliente abre detalle de producto.
3. Selecciona talla/color/cantidad.
4. Agrega al carrito.
5. Ingresa a checkout.
6. Registra dirección y método de pago.
7. Se crea pedido en Supabase.
8. Si paga con Stripe, se genera sesión de pago.
9. Webhook confirma pago y actualiza estado.

### Registro De Venta Manual

1. Administrador ingresa a ventas.
2. Selecciona producto por marca/código.
3. Define talla, color, cantidad y precio.
4. Registra venta.
5. El sistema descuenta stock.
6. Calcula ganancia.
7. Opcionalmente genera nota de venta o guia.

### Gestión De Producto

1. Administrador abre panel de productos.
2. Crea o edita producto.
3. Sube imagen a Cloudinary.
4. Define categoría, tipo, marca, colores, tallas y stock.
5. Registra costo y margenes.
6. Guarda producto, código interno y finanzas.

### Predicción De Demanda

1. Administrador ingresa a predicciones.
2. Frontend consulta el servicio IA.
3. FastAPI lee ventas, pedidos completados y productos desde Supabase.
4. El modelo calcula demanda estimada.
5. La pantalla muestra predicciones, alertas y gráfico semanal.

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

## 11. Validación Del Proyecto

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

La arquitectura por dominios permite ubicar cada funcionalidad en su área:

- Cambios de catálogo: `src/domains/productos`.
- Cambios de pedidos: `src/domains/pedidos`.
- Cambios de ventas: `src/domains/ventas`.
- Cambios de administración: `src/domains/administradores`.
- Cambios de IA: `ai-service`.

Cada nueva funcionalidad debe considerar:

- Ruta en `src/routes/paths.ts`.
- Permisos en `AreaRoute` si no es pública.
- Reglas Firestore si escribe o lee datos sensibles.
- Validación de entrada.
- Documentacion del flujo si modifica procesos del negocio.

