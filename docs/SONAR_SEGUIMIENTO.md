# Seguimiento SonarQube — Calzatura Vilchez

## Antes de cada push a `main`

```bash
cd calzatura-vilchez
npm run sonar:preflight   # bloquea patrones que Sonar suele marcar
npm run test
npm run lint
```

## Issues del script Python eliminado

SonarCloud puede seguir mostrando **3 issues** en `ai-service/scripts/fix_coverage_xml_for_sonar.py` (archivo **ya no existe**). El workflow `.github/workflows/sonarqube.yml` ejecuta `scripts/close-sonar-stale-coverage-shim-issues.mjs` antes y después del scan para cerrarlos. Si persisten en la UI:

1. Disparar manualmente **SonarQube Analysis** en GitHub Actions (`workflow_dispatch`).
2. En SonarCloud → Issues, filtrar por esa ruta y marcar como cerrados si el bulk script no los alcanzó.

## Checklist post-push (CI verde)

| Paso | Dónde verificar |
|------|-----------------|
| Tests Vitest | GitHub Actions → job que corre `npm run test` |
| Sonar scan | Workflow **SonarQube Analysis** |
| Quality Gate | SonarCloud → proyecto `76778920-tech_calzatura-vilchez-v3` |
| Issues abiertos | SonarCloud → Issues → filtro `issueStatus=OPEN` |

## Patrones corregidos en frontend

- `role="status"` → `<output>` / `LoadingStatusRegion`
- `role="dialog"` → `<dialog open>`
- `role="list"` / `listitem` → `<ul>` / `<li>`
- `document.write` → impresión vía Blob (`printComplaintReceipt.ts`)
- Props React → `Readonly<{...}>`
- `test.skip` en E2E → `beforeEach` limpia `calzatura_cookie_consent`
- Complejidad cognitiva → subcomponentes (`ComplaintBookFormSections`, `renderComplaintsMain`)

## Si reaparece un smell

1. Ejecutar `npm run sonar:preflight` en local.
2. Corregir en código (no suprimir reglas sin motivo).
3. Push a `main` y esperar el scan (~5–10 min).
4. Refrescar SonarCloud; los issues del código viejo desaparecen al no reproducirse en el nuevo análisis.
