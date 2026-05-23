# Scripts de `ai-service`

El ajuste de `coverage.xml` para SonarCloud se ejecuta desde la raíz del monorepo:

`scripts/fix-ai-service-coverage-xml-for-sonar.py`

No vuelvas a crear `fix_coverage_xml_for_sonar.py` en esta carpeta: era un duplicado que generaba issues duplicados en SonarCloud.
