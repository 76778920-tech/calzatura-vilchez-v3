# Cuadros tipo Excel — instrucciones de uso

## Propósito

Los archivos `CU-T*.csv` son **tablas maestras** equivalentes a los cuadros que el ingeniero pidió en **Microsoft Excel**. Permiten:

- Filtrar, ordenar y pivotear como en hoja de cálculo.  
- Versionar en **Git** junto al código.  
- Exportar a PDF para **anexos de tesis** o actas.

## Cómo abrir (Windows)

1. Abrir **Excel** → Datos → Obtener datos → Desde archivo → Desde texto/CSV.  
2. Seleccionar el archivo `CU-Txx.csv`.  
3. Codificación: **UTF-8**.  
4. Delimitador: **coma** (`,`).  
5. Detectar tipos de datos: según preferencia.

**LibreOffice Calc:** Archivo → Abrir → elegir CSV → separador coma, UTF-8.

## Convención de columnas

- La **primera fila** es siempre cabecera.  
- Los valores `COMPLETAR` son **placeholders** hasta que el equipo llene datos reales.  
- No incluir **contraseñas** ni datos personales identificables.

## Lista de archivos

| Archivo | Contenido |
|---------|-----------|
| `CU-T01-stakeholders.csv` | Partes interesadas |
| `CU-T02-edt-wbs.csv` | EDT / WBS |
| `CU-T03-cronograma.csv` | Hitos y fechas |
| `CU-T04-matriz-riesgos-proyecto.csv` | Riesgos de proyecto |
| `CU-T05-requisitos.csv` | Lista maestra de requisitos |
| `CU-T06-trazabilidad-articulo-requisito.csv` | Estado del arte ↔ sistema |
| `CU-T07-matriz-pruebas-requisitos.csv` | Pruebas ↔ requisitos |
| `CU-T08-automatizacion-respaldos.csv` | Automatización + 2 respaldos |

## Exportación a anexo de tesis

1. Completar y revisar con director.  
2. En Excel: Archivo → Imprimir → Guardar como PDF.  
3. Nombrar: `Anexo-Matriz-T06-Trazabilidad-EDA-v1.0.pdf`.

## Control de versión de cuadros

| Versión cuadros | Fecha | Responsable |
|-----------------|-------|-------------|
| 1.0 | 2026-05-01 | Equipo tesis |
