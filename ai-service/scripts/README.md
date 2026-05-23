# Scripts de `ai-service`

## Cobertura SonarCloud

| Script | Uso |
|--------|-----|
| `scripts/fix-ai-service-coverage-xml-for-sonar.py` (raíz del repo) | Lo ejecuta el CI antes del análisis Sonar |
| `fix_coverage_xml_for_sonar.py` (este directorio) | Delega al script canónico; no duplica lógica |

```bash
python scripts/fix-ai-service-coverage-xml-for-sonar.py
# equivalente:
python ai-service/scripts/fix_coverage_xml_for_sonar.py
```
