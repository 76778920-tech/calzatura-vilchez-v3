# Base obligatoria de calidad y seguridad

Este proyecto debe desarrollarse con una base alineada a:

- ISO 9001: sistema de gestión de calidad, trazabilidad, control de cambios y mejora continua.
- ISO/IEC 25000: SQuaRE, calidad del producto de software y evaluación.
- ISO/IEC 9126: modelo histórico de calidad de software, usado como referencia compatible con SQuaRE.
- ISO/IEC 27000: familia de gestión de seguridad de la información.

Esta guía no declara certificación ISO. Define criterios internos obligatorios para que el código, la arquitectura y los despliegues sigan una práctica compatible con esos marcos.

## Principios obligatorios

### Seguridad

- Todo acceso a datos debe pasar por autenticación, autorización y reglas de Firestore cuando aplique.
- Toda ruta no pública debe pasar por `AreaRoute` o `AuthenticatedRoute`.
- Toda nueva ruta debe registrarse en `src/routes/paths.ts`.
- Toda nueva área funcional debe ubicarse o documentarse en `src/domains`.
- Los datos privados del cliente deben estar aislados por usuario. Ejemplo: favoritos en `usuarios/{uid}/favoritos/{productId}`.
- No se deben exponer secretos en frontend, repositorio ni archivos públicos.
- Las reglas de Firestore deben mantener privilegio mínimo: lectura pública solo donde sea necesario, escritura restringida.
- Las acciones sensibles deben validar datos antes de persistir: formularios, teléfono, productos, pedidos, ventas y usuarios.
- Los errores mostrados al usuario deben ser claros, pero sin revelar datos internos, tokens, trazas o credenciales.
- Toda nueva colección o campo persistido debe acompañarse con reglas de seguridad actualizadas.

### Rendimiento

- Evitar lecturas innecesarias y cargas repetidas desde Firebase.
- Usar carga diferida para rutas pesadas o paneles administrativos.
- No bloquear la interfaz con operaciones síncronas largas.
- Optimizar imágenes antes de publicar y usar URLs externas confiables como Cloudinary.
- Mantener el build de producción limpio: sin warnings críticos, sin imports muertos y sin bundles innecesarios.

### Escalabilidad

- Separar responsabilidades por dominio y capa interna: `src/domains/<dominio>/pages`, `components`, `services` y `context` cuando aplique.
- Toda integración externa debe vivir en `services`, endpoints backend o módulos equivalentes, no dentro de componentes visuales complejos.
- Diseñar colecciones de Firestore con rutas predecibles y permisos acotados.
- Evitar duplicar lógica de negocio en varias pantallas. Si se reutiliza, debe ir a `utils`, `services` o `context`.
- Mantener componentes pequeños cuando una pantalla crece demasiado.

### Usabilidad

- Cada acción importante debe tener respuesta visible: carga, éxito, error o estado vacío.
- Los botones iconográficos deben tener `aria-label`.
- Las rutas protegidas deben redirigir de forma clara cuando el usuario no inició sesión.
- Los textos visibles deben estar en español correcto, con tildes y `ñ`.
- La interfaz debe ser responsive y no debe superponer textos, botones, imágenes ni menús.
- El flujo de compra, favoritos, perfil, pedidos y catálogo debe ser entendible sin instrucciones externas.

### Mantenibilidad

- TypeScript debe compilar sin errores.
- ESLint debe pasar antes de publicar.
- Los nombres internos pueden conservar claves de datos existentes, pero los textos visibles deben ser correctos.
- Las funciones deben tener nombres claros y responsabilidad única.
- Los cambios en reglas, servicios o modelos deben documentarse cuando modifiquen comportamiento.
- No se deben mezclar refactors grandes con cambios funcionales pequeños.

## Seccionamiento obligatorio por dominios

El proyecto queda organizado conceptualmente en:

- `src/domains/público`: inicio, login, registro y vistas sin cuenta.
- `src/domains/productos`: catálogo y detalle de productos.
- `src/domains/carrito`: carrito y checkout.
- `src/domains/clientes`: favoritos y datos privados del cliente.
- `src/domains/pedidos`: pedidos de cliente y gestión administrativa.
- `src/domains/administradores`: panel administrativo general.
- `src/domains/trabajadores`: futuras operaciones internas.
- `src/domains/fabricantes`: fabricantes y documentos.
- `src/domains/ventas`: ventas diarias, costos y ganancias.
- `src/domains/usuarios`: perfil, registro validado, roles y permisos.

Las carpetas del frontend no son una barrera criptográfica. El usuario final puede descargar el bundle del navegador. Por eso la protección obligatoria se implementa con:

- rutas centralizadas en `src/routes/paths.ts`;
- guardias en `src/routes/RouteGuards.tsx`;
- mapa de permisos en `src/security/accessControl.ts`;
- reglas de Firestore;
- Cloud Functions o endpoints serverless propios para operaciones sensibles.

No se debe prometer que una carpeta frontend está "encriptada". Se debe hablar de aislamiento por dominio, control de acceso y validación de permisos.

## Puertas de calidad antes de desplegar

Antes de subir a Firebase, ejecutar:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

Si se modifican reglas de Firebase:

```bash
firebase.cmd deploy --only firestore:rules
```

Si se pública la web:

```bash
firebase.cmd deploy --only hosting,firestore:rules
```

## Checklist por cambio

- Seguridad: ¿el dato nuevo tiene regla de lectura/escritura?
- Seguridad: ¿la ruta está registrada y protegida por su área?
- Seguridad: ¿el usuario solo accede a información propia o pública?
- Rendimiento: ¿la pantalla evita cargas repetidas o innecesarias?
- Escalabilidad: ¿la lógica está en `services`, `utils` o `context` cuando corresponde?
- Usabilidad: ¿hay estados de carga, vacío, éxito y error?
- Usabilidad: ¿los textos visibles tienen tildes, `ñ` y etiquetas accesibles?
- Mantenibilidad: ¿pasaron lint, typecheck y build?
- Mantenibilidad: ¿el cambio es pequeño, trazable y fácil de revisar?

## Aplicación directa al portal

- Catálogo: lectura pública de productos; escritura solo administrador.
- Productos: imágenes gestionadas por Cloudinary y validación antes de guardar.
- Favoritos: datos privados por usuario en subcolección propia.
- Pedidos: cada cliente solo lee sus pedidos; administrador gestiona estados.
- Usuarios: cada cliente edita solo su perfil permitido; administrador gestiona roles.
- Admin: rutas y datos restringidos por rol.
- Hosting: build estático desde `dist`, con cache control para `index.html` y assets versionados.

## Auditorías internas

- [security-audit.md](security-audit.md): hallazgos de seguridad, correcciones aplicadas y riesgos pendientes.
