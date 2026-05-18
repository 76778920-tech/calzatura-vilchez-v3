#!/usr/bin/env node
/**
 * Falla si los workflows requeridos no terminaron en success para un commit.
 * Uso en deploy-production (tras CI Integration en main).
 */
const owner = process.env.GITHUB_REPOSITORY?.split("/")[0];
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
const sha = process.env.HEAD_SHA;
const token = process.env.GITHUB_TOKEN;
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

const api = `https://api.github.com/repos/${owner}/${repo}/actions/runs?head_sha=${encodeURIComponent(sha)}&per_page=30`;

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

for (const name of required) {
  const match = runs.find((r) => r.name === name);
  if (!match) {
    console.error(`github-verify-workflows-for-sha: sin ejecución de "${name}" para ${sha}`);
    process.exit(1);
  }
  if (match.conclusion !== "success") {
    console.error(
      `github-verify-workflows-for-sha: "${name}" terminó en ${match.conclusion} (run ${match.id})`,
    );
    process.exit(1);
  }
  console.log(`github-verify-workflows-for-sha: OK — ${name} (${match.id})`);
}

console.log(`github-verify-workflows-for-sha: todos los workflows requeridos en success para ${sha}`);
