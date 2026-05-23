#!/usr/bin/env node
/**
 * Cierra issues OPEN del script eliminado ai-service/scripts/fix_coverage_xml_for_sonar.py.
 * Usa issueStatuses (Sonar 10.4+), no statuses (deprecado; la UI filtra con issueStatuses).
 */
const SONAR_HOST = (process.env.SONAR_HOST_URL ?? "https://sonarcloud.io").replace(/\/$/, "");
const ORGANIZATION = "76778920-tech";
const PROJECT_KEY = "76778920-tech_calzatura-vilchez-v3";
const STALE_COMPONENT = `${PROJECT_KEY}:ai-service/scripts/fix_coverage_xml_for_sonar.py`;
const STALE_PATH = "fix_coverage_xml_for_sonar.py";
/** SonarCloud 10.4+: REOPENED no es válido en issueStatuses. */
const ISSUE_STATUSES_OPEN = "OPEN,CONFIRMED";
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

async function searchByComponentKeys(branchQuery) {
  const path =
    `/api/issues/search?organization=${ORGANIZATION}` +
    `&componentKeys=${encodeURIComponent(STALE_COMPONENT)}` +
    `&issueStatuses=${ISSUE_STATUSES_OPEN}${branchQuery}` +
    `&ps=100&p=1`;
  const data = await sonarGet(path);
  return data.issues ?? [];
}

async function searchByProjectScan(branchQuery) {
  const found = new Map();
  let page = 1;
  const pageSize = 500;

  while (page <= 10) {
    const path =
      `/api/issues/search?organization=${ORGANIZATION}` +
      `&projects=${PROJECT_KEY}` +
      `&issueStatuses=${ISSUE_STATUSES_OPEN}${branchQuery}` +
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

async function fetchAllOpenStaleIssues() {
  const branchVariants = ["&branch=main", ""];

  for (const branchQuery of branchVariants) {
    const direct = await searchByComponentKeys(branchQuery);
    if (direct.length > 0) {
      console.log(
        `close-sonar-stale-coverage-shim-issues: ${direct.length} por componentKeys (${branchQuery || "sin branch"})`,
      );
      return direct;
    }

    const scanned = await searchByProjectScan(branchQuery);
    if (scanned.length > 0) {
      console.log(
        `close-sonar-stale-coverage-shim-issues: ${scanned.length} por projects+issueStatuses (${branchQuery || "sin branch"})`,
      );
      return scanned;
    }
  }

  return [];
}

const stale = await fetchAllOpenStaleIssues();

if (stale.length === 0) {
  console.log(
    "close-sonar-stale-coverage-shim-issues: 0 issues (API issueStatuses; la UI puede seguir mostrando fantasmas hasta cierre manual)",
  );
  process.exit(0);
}

const keys = stale.map((issue) => issue.key).join(",");

async function closeIssue(issue) {
  const transitions = ["falsepositive", "accept", "wontfix", "resolve"];
  for (const transition of transitions) {
    try {
      await sonarPost("/api/issues/do_transition", {
        issue: issue.key,
        transition,
      });
      console.log(`cerrado ${issue.key} (${issue.rule}) via do_transition=${transition}`);
      return;
    } catch {
      // siguiente transición
    }
  }
  throw new Error(`no se pudo cerrar ${issue.key} (${issue.rule})`);
}

try {
  await sonarPost("/api/issues/bulk_change", {
    issues: keys,
    doTransition: "falsepositive",
  });
  console.log(`cerrados ${stale.length} → doTransition=falsepositive (bulk): ${keys}`);
} catch (bulkError) {
  console.warn(`bulk_change: ${bulkError.message}; probando do_transition por issue`);
  for (const issue of stale) {
    await closeIssue(issue);
  }
}
