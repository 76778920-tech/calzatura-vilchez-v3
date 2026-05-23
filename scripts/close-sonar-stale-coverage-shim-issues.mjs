#!/usr/bin/env node
/**
 * Cierra en SonarCloud issues OPEN del script eliminado
 * ai-service/scripts/fix_coverage_xml_for_sonar.py (avisos fantasma).
 */
const SONAR_HOST = (process.env.SONAR_HOST_URL ?? "https://sonarcloud.io").replace(/\/$/, "");
const ORGANIZATION = "76778920-tech";
const PROJECT_KEY = "76778920-tech_calzatura-vilchez-v3";
const COMPONENT = `${PROJECT_KEY}:ai-service/scripts/fix_coverage_xml_for_sonar.py`;
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
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Sonar GET ${path} → ${res.status} ${text}`);
  }
  return JSON.parse(text);
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
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Sonar POST ${path} → ${res.status} ${text}`);
  }
  return text;
}

async function fetchOpenIssues() {
  const queries = [
    `/api/issues/search?organization=${ORGANIZATION}&projects=${PROJECT_KEY}&branch=main&statuses=OPEN&components=${encodeURIComponent(COMPONENT)}&ps=100`,
    `/api/issues/search?organization=${ORGANIZATION}&projects=${PROJECT_KEY}&branch=main&issueStatuses=OPEN&components=${encodeURIComponent(COMPONENT)}&ps=100`,
    `/api/issues/search?organization=${ORGANIZATION}&projects=${PROJECT_KEY}&branch=main&statuses=OPEN&ps=500`,
  ];

  for (const path of queries) {
    const data = await sonarGet(path);
    const stale = (data.issues ?? []).filter((issue) => {
      const component = issue.component ?? "";
      return component.includes("fix_coverage_xml_for_sonar.py");
    });
    if (stale.length > 0) return stale;
  }
  return [];
}

const stale = await fetchOpenIssues();

if (stale.length === 0) {
  console.log("close-sonar-stale-coverage-shim-issues: no hay issues OPEN en la ruta eliminada");
  process.exit(0);
}

const keys = stale.map((issue) => issue.key).join(",");
try {
  await sonarPost("/api/issues/bulk_change", {
    issues: keys,
    set_type: "FALSE_POSITIVE",
  });
  console.log(`close-sonar-stale-coverage-shim-issues: ${stale.length} issue(s) → FALSE_POSITIVE (bulk)`);
} catch (bulkError) {
  console.warn(`bulk_change fallo (${bulkError.message}); probando do_transition...`);
  for (const issue of stale) {
    const transitions = ["falsepositive", "wontfix", "resolve"];
    let closed = false;
    for (const transition of transitions) {
      try {
        await sonarPost("/api/issues/do_transition", { issue: issue.key, transition });
        console.log(`cerrado ${issue.key} (${issue.rule}) via ${transition}`);
        closed = true;
        break;
      } catch {
        // siguiente transición
      }
    }
    if (!closed) {
      throw new Error(`no se pudo cerrar ${issue.key} (${issue.rule})`);
    }
  }
}
