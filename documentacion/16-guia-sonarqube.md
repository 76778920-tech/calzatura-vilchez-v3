# Guia de implementacion SonarQube

**Proyecto:** Calzatura Vilchez V3
**Objetivo:** agregar analisis estatico, calidad de codigo y cobertura a GitHub Actions mediante SonarQube.

---

## 1. Que se implemento

Se agregaron los siguientes archivos y ajustes:

| Archivo | Proposito |
|---|---|
| `sonar-project.properties` | Define el alcance del analisis, cobertura e importacion de informes externos (ESLint, Bandit). |
| `.github/workflows/sonarqube.yml` | Ejecuta cobertura, ESLint JSON, Bandit, pytest y analisis SonarQube en GitHub Actions. |
| `ai-service/requirements-dev.txt` | `pytest-cov` para `coverage.xml`; `bandit` para `bandit-report.json`. |
| `.vscode/extensions.json` | Recomienda **SonarLint** en VS Code para reglas alineadas con el servidor. |
| `calzatura-vilchez/package.json` | Script `lint:report` que genera `eslint-report.json` para SonarQube. |
| `.gitignore` | Ignora artefactos locales de analisis (`coverage.xml`, `eslint-report.json`, `bandit-report.json`, `.scannerwork/`). |

## 2. Alcance del analisis

SonarQube analizara:

- Frontend React/TypeScript: `calzatura-vilchez/src`.
- Firebase Functions: `calzatura-vilchez/functions`.
- Migraciones SQL Supabase: `calzatura-vilchez/supabase`.
- Servicio IA Python/FastAPI: `ai-service`.
- Workflows CI: `.github`.

Tambien importara cobertura:

- TypeScript/JavaScript: `calzatura-vilchez/coverage/lcov.info`.
- Python: `ai-service/coverage.xml`.

E importara hallazgos de analizadores externos (documentacion oficial: [informes de analizadores externos](https://docs.sonarsource.com/sonarqube-server/latest/analyzing-source-code/importing-external-issues/external-analyzer-reports)):

- ESLint (JSON): `calzatura-vilchez/eslint-report.json` (`sonar.eslint.reportPaths`).
- Bandit (JSON): `ai-service/bandit-report.json` (`sonar.python.bandit.reportPaths`).

---

## 2.1 Precision: SonarLint, escaner CI, seguridad y perfiles

Estas practicas complementan el analisis del servidor y reducen sorpresas en el Quality Gate. **No** se incluye Sonar AI CodeFix (opcional de producto en el servidor).

### SonarLint en el IDE

- En VS Code, instala la extension recomendada al abrir el repo (SonarLint). Tambien esta disponible para IntelliJ y Eclipse.
- **Connected Mode:** enlaza el IDE con tu SonarQube usando la misma URL que `SONAR_HOST_URL` y el proyecto `calzatura-vilchez-v3`, para que las reglas locales coincidan con el servidor.

### SonarScanner en CI/CD

- El workflow usa la accion oficial `SonarSource/sonarqube-scan-action`, que descarga el **SonarScanner CLI** compatible con tu servidor. Mantener esta accion actualizada en `.github/workflows/sonarqube.yml` asegura motores de analisis recientes.
- Para analisis local fuera de GitHub Actions, instala el [SonarScanner CLI](https://docs.sonarsource.com/sonarqube-server/latest/analyzing-source-code/scanner-overview/) en tu maquina o usa Docker.

### Plugins de seguridad en el servidor SonarQube

- Los complementos de seguridad (por ejemplo orientados a OWASP, CWE o CERT, segun la edicion y Marketplace disponible) se instalan en **Administracion > Marketplace** del **servidor** SonarQube, no en este repositorio.
- Tras instalarlos, revisa el **Quality Profile** del lenguaje correspondiente para activar las reglas nuevas sin duplicar por completo lo que ya cubre ESLint o Bandit importados aqui.

### Analizadores externos en este repo

- **ESLint:** `npm run lint:report` en `calzatura-vilchez` genera el JSON consumido por SonarQube.
- **Bandit:** el workflow ejecuta Bandit sobre `main.py`, `models` y `services` del `ai-service`. En CI se usa `--exit-zero` para no fallar el job si hay hallazgos; los issues siguen visible en SonarQube. Cuando el equipo quiera fallar el pipeline por Bandit, se puede quitar ese flag y corregir o suprimir hallazgos con criterio.

### Quality Profile personalizado

1. En SonarQube: **Quality Profiles**, duplica el perfil base (por ejemplo **Sonar way** para JavaScript/TypeScript o Python).
2. Activa o desactiva reglas segun el estandar del equipo para reducir falsos positivos.
3. En **Projects > calzatura-vilchez-v3 > Project Settings > Quality Profile**, asigna el perfil personalizado por lenguaje.

La definicion de `sonar.sources`, `sonar.exclusions` y `sonar.coverage.exclusions` en `sonar-project.properties` sigue siendo la referencia para que el escaner no mezcle dependencias ni codigo generado con el producto.

## 3. Configuracion requerida en GitHub

Entrar a:

`GitHub -> Repository -> Settings -> Secrets and variables -> Actions`

Crear este **secret**:

| Tipo | Nombre | Valor |
|---|---|---|
| Secret | `SONAR_TOKEN` | Token generado desde SonarQube. |

Crear esta **variable** solo si se usa un servidor SonarQube propio:

| Tipo | Nombre | Valor |
|---|---|---|
| Variable | `SONAR_HOST_URL` | URL del servidor SonarQube, por ejemplo `https://sonarqube.mi-dominio.com`. |

Si se usa SonarQube Cloud, usar:

```txt
SONAR_HOST_URL=https://sonarcloud.io
```

El workflow ya usa `https://sonarcloud.io` por defecto, asi que para SonarQube Cloud basta con configurar `SONAR_TOKEN`.

Y en `sonar-project.properties` agregar o descomentar:

```properties
sonar.organization=clave-de-la-organizacion
```

## 4. Crear proyecto en SonarQube

En SonarQube crear un proyecto con esta clave:

```txt
calzatura-vilchez-v3
```

La misma clave esta configurada en:

```properties
sonar.projectKey=calzatura-vilchez-v3
```

## 5. Ejecucion en GitHub Actions

El workflow se ejecuta en:

- Push a `main`.
- Pull request hacia `main`.
- Ejecucion manual con `workflow_dispatch`.

Si `SONAR_TOKEN` no existe, el workflow aun asi genera cobertura, informes ESLint y Bandit, pero omite el analisis SonarQube con una advertencia. Esto evita que CI falle antes de configurar las credenciales.

## 6. Ejecucion local opcional

Con un servidor SonarQube levantado, se puede ejecutar localmente:

```bash
cd calzatura-vilchez
npm run test:coverage
npm run lint:report

cd ../ai-service
python -m pip install -r requirements-dev.txt
python -m pytest --cov=main --cov=models --cov=services --cov-report=xml:coverage.xml
python -m bandit -r main.py models services -f json -o bandit-report.json --exit-zero

cd ..
sonar-scanner -Dsonar.host.url=http://localhost:9000 -Dsonar.token=TU_TOKEN
```

## 7. Referencias oficiales

- SonarQube Scan GitHub Action: https://github.com/SonarSource/sonarqube-scan-action
- GitHub Actions con SonarQube Cloud: https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/ci-based-analysis/github-actions-for-sonarcloud
- Cobertura JavaScript/TypeScript con LCOV: https://docs.sonarsource.com/sonarqube/latest/analysis/test-coverage/javascript-typescript-test-coverage
- Cobertura Python: https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/test-coverage/python-test-coverage
- Informes externos (ESLint, Bandit, etc.): https://docs.sonarsource.com/sonarqube-server/latest/analyzing-source-code/importing-external-issues/external-analyzer-reports
- SonarLint: https://www.sonarsource.com/products/sonarlint/
