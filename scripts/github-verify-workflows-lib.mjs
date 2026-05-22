/**
 * Lógica pura del gate deploy: elegir el run más reciente y mensajes de error claros.
 */

const IN_PROGRESS_STATUSES = new Set([
  "queued",
  "in_progress",
  "waiting",
  "requested",
  "pending",
]);

/**
 * @param {Array<{ name?: string; created_at?: string }>} runs
 * @param {string} workflowName
 */
export function findLatestWorkflowRun(runs, workflowName) {
  return runs
    .filter((r) => r.name === workflowName)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
}

/** @param {{ conclusion?: string | null; status?: string }} run */
export function isWorkflowRunSuccess(run) {
  return run?.conclusion === "success";
}

/**
 * @param {string} workflowName
 * @param {{ id?: number; conclusion?: string | null; status?: string; html_url?: string }} run
 */
export function formatWorkflowGateFailure(workflowName, run) {
  const id = run?.id ?? "?";
  const conclusion = run?.conclusion ?? null;
  const status = run?.status ?? "desconocido";
  const url = run?.html_url ? ` Ver run: ${run.html_url}` : "";

  if (conclusion === null && IN_PROGRESS_STATUSES.has(status)) {
    return (
      `github-verify-workflows-for-sha: "${workflowName}" sigue en curso (status=${status}, run ${id}). ` +
      `Espera a que termine antes de desplegar.${url}`
    );
  }

  if (conclusion === null) {
    return (
      `github-verify-workflows-for-sha: "${workflowName}" aún no tiene conclusion (status=${status}, run ${id}). ` +
      `Si este paso corre dentro de CI Integration, no exijas ese workflow aquí: el gate workflow_call solo debe validar CI base ` +
      `(ver deploy-production.yml).${url}`
    );
  }

  if (conclusion === "failure") {
    return (
      `github-verify-workflows-for-sha: "${workflowName}" terminó en failure (run ${id}). ` +
      `Revisa los jobs fallidos en Actions antes de reintentar deploy.${url}`
    );
  }

  return `github-verify-workflows-for-sha: "${workflowName}" terminó en ${conclusion} (run ${id}).${url}`;
}
