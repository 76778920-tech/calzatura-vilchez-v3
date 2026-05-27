# Seguimiento SonarQube — Calzatura Vilchez

## Antes de cada push a `main`

```bash
cd calzatura-vilchez
npm run sonar:preflight   # bloquea patrones que Sonar suele marcar
npm run test
npm run lint
```

## Issues fantasma del script Python eliminado

Si ves **3 issues Open** en `ai-service/scripts/fix_coverage_xml_for_sonar.py` pero al abrirlos dice *"The component has been removed or never existed"*, **no es código roto**: es un bug de SonarCloud.

| Qué ves | Qué significa |
|---------|----------------|
| Lista → **Open** | Sonar dejó `issueStatus=OPEN` aunque el archivo ya no existe. |
| Detalle → componente eliminado | El `.py` se borró hace días; el issue quedó huérfano. |
| CI → `closed 3 -> do_transition=close` | El workflow **sí** llamó a la API; la UI a veces no actualiza. |

**No bloquean el Quality Gate** si el workflow SonarQube termina en verde.

### Qué hacer

1. **GitHub Actions** → **SonarQube Analysis** → **Run workflow** (vuelve a ejecutar `close-sonar-stale-coverage-shim-issues.mjs` con `wontfix`/`falsepositive`).
2. En **Issues**, cambia el filtro de **Open** a **Accepted** o **False Positive** por si ya se movieron ahí.
3. Si siguen en Open tras 24 h, abre ticket a [SonarCloud Support](https://sonarcloud.io/support) con las claves del log de CI (p. ej. `AZ42k4CnbrWrxHmetXD8`).
4. El script vivo de cobertura es `scripts/fix-ai-service-coverage-xml-for-sonar.py` (excluido del análisis).

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
