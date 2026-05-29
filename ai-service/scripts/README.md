# Scripts de `ai-service`

## Cobertura SonarCloud

El CI ejecuta en la raíz del monorepo: `scripts/fix-ai-service-coverage-xml-for-sonar.py`.

## Scripts `split_*` (eliminados)

Los one-off `split_demand_package.py` y `split_supabase_package.py` ya no están en el repo (migración aplicada). El historial está en git (`git log -- ai-service/scripts/split_*`). Están excluidos en `sonar-project.properties` para que SonarCloud no reanalice rutas obsoletas.
