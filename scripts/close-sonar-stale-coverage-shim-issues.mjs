#!/usr/bin/env node
/**
 * Cierra en SonarCloud issues OPEN del script eliminado
 * ai-service/scripts/fix_coverage_xml_for_sonar.py (avisos fantasma de código viejo).
 */
const SONAR_HOST = process.env.SONAR_HOST_URL ?? "https://sonarcloud.io";
const PROJECT_KEY = "76778920-tech_calzatura-vilchez-v3";
const STALE_FILE = "ai-service/scripts/fix_coverage_xml_for_sonar.py";
const token = process.env.SONAR_TOKEN;

if (!token) {
  console.log("close-sonar-stale-coverage-shim-issues: omitido (sin SONAR_TOKEN)");
  process.exit(0);
}

const auth = Buffer.from(`${token}:`, "utf8").toString("base64");

async function sonarGet(path) {
  const res = await fetch(`${SONAR_HOST}${path}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) {
    throw new Error(`Sonar GET ${path} → ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function sonarPost(path, body) {
  const res = await fetch(`${SONAR_HOST}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) {
    throw new Error(`Sonar POST ${path} → ${res.status} ${await res.text()}`);
  }
  return res;
}

const search = await sonarGet(
  `/api/issues/search?projects=${encodeURIComponent(PROJECT_KEY)}` +
    `&branch=main&issueStatuses=OPEN&ps=500`,
);

const stale = (search.issues ?? []).filter((issue) => {
  const component = issue.component ?? "";
  return component.endsWith(STALE_FILE) || component.includes(STALE_FILE);
});

if (stale.length === 0) {
  console.log("close-sonar-stale-coverage-shim-issues: no hay issues OPEN en la ruta eliminada");
  process.exit(0);
}

for (const issue of stale) {
  await sonarPost("/api/issues/do_transition", {
    issue: issue.key,
    transition: "falsepositive",
  });
  console.log(`cerrado ${issue.key} (${issue.rule})`);
}

console.log(`close-sonar-stale-coverage-shim-issues: ${stale.length} issue(s) cerrados`);
