#!/usr/bin/env node
/**
 * Closes ghost issues from the deleted ai-service/scripts/fix_coverage_xml_for_sonar.py.
 *
 * SonarCloud bug: resolution=REMOVED but issueStatus stays OPEN → list shows "Open"
 * and the issue page says "The component has been removed or never existed."
 * `do_transition=close` alone often does not clear issueStatus; try wontfix/falsepositive first.
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

function isGhostStillOpen(issue) {
  return issue.issueStatus === "OPEN" || issue.status === "OPEN";
}

function uniqueIssues(issues) {
  return [...new Map(issues.map((issue) => [issue.key, issue])).values()];
}

async function searchIssues(path) {
  const data = await sonarGet(path);
  return data.issues ?? [];
}

async function fetchIssueByKey(key) {
  const issues = await searchIssues(
    `/api/issues/search?organization=${ORGANIZATION}&issues=${encodeURIComponent(key)}&ps=1`,
  );
  return issues[0] ?? null;
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
    found.push(...(data.issues ?? []).filter((issue) => isStaleIssue(issue) && isGhostStillOpen(issue)));
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

async function tryTransition(issueKey, transition) {
  await sonarPost("/api/issues/do_transition", { issue: issueKey, transition });
}

async function forceCloseGhost(issue) {
  const transitions = ["wontfix", "falsepositive", "resolve", "close"];
  for (const transition of transitions) {
    try {
      await tryTransition(issue.key, transition);
      const updated = await fetchIssueByKey(issue.key);
      if (!updated) {
        console.log(`ghost ${issue.key}: no longer returned by API`);
        return true;
      }
      if (!isGhostStillOpen(updated)) {
        console.log(
          `ghost ${issue.key}: closed via ${transition} (issueStatus=${updated.issueStatus}, status=${updated.status}, resolution=${updated.resolution})`,
        );
        return true;
      }
    } catch (error) {
      console.warn(`ghost ${issue.key}: transition ${transition} failed: ${error.message}`);
    }
  }
  return false;
}

const stale = await fetchAllStaleIssues();

if (stale.length === 0) {
  console.log("close-sonar-stale-coverage-shim-issues: 0 stale issues");
  process.exit(0);
}

console.log(
  `close-sonar-stale-coverage-shim-issues: attempting to close ${stale.length} issue(s): ${stale.map((i) => i.key).join(", ")}`,
);

let closed = 0;
for (const issue of stale) {
  if (await forceCloseGhost(issue)) {
    closed += 1;
  }
}

const remaining = await fetchAllStaleIssues();
if (remaining.length === 0) {
  console.log(`close-sonar-stale-coverage-shim-issues: all ${stale.length} ghost(s) cleared`);
  process.exit(0);
}

console.warn(
  `close-sonar-stale-coverage-shim-issues: ${remaining.length} ghost(s) still OPEN in API after transitions`,
);
for (const issue of remaining) {
  console.warn(
    `  - ${issue.key} rule=${issue.rule} issueStatus=${issue.issueStatus} status=${issue.status} resolution=${issue.resolution}`,
  );
}
console.warn(
  "SonarCloud UI may still list them under Open even when the file is gone. " +
    "Quality Gate is unaffected. Contact SonarCloud support with these keys if needed.",
);
process.exit(closed > 0 ? 0 : 1);
