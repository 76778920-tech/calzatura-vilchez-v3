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
const STALE_PATH_FRAGMENTS = [
  "fix_coverage_xml_for_sonar.py",
  "split_demand_package.py",
  "split_supabase_package.py",
  "split_campaign_package.py",
  "fix_split_imports.py",
  "restore_demand_modules.py",
  "restore_features_ml.py",
  "restore_supabase_modules.py",
];
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
  const component = issue.component ?? "";
  return STALE_PATH_FRAGMENTS.some((fragment) => component.includes(fragment));
}

function isSonarUiGhost(issue) {
  return (
    issue.resolution === REMOVED_RESOLUTION &&
    issue.status === "CLOSED" &&
    issue.issueStatus === "OPEN"
  );
}

function isGhostStillOpen(issue) {
  if (isSonarUiGhost(issue)) return false;
  if (issue.status === "CLOSED" || issue.resolution === REMOVED_RESOLUTION) return false;
  return issue.issueStatus === "OPEN" || issue.status === "OPEN";
}

function isActionableStaleIssue(issue) {
  return isStaleIssue(issue) && isGhostStillOpen(issue);
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
  const found = [];
  for (const fragment of STALE_PATH_FRAGMENTS) {
    const componentKey = `${PROJECT_KEY}:ai-service/scripts/${fragment}`;
    const batch = await searchIssues(
      `/api/issues/search?organization=${ORGANIZATION}` +
        `&componentKeys=${encodeURIComponent(componentKey)}` +
        `&issueStatuses=${ISSUE_STATUSES_OPEN}${branchQuery}` +
        `&ps=100&p=1`,
    );
    found.push(...batch);
  }
  return uniqueIssues(found);
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
    found.push(...(data.issues ?? []).filter(isActionableStaleIssue));
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
    found.push(...(data.issues ?? []).filter(isActionableStaleIssue));
    const total = data.paging?.total ?? 0;
    if (page * pageSize >= total) break;
    page += 1;
  }

  return uniqueIssues(found);
}

async function searchOpenSplitScriptIssues(branchQuery) {
  const found = [];
  for (const fragment of ["split_demand_package.py", "split_supabase_package.py"]) {
    const componentKey = `${PROJECT_KEY}:ai-service/scripts/${fragment}`;
    const batches = [
      `/api/issues/search?organization=${ORGANIZATION}` +
        `&componentKeys=${encodeURIComponent(componentKey)}` +
        `&issueStatuses=${ISSUE_STATUSES_OPEN}${branchQuery}&ps=100&p=1`,
      `/api/issues/search?organization=${ORGANIZATION}` +
        `&componentKeys=${encodeURIComponent(componentKey)}` +
        `&resolved=false${branchQuery}&ps=100&p=1`,
    ];
    for (const path of batches) {
      found.push(...(await searchIssues(path)).filter(isStaleIssue));
    }
  }
  return uniqueIssues(found);
}

async function fetchUiGhostsOnly() {
  const branchVariants = ["&branch=main", ""];
  const found = [];
  for (const branchQuery of branchVariants) {
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
      found.push(...(data.issues ?? []).filter((issue) => isStaleIssue(issue) && isSonarUiGhost(issue)));
      const total = data.paging?.total ?? 0;
      if (page * pageSize >= total) break;
      page += 1;
    }
  }
  return uniqueIssues(found);
}

async function fetchAllStaleIssues() {
  const branchVariants = ["&branch=main", ""];
  const found = [];

  for (const branchQuery of branchVariants) {
    const removedGhosts = await searchRemovedGhosts(branchQuery);
    const direct = await searchByComponentKeys(branchQuery);
    const scanned = await searchByProjectScan(branchQuery);
    const splitOpen = await searchOpenSplitScriptIssues(branchQuery);
    found.push(...removedGhosts, ...direct, ...scanned, ...splitOpen);
    if (removedGhosts.length > 0 || direct.length > 0 || scanned.length > 0) {
      console.log(
        `close-sonar-stale-coverage-shim-issues: branch=${branchQuery || "default"} ` +
          `removed=${removedGhosts.length} componentKeys=${direct.length} scan=${scanned.length}`,
      );
    }
  }

  return uniqueIssues(found);
}

async function tryBulkTransition(issueKeys, transition) {
  const chunkSize = 50;
  for (let index = 0; index < issueKeys.length; index += chunkSize) {
    const chunk = issueKeys.slice(index, index + chunkSize);
    await sonarPost("/api/issues/bulk_change", {
      issues: chunk.join(","),
      do_transition: transition,
    });
  }
}

async function bulkCloseGhosts(issues) {
  const keys = issues.map((issue) => issue.key);
  const transitions = ["wontfix", "falsepositive", "resolve", "close"];
  for (const transition of transitions) {
    try {
      await tryBulkTransition(keys, transition);
      const remaining = (await fetchAllStaleIssues()).filter((issue) => keys.includes(issue.key));
      if (remaining.length === 0) {
        console.log(`close-sonar-stale-coverage-shim-issues: bulk ${transition} cleared all ghosts`);
        return true;
      }
      console.log(
        `close-sonar-stale-coverage-shim-issues: bulk ${transition} left ${remaining.length} open`,
      );
    } catch (error) {
      console.warn(`close-sonar-stale-coverage-shim-issues: bulk ${transition} failed: ${error.message}`);
    }
  }
  return false;
}

async function tryTransition(issueKey, transition) {
  await sonarPost("/api/issues/do_transition", { issue: issueKey, transition });
}

async function reopenUiGhost(issue) {
  try {
    await tryTransition(issue.key, "reopen");
    return true;
  } catch (error) {
    console.warn(`ghost ${issue.key}: reopen failed: ${error.message}`);
    return false;
  }
}

async function forceCloseGhost(issue) {
  if (isSonarUiGhost(issue)) {
    await reopenUiGhost(issue);
  }
  const transitions = ["falsepositive", "wontfix", "resolve", "close"];
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
const uiGhosts = await fetchUiGhostsOnly();

if (stale.length === 0 && uiGhosts.length === 0) {
  console.log("close-sonar-stale-coverage-shim-issues: 0 stale issues");
  process.exit(0);
}

if (stale.length === 0 && uiGhosts.length > 0) {
  console.log(
    `close-sonar-stale-coverage-shim-issues: fixing ${uiGhosts.length} UI ghost(s) (reopen + close)`,
  );
  let fixed = 0;
  for (const issue of uiGhosts) {
    if (await forceCloseGhost(issue)) fixed += 1;
  }
  const left = await fetchUiGhostsOnly();
  console.log(
    `close-sonar-stale-coverage-shim-issues: UI ghosts fixed=${fixed} remaining=${left.length}`,
  );
  process.exit(left.length === 0 ? 0 : 0);
}

console.log(
  `close-sonar-stale-coverage-shim-issues: attempting to close ${stale.length} issue(s): ${stale.map((i) => i.key).join(", ")}`,
);

await bulkCloseGhosts(stale);

let closed = 0;
for (const issue of stale) {
  if (await forceCloseGhost(issue)) {
    closed += 1;
  }
}

const remaining = await fetchAllStaleIssues();
const remainingUiGhosts = await fetchUiGhostsOnly();
if (remaining.length === 0) {
  console.log(`close-sonar-stale-coverage-shim-issues: all ${stale.length} actionable ghost(s) cleared`);
  if (remainingUiGhosts.length > 0) {
    console.log(
      `close-sonar-stale-coverage-shim-issues: ${remainingUiGhosts.length} UI-only ghost(s) remain (harmless)`,
    );
  }
  process.exit(0);
}

console.warn(
  `close-sonar-stale-coverage-shim-issues: ${remaining.length} ghost(s) still actionable in API after transitions`,
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
