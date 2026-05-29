# Scripts de `ai-service`

## Cobertura SonarCloud (único script)

El CI ejecuta **solo** este archivo en la raíz del monorepo:

`scripts/fix-ai-service-coverage-xml-for-sonar.py`

No existe `fix_coverage_xml_for_sonar.py` en esta carpeta. Si SonarCloud muestra issues en esa ruta, son **avisos antiguos** de un archivo ya eliminado; el workflow de CI los cierra automáticamente tras cada análisis.

Los scripts Python de migración (`split_*`, `restore_*`, `fix_split_imports.py`) fueron eliminados tras el refactor a paquetes; `sonar.exclusions` ignora `ai-service/scripts/**`.
