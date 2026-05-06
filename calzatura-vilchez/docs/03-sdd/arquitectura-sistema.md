# SDD — Documento de Diseño del Sistema: Arquitectura
## Calzatura Vilchez — Sistema de E-commerce con IA

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | 2026-05-05 |
| Norma base | ISO/IEC 25010:2011 — Mantenibilidad, Portabilidad, Eficiencia |
| Referencia SRS | docs/01-srs/SRS-Calzatura-Vilchez.md |

---

## 1. Visión general de la arquitectura

El sistema Calzatura Vilchez implementa una **arquitectura de tres capas desacopladas** con servicios externos:

```
┌─────────────────────────────────────────────────────────────────┐
│                      CAPA DE PRESENTACIÓN                        │
│                                                                   │
│   ┌──────────────────────┐    ┌──────────────────────────────┐  │
│   │  Web App (React 19)  │    │  Mobile App (Flutter 3.x)    │  │
│   │  TypeScript + Vite   │    │  Android / iOS               │  │
│   │  Firebase Hosting    │    │  Riverpod + GoRouter         │  │
│   └──────────┬───────────┘    └──────────────┬───────────────┘  │
└──────────────┼──────────────────────────────┼───────────────────┘
               │  HTTPS / REST                │  HTTPS / REST
┌──────────────┼──────────────────────────────┼───────────────────┐
│              │    CAPA DE SERVICIOS          │                    │
│   ┌──────────▼──────────┐   ┌───────────────▼──────────────┐   │
│   │   Supabase           │   │   Firebase Auth              │   │
│   │   (PostgreSQL + RLS) │   │   (JWT tokens)               │   │
│   │   PostgREST API      │   └──────────────────────────────┘   │
│   └──────────┬───────────┘                                       │
│              │              ┌───────────────────────────────┐   │
│              │              │   Firebase Cloud Functions    │   │
│              │              │   (Stripe webhook handler)    │   │
│              │              └──────────┬────────────────────┘   │
│              │                         │                          │
│   ┌──────────▼───────────────────────▼──────────────────────┐  │
│   │              Servicio IA (FastAPI + scikit-learn)         │  │
│   │              Python 3.12 — Render.com                     │  │
│   │              RandomForestRegressor + IRE Calculator        │  │
│   └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
               │                         │
┌──────────────▼─────────────────────────▼───────────────────────┐
│                      SERVICIOS EXTERNOS                          │
│   Cloudinary (CDN imágenes)   │   Stripe (pagos)                │
│   API RENIEC (validación DNI) │   Render.com (hosting IA)       │
└─────────────────────────────────────────────────────────────────┘
```

Esta arquitectura aplica el principio de **separación de responsabilidades** y el patrón **Backend for Frontend (BFF)** mediante Supabase PostgREST. Cada capa puede escalarse, actualizarse o reemplazarse de forma independiente, satisfaciendo los requisitos RNF-10 (arquitectura modular) y RNF-16 (despliegue en contenedores).

La elección se fundamenta en Bharadwaj et al. (2013): la arquitectura digital debe soportar las cuatro dimensiones de la estrategia digital (alcance, escala, velocidad, valor), lo que requiere componentes desacoplados que puedan escalar independientemente.

---

## 2. Componentes del sistema

### 2.1 Frontend web (React 19 + TypeScript)

**Tecnología:** React 19, TypeScript, Vite, React Router v6  
**Despliegue:** Firebase Hosting (`calzaturavilchez-ab17f.web.app`)  
**Puerto local:** 5173

**Responsabilidades:**
- Renderizar la interfaz de usuario para visitantes, clientes y administradores.
- Gestionar el estado de autenticación mediante Firebase Auth SDK.
- Consumir la API PostgREST de Supabase para CRUD de datos de negocio.
- Consumir el servicio IA para predicciones, IRE y alertas.
- Gestionar el flujo de pago con Stripe Checkout.

**Estructura interna (arquitectura por dominios):**
```
src/
  components/       ← Componentes compartidos (UI genérico)
  domains/
    público/        ← Página de inicio, catálogo, detalle de producto
    productos/      ← Gestión de productos (admin)
    carrito/        ← Carrito de compras y checkout
    pedidos/        ← Historial de pedidos (cliente y admin)
    clientes/       ← Favoritos y perfil del cliente
    ventas/         ← Ventas manuales y documentos
    fabricantes/    ← Gestión de fabricantes (admin)
    usuarios/       ← Autenticación y perfil
    administradores/← Dashboard, predicciones, layout admin
  firebase/         ← Configuración Firebase Auth
  routes/           ← Definición de rutas y rutas protegidas
  security/         ← Control de acceso por rol
  types/            ← Tipos TypeScript del dominio
  utils/            ← Funciones utilitarias
```

La arquitectura por dominios implementa el patrón de **Feature Slicing**, que garantiza que los cambios en un dominio no afecten a otros (RNF-10 — arquitectura modular). Cada dominio es una unidad cohesiva con sus propios componentes, hooks, servicios y tipos.

### 2.2 Aplicación móvil (Flutter 3.x)

**Tecnología:** Flutter 3.x, Dart 3.x, Riverpod 2.x, GoRouter  
**Plataformas:** Android 8+ (API 26+), iOS 13+  
**Package ID:** `com.calzaturavilchez.calzatura_vilchez_mobile`

**Responsabilidades:**
- Proveer una experiencia de compra optimizada para dispositivos móviles.
- Consumir la misma API Supabase que el frontend web (misma base de datos).
- Autenticar usuarios mediante Firebase Auth SDK for Flutter.
- Mostrar catálogo con filtros, detalle de producto, carrito y perfil.

**Arquitectura interna (Feature-first):**
```
lib/
  core/
    theme/          ← Paleta de colores (gold #C9A227, black #0D0D0D, beige #F8F7F4)
    router/         ← GoRouter con rutas protegidas y redirección por rol
  features/
    auth/           ← Login, registro, providers de autenticación
    catalog/        ← Catálogo, filtros, ProductCard, ProductDetail
    cart/           ← Carrito, CartItem, CartProvider (Riverpod)
    product/        ← Detalle de producto, selección de talla
    profile/        ← Perfil del cliente, admin banner
    shell/          ← ShellPage, navegación flotante bottom nav
    admin/          ← Dashboard administrativo para admin/trabajador
  shared/
    models/         ← Product, CartItem, User (modelos de dominio)
    widgets/        ← CVLogo, componentes compartidos
```

**Gestión de estado:** Riverpod 2.x con `StateProvider`, `FutureProvider`, `NotifierProvider`. La elección de Riverpod sobre Provider o BLoC se fundamenta en su capacidad para gestionar dependencias entre providers de forma declarativa, reduciendo el boilerplate y facilitando el testing.

### 2.3 Base de datos (Supabase / PostgreSQL)

**Tecnología:** Supabase (PostgreSQL 15), PostgREST, Row Level Security (RLS)  
**URL:** `https://jdmcvsddnshukkcnzghq.supabase.co`

**Decisión de diseño:** Se eligió Supabase sobre Firebase Firestore porque:
1. PostgreSQL soporta consultas SQL complejas necesarias para el servicio IA (JOINs, agregaciones de ventas diarias).
2. PostgREST genera automáticamente una API REST a partir del esquema de la base de datos, eliminando la necesidad de un servidor backend intermedio.
3. Las políticas RLS de PostgreSQL implementan el control de acceso a nivel de datos de forma nativa, sin lógica en el backend de la aplicación.

**Tablas principales:**

| Tabla | Función principal | Políticas RLS |
|---|---|---|
| `productos` | Catálogo completo con stock por talla (JSONB) | SELECT público; INSERT/UPDATE/DELETE solo admin |
| `pedidos` | Órdenes de compra online | SELECT solo propietario; INSERT cliente autenticado; UPDATE solo admin |
| `ventasDiarias` | Ventas presenciales manuales | SELECT/INSERT/UPDATE solo admin/trabajador |
| `usuarios` | Perfiles y roles | SELECT propietario; UPDATE propietario (no rol); UPDATE rol solo admin |
| `fabricantes` | Datos de proveedores | Solo admin |
| `productoCodigos` | Códigos internos de inventario | Solo admin |
| `productoFinanzas` | Costos y márgenes | Solo admin |
| `auditoria` | Log de operaciones ISO 9001 | SELECT solo admin; INSERT sistema |
| `ire_historial` | Serie temporal del IRE | SELECT solo admin; INSERT servicio IA |
| `modelo_estado` | Metadatos del modelo IA | Solo servicio IA (Bearer Token) |

### 2.4 Servicio de IA (FastAPI + scikit-learn)

**Tecnología:** Python 3.12, FastAPI 0.111, scikit-learn 1.5, pandas 2.x  
**Despliegue:** Render.com (contenedor Docker)  
**Puerto local:** 8000

**Responsabilidades:**
- Leer datos de ventas históricas de Supabase (ventasDiarias + pedidos completados).
- Entrenar y ejecutar el modelo RandomForestRegressor para predicción de demanda por producto.
- Calcular el IRE actual y proyectado.
- Generar alertas de stock con fecha de quiebre.
- Exponer endpoints REST con autenticación Bearer Token.
- Persistir metadatos del modelo en Supabase para sobrevivir reinicios.

**Arquitectura interna:**
```
ai-service/
  main.py                 ← FastAPI app, endpoints, cache, rate limiting
  models/
    demand.py             ← predict_demand(), build_daily_sales, get_weekly_chart
    revenue.py            ← forecast_revenue()
    risk.py               ← compute_ire(), compute_ire_proyectado()
  services/
    supabase_client.py    ← fetch_products, fetch_daily_sales, fetch_completed_orders
                             fetch_ire_historial, save_ire_historial, save_modelo_estado
```

**Modelo de ML:** RandomForestRegressor de scikit-learn (Breiman, 2001). La elección se fundamenta en:
- Robustez frente a datasets pequeños (series de ventas de PYME con < 200 observaciones).
- Capacidad de manejar relaciones no lineales entre variables (precio, categoría, estación).
- Importancia de variables integrada (feature_importances_) para explicabilidad.
- Makridakis et al. (2018) validan que para series cortas, RandomForest tiene precisión comparable a LSTM con menor complejidad computacional.

### 2.5 Autenticación (Firebase Auth)

**Responsabilidades:** Registro de usuarios, inicio de sesión, gestión de tokens JWT, recuperación de contraseña.  
**Integración:** El `uid` de Firebase Auth es la clave foránea que relaciona el usuario con su perfil en Supabase `usuarios`.

### 2.6 CDN de imágenes (Cloudinary)

**Responsabilidades:** Almacenamiento permanente de imágenes de productos, transformación automática (WebP, redimensionamiento, compresión), entrega mediante CDN global.  
**Integración:** Las URLs de Cloudinary se almacenan en el campo `imagenes` (array de strings) en Supabase `productos`.

---

## 3. Patrones de diseño implementados

### 3.1 Observer / Reactive State (Riverpod)
En la aplicación móvil Flutter, Riverpod implementa el patrón Observer donde los widgets se suscriben a providers y se reconstruyen automáticamente cuando el estado cambia. Ejemplo: `cartItemCountProvider` observa el carrito y el badge del navbar se actualiza en tiempo real.

### 3.2 Repository Pattern
En ambas aplicaciones (web y móvil), los servicios de datos (ej. `src/domains/productos/services/productService.ts`) encapsulan las consultas a Supabase. Los componentes no conocen los detalles de la API de Supabase, solo usan el contrato de la función de servicio. Esto facilita el testing y el cambio de fuente de datos.

### 3.3 Cache-Aside
El servicio IA implementa un caché en memoria de los datos de Supabase con TTL de 2 horas. Al recibir una solicitud, primero verifica el caché; si está válido, lo usa; si expiró, consulta Supabase. Este patrón reduce la latencia de respuesta de ~2 segundos a < 200 ms en solicitudes frecuentes.

### 3.4 Rate Limiting (Token Bucket)
El endpoint `/api/predict/demand` aplica rate limiting de 20 solicitudes/minuto por IP mediante `slowapi`. Esto protege el servicio IA de sobrecarga y preserva la cuota gratuita de Supabase.

### 3.5 Event-Driven (Webhook)
El flujo de pago con Stripe es event-driven: el sistema no hace polling del estado del pago. En cambio, Stripe envía un evento `checkout.session.completed` al webhook de Firebase Cloud Functions, que actualiza el estado del pedido en Supabase. Este patrón garantiza la consistencia eventual del estado del pedido.

---

## 4. Decisiones de arquitectura

### ADR-01: PostgreSQL (Supabase) como base de datos principal
**Decisión:** Usar Supabase (PostgreSQL) para los datos de negocio, en lugar de Firebase Firestore para todo.  
**Razón:** El servicio IA requiere consultas SQL complejas (GROUP BY fecha, SUM de cantidades, JOINs entre ventas y productos) que Firestore no soporta eficientemente. PostgreSQL permite ejecutar estas consultas directamente en la base de datos sin traer todos los datos al servicio IA.  
**Consecuencia:** El sistema mantiene dos servicios de backend-as-a-service (Firebase Auth + Supabase), lo que aumenta ligeramente la complejidad de configuración pero optimiza el rendimiento del servicio IA.

### ADR-02: FastAPI para el servicio IA
**Decisión:** Implementar el servicio IA como un microservicio FastAPI separado del frontend.  
**Razón:** Python con scikit-learn es el ecosistema más maduro para ML. FastAPI proporciona documentación automática (Swagger UI en `/docs`), tipado estático con Pydantic y rendimiento asíncrono. La separación del servicio IA permite desplegarlo independientemente, escalarlo según demanda y actualizarlo sin afectar el frontend.  
**Consecuencia:** El frontend debe gestionar la indisponibilidad del servicio IA de forma elegante (mensaje de error sin romper el resto de la interfaz).

### ADR-03: Row Level Security en Supabase
**Decisión:** Implementar control de acceso exclusivamente mediante políticas RLS de PostgreSQL, sin lógica de autorización en el frontend.  
**Razón:** Las políticas RLS garantizan que incluso si un cliente malicioso manipula las solicitudes al API de Supabase, no puede acceder a datos de otros usuarios. El control de acceso está en la capa de datos, no en la capa de presentación.  
**Consecuencia:** Cada tabla requiere políticas RLS explícitas para cada combinación de rol y operación. Esto aumenta la complejidad de configuración pero elimina vulnerabilidades de acceso por manipulación de tokens.

### ADR-04: Arquitectura por dominios en el frontend
**Decisión:** Organizar el código en `src/domains/` en lugar de una organización por tipo de archivo (components/, hooks/, services/).  
**Razón:** La organización por dominio (Feature Slicing) agrupa todo el código relacionado con una funcionalidad en un mismo directorio, facilitando la navegación del código y el trabajo en equipo (distintos desarrolladores trabajan en dominios separados sin conflictos).  
**Consecuencia:** Los componentes compartidos entre dominios deben vivir en `src/components/` y los tipos globales en `src/types/`, creando una distinción entre código de dominio y código transversal.

---

## 5. Tecnologías seleccionadas y justificación

| Componente | Tecnología | Versión | Justificación |
|---|---|---|---|
| Frontend web | React + TypeScript | 19 / 5.x | Ecosistema más maduro para SPA empresariales. TypeScript garantiza tipado estático (RNF-12). |
| Build tool | Vite | 5.x | Tiempo de arranque en desarrollo < 1 segundo. HMR instantáneo para productividad. |
| Estilos web | CSS propio + Tailwind (parcial) | — | Control total de la paleta corporativa. |
| Rutas web | React Router | v6 | Estándar de facto para SPAs React. Rutas protegidas con `AreaRoute`. |
| App móvil | Flutter + Dart | 3.x / 3.x | Un solo codebase para Android e iOS. Rendimiento nativo con compilación ahead-of-time. |
| Estado móvil | Riverpod | 2.x | Gestión de estado reactiva, sin boilerplate de BLoC. Soporte nativo para async providers. |
| DB principal | Supabase/PostgreSQL | 15 | SQL complejo para IA, RLS nativo, PostgREST elimina backend intermedio. |
| Autenticación | Firebase Auth | 10.x | PaaS maduro con soporte para email/password, OAuth, JWT. |
| Imágenes | Cloudinary | — | Transformación automática a WebP, CDN global, URLs permanentes. |
| Pagos | Stripe | — | PCI DSS Nivel 1, la pasarela más confiable para Latinoamérica. |
| Serverless | Firebase Cloud Functions | v2 | Para el webhook de Stripe, evita exponer claves Stripe en el frontend. |
| ML Framework | scikit-learn | 1.5 | Biblioteca de referencia para ML clásico. RandomForestRegressor documentado en Breiman (2001). |
| API IA | FastAPI | 0.111 | Documentación automática, tipado con Pydantic, rendimiento ASGI. |
| Cache IA | In-memory dict | — | TTL de 2 horas, reducción de consultas a Supabase 95%. |
| Contenedores | Docker + Docker Compose | — | Reproducibilidad de entorno (RNF-16). |
| Hosting web | Firebase Hosting | — | CDN global, HTTPS automático, integrado con Firebase Auth. |
| Hosting IA | Render.com | — | Despliegue de contenedores Docker, inicio automático, sleep en inactividad (plan gratuito). |

---

## 6. Diagrama de flujo de datos — Predicción de demanda

```
[Admin abre /admin/predictions]
         │
         ▼
[Frontend: GET /api/predict/demand?horizon=30&history=90]
    + Bearer Token en Authorization header
         │
         ▼
[FastAPI: _require_service_auth() — verifica token]
         │
         ▼
[FastAPI: _load_data(lookback_days=120)]
    ¿Caché válido (< 2 horas)?
    ├── SÍ → retorna datos del caché
    └── NO → consulta Supabase (4 queries paralelas):
              - fetch_daily_sales(120 días)
              - fetch_completed_orders(120 días)
              - fetch_products()
              - fetch_product_codes()
              Actualiza caché con TTL 2h
         │
         ▼
[models/demand.py: predict_demand()]
    - build_daily_sales_by_product()
    - Para cada producto con historial ≥ 14 días:
        - Construye features: días de historial, tendencia, media
        - Entrena RandomForestRegressor
        - Predice unidades para horizonte configurado
    - Para productos sin historial: marca sin_historial=True
         │
         ▼
[Calcula training_meta y guarda en _model_registry]
[save_modelo_estado() → Supabase tabla modelo_estado]
         │
         ▼
[Retorna JSON con predicciones, training_meta]
         │
         ▼
[Frontend: muestra tabla de predicciones, alertas, IRE]
```

---

## 7. Seguridad en la arquitectura (ISO/IEC 27001)

**Capas de seguridad implementadas:**

1. **Capa de transporte:** HTTPS/TLS 1.2+ en todos los endpoints (Firebase Hosting, Supabase, Render.com, Cloudinary, Stripe).

2. **Capa de autenticación:** Firebase Auth emite tokens JWT firmados con RS256. El servicio IA usa un Bearer Token independiente (variable de entorno `AI_SERVICE_BEARER_TOKEN`).

3. **Capa de autorización:** Políticas RLS en Supabase (implementación del principio de mínimo privilegio a nivel de base de datos). El control de acceso por rol en el frontend es una segunda línea de defensa, no la única.

4. **Capa de datos:** Cifrado en reposo en Supabase (AES-256, provisto por la plataforma). Las credenciales de Firebase, Supabase y Stripe se almacenan como variables de entorno (`.env`, excluido del repositorio con `.gitignore`).

5. **Capa de aplicación:** Validación de entrada en formularios (frontend + Cloud Functions). Sanitización de parámetros en el servicio IA (Query params con restricciones `ge=7, le=90`).

6. **Trazabilidad:** Tabla `auditoria` en Supabase registra todas las operaciones administrativas sensibles (ISO/IEC 27001, Control A.12.4.1 — Registro de eventos).

*Referencia: ISO/IEC 27001:2022, Dominio A.8 (Controles de activos), A.9 (Control de acceso), A.10 (Criptografía), A.12 (Seguridad de las operaciones), A.13 (Seguridad de las comunicaciones), A.14 (Adquisición, desarrollo y mantenimiento de sistemas).*
