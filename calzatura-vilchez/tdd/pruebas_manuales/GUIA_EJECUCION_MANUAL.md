# Guia Para Ejecutar Las Pruebas Manuales

## 1. Preparar El Sistema

1. Abrir la aplicacion local o desplegada.
2. Confirmar que Firebase este funcionando.
3. Crear o verificar estos usuarios:
   - Un cliente.
   - Un administrador.
4. Crear o verificar productos:
   - Producto con stock.
   - Producto sin stock.
   - Producto destacado.

## 2. Ejecutar Los Casos

Abrir:

```text
MATRIZ_CASOS_PRUEBA_MANUAL.md
```

Ejecutar los casos uno por uno desde `PM-001` hasta `PM-050`.

Para cada caso:

1. Leer la precondicion.
2. Ejecutar los pasos.
3. Comparar con el resultado esperado.
4. Marcar el estado:
   - Aprobada
   - Fallida
   - Bloqueada
   - No aplica
5. Registrar observaciones.
6. Guardar evidencia si fallo.

## 3. Completar El Reporte

Abrir:

```text
REPORTE_EJECUCION_MANUAL.md
```

Actualizar:

- Responsable.
- Fecha.
- Ambiente.
- Navegador.
- Resultado por modulo.
- Resultado de cada caso.

## 4. Reportar Errores

Si un caso falla, copiar el formato de:

```text
FORMATO_REPORTE_ERRORES.md
```

Crear un reporte por cada error encontrado.

Ejemplo de nombre:

```text
BUG-001-carrito-no-actualiza-total.md
```

## 5. Cierre

Al finalizar, entregar:

- Matriz con estados actualizados.
- Reporte de ejecucion completado.
- Reportes de bugs encontrados.
- Evidencias de errores.

