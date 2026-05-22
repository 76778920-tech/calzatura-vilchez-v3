import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..");

function readWorkflow(name) {
  return fs.readFileSync(path.join(repoRoot, ".github", "workflows", name), "utf8");
}

describe("IA/DevOps measurable controls workflow guard", () => {
  it("mantiene controles IA/DevOps estaticos dentro del CI base", () => {
    const ci = readWorkflow("ci.yml");

    expect(ci).toContain("ops-controls-static:");
    expect(ci).toContain("readiness-check.mjs");
    expect(ci).toContain("ai-backtest-gate.mjs");
    expect(ci).toContain("--report docs/ops/ai-backtesting-report.fixture.txt");
    expect(ci).toContain("--max-mape-pct 60");
    expect(ci).toContain("--min-wins-mape-ratio 0.5");
    expect(ci).toContain("restore-drill-check.mjs");
    expect(ci).toContain("restore-drill-evidence.ci.json");
  });

  it("bloquea deploy de produccion si fallan readiness/backtesting/continuidad reales", () => {
    const integration = readWorkflow("ci-integration.yml");

    expect(integration).toContain("ops-controls-real:");
    expect(integration).toContain("Readiness live BFF/IA");
    expect(integration).toContain("--require-env BFF_BASE_URL");
    expect(integration).toContain("--require-env AI_SERVICE_URL");
    expect(integration).toContain("Backtesting IA real con umbrales");
    expect(integration).toContain("--run");
    expect(integration).toContain("--max-mape-pct 150");
    expect(integration).toContain("--min-wins-mape-ratio 0.34");
    expect(integration).toContain("--min-density-pct 0.5");
    expect(integration).toContain("--min-comparison-density-pct 5");
    expect(integration).toContain("Restore drill - evidencia operativa versionada");
    expect(integration).toContain("restore-drill-evidence.ci.json");
    expect(integration).toContain("supabase-remote-parity:");
    expect(integration).toContain("verify-supabase-migration-parity.mjs");
    expect(integration).toContain("needs: [quality, ai-service, ai-service-docker, ops-controls-real, e2e, supabase-remote-parity]");

    const realJob = integration.slice(integration.indexOf("ops-controls-real:"), integration.indexOf("  e2e:"));
    expect(realJob).not.toContain("--warn-only");
    expect(realJob).not.toContain("--allow-missing-secrets");
  });

  it("deja el workflow operativo manual en modo bloqueante por defecto", () => {
    const ops = readWorkflow("ops-controls.yml");

    expect(ops).toMatch(/backtest_warn_only:[\s\S]*default:\s+"false"/);
    expect(ops).toContain("node scripts/readiness-check.mjs");
    expect(ops).toContain("node scripts/ai-backtest-gate.mjs");
    expect(ops).toContain("node scripts/restore-drill-check.mjs");
  });

  it("no interpola workflow inputs dentro de run (Sonar githubactions:S7630)", () => {
    const ops = readWorkflow("ops-controls.yml");
    const runBlocks = [...ops.matchAll(/run:\s*\|\s*\n([\s\S]*?)(?=\n\s{6}-\sname:|\n\s{4}[a-z])/g)].map(
      (m) => m[1],
    );
    expect(runBlocks.length).toBeGreaterThan(0);
    for (const block of runBlocks) {
      expect(block).not.toMatch(/\$\{\{\s*inputs\./);
    }
    expect(ops).toContain("RUN_LIVE_READINESS: ${{ inputs.run_live_readiness }}");
    expect(ops).toContain("MAX_MAPE_PCT: ${{ inputs.max_mape_pct }}");
    expect(ops).toContain('"$MAX_MAPE_PCT"');
  });
});
