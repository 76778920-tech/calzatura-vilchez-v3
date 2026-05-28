#!/usr/bin/env node
/**
 * Falla si los workflows requeridos no terminaron en success para un commit.
 * Uso en deploy-production (tras CI Integration en main).
 */
import {
  findLatestWorkflowRun,
  formatWorkflowGateFailure,
  isWorkflowRunSuccess,
} from "./github-verify-workflows-lib.mjs";

const owner = process.env.GITHUB_REPOSITORY?.split("/")[0];
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
const sha = process.env.HEAD_SHA;
const token = process.env.GITHUB_TOKEN;
const waitTimeoutSec = Number(process.env.WORKFLOW_GATE_WAIT_SEC || "600");
const waitPollSec = Number(process.env.WORKFLOW_GATE_POLL_SEC || "15");
const required = (process.env.REQUIRED_WORKFLOWS || "")
  .split("|")
  .map((s) => s.trim())
  .filter(Boolean);

if (!owner || !repo || !sha || !token) {
  console.error("github-verify-workflows-for-sha: faltan GITHUB_REPOSITORY, HEAD_SHA o GITHUB_TOKEN");
  process.exit(1);
}
if (required.length === 0) {
  console.error("github-verify-workflows-for-sha: REQUIRED_WORKFLOWS vacío");
  process.exit(1);
}

const api = `https://api.github.com/repos/${owner}/${repo}/actions/runs?head_sha=${encodeURIComponent(sha)}&per_page=100`;
const startTs = Date.now();

while (true) {
  const res = await fetch(api, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) {
    console.error(`github-verify-workflows-for-sha: API ${res.status}`);
    process.exit(1);
  }

  const runs = (await res.json()).workflow_runs || [];
  let pending = false;
  for (const name of required) {
    const match = findLatestWorkflowRun(runs, name);
    if (!match) {
      pending = true;
      console.log(`github-verify-workflows-for-sha: esperando ejecución de "${name}" para ${sha}...`);
      continue;
    }
    if (!isWorkflowRunSuccess(match)) {
      if (match.conclusion === null) {
        pending = true;
        console.log(
          `github-verify-workflows-for-sha: "${name}" sigue en progreso (run ${match.id}, status=${match.status})...`,
        );
        continue;
      }
      console.error(formatWorkflowGateFailure(name, match));
      process.exit(1);
    }
    console.log(`github-verify-workflows-for-sha: OK — ${name} (${match.id})`);
  }

  if (!pending) {
    console.log(`github-verify-workflows-for-sha: todos los workflows requeridos en success para ${sha}`);
    break;
  }

  const elapsedSec = (Date.now() - startTs) / 1000;
  if (elapsedSec >= waitTimeoutSec) {
    console.error(
      `github-verify-workflows-for-sha: timeout esperando workflows requeridos (${Math.round(elapsedSec)}s).`,
    );
    process.exit(1);
  }
  await new Promise((resolve) => setTimeout(resolve, waitPollSec * 1000));
}
