#!/usr/bin/env node
/**
 * Closes ghost issues from the deleted ai-service/scripts/fix_coverage_xml_for_sonar.py.
 *
 * SonarCloud can keep deleted-file issues as status=CLOSED/resolution=REMOVED but
 * issueStatus=OPEN, which still appears as "Open" in the UI. The documented
 * bulk_change parameter is do_transition, not doTransition.
 */
const SONAR_HOST = (process.env.SONAR_HOST_URL ?? "https://sonarcloud.io").replace(/\/$/, "");
const ORGANIZATION = "76778920-tech";
const PROJECT_KEY = "76778920-tech_calzatura-vilchez-v3";
const STALE_COMPONENT = `${PROJECT_KEY}:ai-service/scripts/fix_coverage_xml_for_sonar.py`;
const STALE_PATH = "fix_coverage_xml_for_sonar.py";
const ISSUE_STATUSES_OPEN = "OPEN,CONFIRMED";
const REMOVED_RESOLUTION = "REMOVED";
const token = process.env.SONAR_TOKEN;

if (!token) {
  console.log("close-sonar-stale-coverage-shim-issues: skipped (missing SONAR_TOKEN)");
  process.exit(0);
}

const auth = Buffer.from(`${token}:`, "utf8").toString("base64");

async function sonarGet(path) {
  const res = await fetch(`${SONAR_HOST}${path}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Sonar GET ${path} -> ${res.status} ${text}`);
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
    throw new Error(`Sonar POST ${path} -> ${res.status} ${text}`);
  }
  return text;
}

function isStaleIssue(issue) {
  return (issue.component ?? "").includes(STALE_PATH);
}

function uniqueIssues(issues) {
  return [...new Map(issues.map((issue) => [issue.key, issue])).values()];
}

async function searchIssues(path) {
  const data = await sonarGet(path);
  return data.issues ?? [];
}

async function searchByComponentKeys(branchQuery) {
  return searchIssues(
    `/api/issues/search?organization=${ORGANIZATION}` +
      `&componentKeys=${encodeURIComponent(STALE_COMPONENT)}` +
      `&issueStatuses=${ISSUE_STATUSES_OPEN}${branchQuery}` +
      `&ps=100&p=1`,
  );
}

async function searchByProjectScan(branchQuery) {
  const found = [];
  let page = 1;
  const pageSize = 500;

  while (page <= 10) {
    const data = await sonarGet(
      `/api/issues/search?organization=${ORGANIZATION}` +
        `&projects=${PROJECT_KEY}` +
        `&issueStatuses=${ISSUE_STATUSES_OPEN}${branchQuery}` +
        `&ps=${pageSize}&p=${page}`,
    );
    found.push(...(data.issues ?? []).filter(isStaleIssue));
    const total = data.paging?.total ?? 0;
    if (page * pageSize >= total) break;
    page += 1;
  }

  return uniqueIssues(found);
}

async function searchRemovedGhosts(branchQuery) {
  const found = [];
  let page = 1;
  const pageSize = 500;

  while (page <= 10) {
    const data = await sonarGet(
      `/api/issues/search?organization=${ORGANIZATION}` +
        `&projects=${PROJECT_KEY}` +
        `&resolved=true` +
        `&resolutions=${REMOVED_RESOLUTION}` +
        `${branchQuery}` +
        `&ps=${pageSize}&p=${page}`,
    );
    found.push(...(data.issues ?? []).filter((issue) => isStaleIssue(issue) && issue.issueStatus === "OPEN"));
    const total = data.paging?.total ?? 0;
    if (page * pageSize >= total) break;
    page += 1;
  }

  return uniqueIssues(found);
}

async function fetchAllStaleIssues() {
  const branchVariants = ["&branch=main", ""];

  for (const branchQuery of branchVariants) {
    const removedGhosts = await searchRemovedGhosts(branchQuery);
    if (removedGhosts.length > 0) {
      console.log(
        `close-sonar-stale-coverage-shim-issues: ${removedGhosts.length} REMOVED ghosts (${branchQuery || "no branch"})`,
      );
      return removedGhosts;
    }

    const direct = await searchByComponentKeys(branchQuery);
    if (direct.length > 0) {
      console.log(
        `close-sonar-stale-coverage-shim-issues: ${direct.length} by componentKeys (${branchQuery || "no branch"})`,
      );
      return direct;
    }

    const scanned = await searchByProjectScan(branchQuery);
    if (scanned.length > 0) {
      console.log(
        `close-sonar-stale-coverage-shim-issues: ${scanned.length} by projects+issueStatuses (${branchQuery || "no branch"})`,
      );
      return scanned;
    }
  }

  return [];
}

async function closeIssue(issue) {
  const transitions = ["close", "falsepositive", "accept", "wontfix", "resolve"];
  for (const transition of transitions) {
    try {
      await sonarPost("/api/issues/do_transition", {
        issue: issue.key,
        transition,
      });
      console.log(`closed ${issue.key} (${issue.rule}) via do_transition=${transition}`);
      return;
    } catch {
      // Try the next transition supported by this issue state.
    }
  }
  throw new Error(`could not close ${issue.key} (${issue.rule})`);
}

const stale = await fetchAllStaleIssues();

if (stale.length === 0) {
  console.log("close-sonar-stale-coverage-shim-issues: 0 stale issues");
  process.exit(0);
}

const keys = stale.map((issue) => issue.key).join(",");

try {
  await sonarPost("/api/issues/bulk_change", {
    issues: keys,
    do_transition: "close",
  });
  console.log(`closed ${stale.length} -> do_transition=close (bulk): ${keys}`);
} catch (bulkError) {
  console.warn(`bulk_change failed: ${bulkError.message}; trying do_transition per issue`);
  for (const issue of stale) {
    await closeIssue(issue);
  }
}
