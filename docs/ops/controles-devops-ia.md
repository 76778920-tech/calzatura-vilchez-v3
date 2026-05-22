# Controles DevOps/IA medibles

Estos controles son operativos, no destructivos por defecto y ejecutables sin secretos cuando se usan en modo plan, fixture o evidencia de ejemplo.

## 1. Readiness BFF/IA

Script:

```bash
node scripts/readiness-check.mjs --config docs/ops/readiness.sample.json --plan-only
```

Ejecucion real local:

```bash
node scripts/readiness-check.mjs --config docs/ops/readiness.sample.json --output artifacts/readiness/local.json
```

Configuracion por entorno:

```bash
READINESS_TARGETS='[
  {"name":"bff-prod","url":"https://example-bff/health","expectedStatus":[200],"maxMs":2500},
  {"name":"ai-prod","url":"https://example-ai/api/health","expectedStatus":[200],"maxMs":4000}
]' node scripts/readiness-check.mjs --output artifacts/readiness/prod.json
```

Medidas producidas: estado HTTP, latencia, fallo por status/texto/latencia y variables requeridas presentes o ausentes. Para endpoints protegidos se pueden declarar headers en el JSON, pero no se deben commitear secretos.

## 2. Backtesting IA con umbrales

Validar un reporte existente o fixture:

```bash
node scripts/ai-backtest-gate.mjs --report docs/ops/ai-backtesting-report.fixture.txt --max-mape-pct 60 --min-wins-mape-ratio 0.5
```

Ejecutar backtesting real si existen `SUPABASE_URL` y `SUPABASE_SERVICE_KEY`:

```bash
node scripts/ai-backtest-gate.mjs --run --history 180 --folds 6 --allow-missing-secrets --warn-only
```

Medidas producidas: MAPE promedio RF, MAPE baseline, folds evaluados, ratio de folds ganados por MAPE, densidad del dataset y evidencia JSON. En CI Integration el gate es bloqueante: exige datos minimos y MAPE finito. La comparacion RF vs baseline solo bloquea cuando la densidad supera `--min-comparison-density-pct`; si el historial es demasiado escaso, el resultado queda como advertencia medible y no como validacion falsa del modelo.

## 3. Restore drill

Validar evidencia de simulacro:

```bash
node scripts/restore-drill-check.mjs --evidence docs/ops/restore-drill-evidence.ci.json
```

Para un simulacro real, completar una copia de `docs/ops/restore-drill-evidence.template.json` con el identificador del backup, destino temporal, RTO/RPO observados, verificaciones ejecutadas y plan de descarte del ambiente temporal.

Medidas producidas: RTO, RPO, cantidad de verificaciones y resultado pass/fail. El script no restaura datos ni escribe en produccion; solo valida que la evidencia minima exista y cumpla umbrales.
