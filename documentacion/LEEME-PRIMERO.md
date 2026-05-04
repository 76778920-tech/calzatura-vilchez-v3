# Léeme primero — paquete documental

## Qué resuelve esta carpeta `documentacion/`

El **ingeniero** y la **tesis** exigen no solo código y estado del arte, sino también:

- **Planificación del proyecto** (alcance, tiempo, coste humano, riesgos, comunicación).  
- **Planificación del software** (ciclo de vida, iteraciones, líneas base).  
- **Especificación** (requisitos trazables, reglas, interfaces).  
- **Diseño** (arquitectura, datos, seguridad).  
- **Pruebas y calidad** (plan, casos, resultados, cobertura).  
- **IA y riesgo empresarial** alineado al **título fijo de tesis**.  
- **Operación** (despliegue, respaldos, incidentes).  
- **Cuadros en Excel** (en el repo como **CSV** listos para abrir y enriquecer).  
- **Trazabilidad** entre `estado_del_arte.md` y decisiones del sistema.

Este paquete **no reemplaza** el documento `estado_del_arte.md` en la raíz; lo **integra** mediante matrices y procedimientos en `11-trazabilidad-estado-del-arte.md` y `cuadros-excel/CU-T06-trazabilidad-articulo-requisito.csv`.

## Orden de lectura recomendado

1. `INDICE-MAESTRO.md`  
2. `INTEGRACION-DOCS-EXISTENTES.md`  
3. `01-marco-y-tesis.md` → `02-normas-metodologia-y-roles.md` → `03-planificacion-proyecto-completa.md`  
4. `05-especificacion-requisitos-software-SRS.md` → `06-diseno-arquitectura-y-datos.md`  
5. `07-modulo-ia-riesgo-empresarial.md` → `08-pruebas-y-calidad.md`  
6. `09-implementacion-despliegue-ci.md` → `10-operacion-y-seguridad.md`  
7. `11-trazabilidad-estado-del-arte.md` + CSVs en `cuadros-excel/` (**matriz de pruebas canónica:** solo `cuadros-excel/CU-T07-matriz-pruebas-requisitos.csv`; desde `calzatura-vilchez/docs/` abrir `CU-T07-LEEME.md`)  
8. `14-mapa-documentos-a-capitulos-tesis.md` (al redactar el documento final)  
9. `13-checklist-cierre-defensa.md` (antes de entregar al jurado)

## Convenciones

- **IDs de requisitos:** `RF-xxx` funcional, `RNF-xxx` no funcional, `RR-xxx` riesgo (riesgo de producto/software), `RP-xxx` riesgo de proyecto.  
- **IDs de prueba:** `CP-xxx` caso de prueba, `PR-xxx` procedimiento.  
- **Fechas:** ISO 8601 `YYYY-MM-DD`.  
- **Idioma principal de los documentos:** español (tesis Perú / académico).  
- **Citas bibliográficas en capítulo:** seguir norma que exija la universidad (APA, Vancouver, etc.); aquí se usa referencia corta + DOI cuando exista.

## Responsabilidades (rellenar nombres)

| Rol | Nombre | Responsabilidad documental |
|-----|--------|----------------------------|
| Director de tesis | Dr. Maglioni Arana Caparachin | Aprobación académica, coherencia título–contribución. |
| Responsable técnico / ingeniero asesor | *(completar)* | Completitud ISO, cuadros Excel, automatización. |
| Autor / equipo | *(completar)* | Redacción, mantenimiento de versiones, evidencias. |

## “Nada al aire” — criterio de cierre

Un ítem (requisito, riesgo, decisión de diseño, automatización) se considera **cerrado** solo si tiene:

1. **Descripción** en el documento correspondiente o en CSV maestro.  
2. **Evidencia** (enlace a commit, captura, resultado de prueba, log de CI, o acta firmada).  
3. Cuando aplique: **≥2 respaldos** registrados en `CU-T08-automatizacion-respaldos.csv` (p. ej. norma IEEE/ISO + artículo o guía oficial).
