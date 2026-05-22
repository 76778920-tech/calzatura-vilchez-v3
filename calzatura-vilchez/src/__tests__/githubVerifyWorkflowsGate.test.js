import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  findLatestWorkflowRun,
  formatWorkflowGateFailure,
  isWorkflowRunSuccess,
} from "../../../scripts/github-verify-workflows-lib.mjs";

const verifyScriptSource = fs.readFileSync(
  path.resolve(process.cwd(), "../scripts/github-verify-workflows-for-sha.mjs"),
  "utf8",
);

describe("github-verify-workflows-lib", () => {
  it("elige el run más reciente por nombre de workflow", () => {
    const runs = [
      { name: "CI Integration", id: 1, created_at: "2026-05-22T00:00:00Z", conclusion: "failure" },
      { name: "CI Integration", id: 2, created_at: "2026-05-22T01:00:00Z", conclusion: "success" },
    ];
    expect(findLatestWorkflowRun(runs, "CI Integration")?.id).toBe(2);
  });

  it("detecta success solo con conclusion success", () => {
    expect(isWorkflowRunSuccess({ conclusion: "success" })).toBe(true);
    expect(isWorkflowRunSuccess({ conclusion: null, status: "in_progress" })).toBe(false);
    expect(isWorkflowRunSuccess({ conclusion: "failure" })).toBe(false);
  });

  it("mensaje claro cuando el workflow sigue en curso", () => {
    const msg = formatWorkflowGateFailure("CI Integration", {
      id: 26260311531,
      conclusion: null,
      status: "in_progress",
    });
    expect(msg).toContain("sigue en curso");
    expect(msg).toContain("status=in_progress");
    expect(msg).toContain("26260311531");
    expect(msg).not.toContain("terminó en null");
  });

  it("mensaje con pista de ciclo cuando conclusion es null sin status en curso", () => {
    const msg = formatWorkflowGateFailure("CI Integration", {
      id: 99,
      conclusion: null,
      status: "completed",
    });
    expect(msg).toContain("aún no tiene conclusion");
    expect(msg).toContain("workflow_call solo debe validar CI base");
  });

  it("mensaje explícito para failure", () => {
    const msg = formatWorkflowGateFailure("CI Integration", {
      id: 42,
      conclusion: "failure",
      status: "completed",
    });
    expect(msg).toContain("terminó en failure");
    expect(msg).toContain("Revisa los jobs fallidos");
  });
});

describe("github-verify-workflows-for-sha (script)", () => {
  it("usa la lib y no imprime terminó en null", () => {
    expect(verifyScriptSource).toContain('from "./github-verify-workflows-lib.mjs"');
    expect(verifyScriptSource).toContain("findLatestWorkflowRun");
    expect(verifyScriptSource).toContain("formatWorkflowGateFailure");
    expect(verifyScriptSource).not.toContain("terminó en ${match.conclusion}");
  });
});
