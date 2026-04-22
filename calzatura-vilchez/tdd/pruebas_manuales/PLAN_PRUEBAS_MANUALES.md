# Plan De Pruebas Manuales - Calzatura Vilchez

## 1. Objetivo

Validar manualmente las funcionalidades principales del sistema Calzatura Vilchez, verificando que los usuarios puedan navegar, registrarse, iniciar sesion, comprar productos, gestionar pedidos y que el administrador pueda administrar productos y pedidos.

Este documento corresponde a pruebas manuales, no automatizadas.

## 2. Alcance

Las pruebas manuales cubren:

- Pagina principal.
- Catalogo de productos.
- Detalle de producto.
- Carrito de compras.
- Registro de usuario.
- Inicio de sesion.
- Checkout.
- Pedido exitoso.
- Historial de pedidos.
- Perfil de usuario.
- Panel administrador.
- Gestion de productos.
- Gestion de pedidos.
- Validaciones basicas de seguridad.

## 3. Tipos De Prueba

| Tipo | Descripcion |
| --- | --- |
| Funcional | Verifica que cada modulo cumpla lo esperado |
| Usabilidad | Revisa claridad, navegacion y facilidad de uso |
| Validacion | Verifica campos obligatorios y mensajes de error |
| Seguridad basica | Revisa accesos no permitidos |
| Compatibilidad | Revisa funcionamiento en navegador y resoluciones distintas |
| Regresion | Repite flujos criticos luego de cambios |

## 4. Roles De Prueba

| Rol | Descripcion |
| --- | --- |
| Visitante | Usuario sin iniciar sesion |
| Cliente | Usuario registrado con rol cliente |
| Administrador | Usuario con acceso al panel admin |

## 5. Ambiente De Prueba

| Elemento | Valor |
| --- | --- |
| Sistema | Calzatura Vilchez |
| Navegador principal | Google Chrome |
| Navegador alterno | Microsoft Edge |
| Dispositivo desktop | Windows |
| Dispositivo movil | Vista responsive del navegador |
| Base de datos | Firebase Firestore |
| Autenticacion | Firebase Auth |
| Hosting | Firebase Hosting |

## 6. Criterios De Entrada

Antes de iniciar las pruebas:

- La aplicacion debe estar desplegada o ejecutandose localmente.
- Debe existir al menos un producto con stock.
- Debe existir al menos un producto sin stock.
- Debe existir un usuario administrador.
- Debe existir conexion a Firebase.
- El navegador debe tener cache limpia o modo incognito.

## 7. Criterios De Salida

Las pruebas se consideran terminadas cuando:

- Se ejecutaron todos los casos definidos.
- Los errores encontrados fueron documentados.
- Cada error tiene pasos para reproducirlo.
- Se registraron evidencias cuando aplique.
- Se clasifico la severidad de cada incidencia.

## 8. Severidad De Errores

| Severidad | Descripcion |
| --- | --- |
| Critica | Impide comprar, iniciar sesion o compromete seguridad |
| Alta | Afecta una funcion importante pero tiene alternativa |
| Media | Error visible que no bloquea el flujo principal |
| Baja | Detalle visual, texto o mejora menor |

## 9. Estados De Prueba

| Estado | Significado |
| --- | --- |
| Pendiente | Aun no ejecutada |
| Aprobada | Resultado esperado correcto |
| Fallida | Resultado no coincide |
| Bloqueada | No se pudo ejecutar por dependencia |
| No aplica | Caso no corresponde al ambiente actual |

## 10. Entregables

Los documentos de pruebas manuales son:

- `PLAN_PRUEBAS_MANUALES.md`
- `MATRIZ_CASOS_PRUEBA_MANUAL.md`
- `REPORTE_EJECUCION_MANUAL.md`
- `FORMATO_REPORTE_ERRORES.md`

