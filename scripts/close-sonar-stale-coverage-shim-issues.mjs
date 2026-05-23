#!/usr/bin/env node
/**
 * Cierra issues OPEN del script eliminado ai-service/scripts/fix_coverage_xml_for_sonar.py.
 * Sonar UI puede mostrarlos en "Overall Code" aunque "New Code" diga 0.
 */
const SONAR_HOST = (process.env.SONAR_HOST_URL ?? "https://sonarcloud.io").replace(/\/$/, "");
const ORGANIZATION = "76778920-tech";
const PROJECT_KEY = "76778920-tech_calzatura-vilchez-v3";
const STALE_PATH = "ai-service/scripts/fix_coverage_xml_for_sonar.py";
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

function isStaleIssue(issue) {
  const component = issue.component ?? "";
  return component.includes(STALE_PATH);
}

async function fetchAllOpenStaleIssues() {
  const found = new Map();
  let page = 1;
  const pageSize = 500;

  while (page <= 10) {
    const path =
      `/api/issues/search?organization=${ORGANIZATION}` +
      `&projects=${PROJECT_KEY}&branch=main&statuses=OPEN` +
      `&ps=${pageSize}&p=${page}`;
    const data = await sonarGet(path);
    for (const issue of data.issues ?? []) {
      if (isStaleIssue(issue)) found.set(issue.key, issue);
    }
    const total = data.paging?.total ?? 0;
    if (page * pageSize >= total) break;
    page += 1;
  }

  return [...found.values()];
}

async function closeIssue(issue) {
  const transitions = ["falsepositive", "wontfix", "resolve", "confirm"];
  for (const transition of transitions) {
    try {
      await sonarPost("/api/issues/do_transition", { issue: issue.key, transition });
      console.log(`cerrado ${issue.key} (${issue.rule}) via ${transition}`);
      return;
    } catch {
      // siguiente
    }
  }
  throw new Error(`no se pudo cerrar ${issue.key} (${issue.rule})`);
}

const stale = await fetchAllOpenStaleIssues();

if (stale.length === 0) {
  console.log("close-sonar-stale-coverage-shim-issues: 0 issues OPEN en Overall (ruta eliminada)");
  process.exit(0);
}

console.log(`close-sonar-stale-coverage-shim-issues: encontrados ${stale.length} OPEN en ${STALE_PATH}`);

const keys = stale.map((issue) => issue.key).join(",");
try {
  await sonarPost("/api/issues/bulk_change", {
    issues: keys,
    set_status: "RESOLVED",
    set_resolution: "FALSE-POSITIVE",
  });
  console.log(`cerrados ${stale.length} → RESOLVED / FALSE-POSITIVE (bulk)`);
} catch (bulkError) {
  console.warn(`bulk_change: ${bulkError.message}`);
  for (const issue of stale) {
    await closeIssue(issue);
  }
}
