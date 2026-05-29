# Scripts de `ai-service`

## Cobertura SonarCloud

El CI ejecuta en la raíz del monorepo: `scripts/fix-ai-service-coverage-xml-for-sonar.py`.

## Stubs `split_*` (retirados)

`split_demand_package.py` y `split_supabase_package.py` son marcadores mínimos del one-off de migración (ya aplicado). Se analizan en Sonar para cerrar issues históricos; el resto de scripts de esta carpeta siguen excluidos en `sonar-project.properties`.
