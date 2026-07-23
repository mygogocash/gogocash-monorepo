import {
  appendLine,
  failClosedMain,
  httpsUrl,
  requiredEnv,
} from "./common.mjs";

const API_VERSION = "2022-11-28";
const EXPECTED_WORKFLOW_PATH = ".github/workflows/ci-staging.yml";
const AGGREGATE_GATE_NAME = "CI gate / CI gate (required)";
const APP_GATE_NAME = "CI gate / app (@gogocash/mobile)";
const OTA_SAFETY_GATE_NAME = "OTA-safe runtime payload";
const PER_PAGE = 100;
const MAX_PAGES = 1000;

function positiveRunId(value, label) {
  if (!/^[1-9][0-9]{0,15}$/.test(value)) {
    throw new Error(
      `${label} must be a positive decimal GitHub Actions run ID.`,
    );
  }
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric)) {
    throw new Error(`${label} is outside the safe integer range.`);
  }
  return numeric;
}

function apiBaseUrl() {
  const raw = requiredEnv("GITHUB_API_URL");
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("GITHUB_API_URL is invalid.");
  }
  const localTestAllowed =
    process.env.DEPLOYMENT_VALIDATOR_ALLOW_LOCAL_HTTP === "1" &&
    ["127.0.0.1", "localhost"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !localTestAllowed) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("GITHUB_API_URL is not a trusted API base URL.");
  }
  return url.href.replace(/\/$/, "");
}

async function githubJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${requiredEnv("GH_TOKEN")}`,
      "X-GitHub-Api-Version": API_VERSION,
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub Actions lookup failed: HTTP ${response.status}.`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error("GitHub Actions returned malformed JSON.");
  }
}

async function collectAllPages(baseUrl, itemKey) {
  const collected = [];
  const seenIds = new Set();
  let expectedTotal;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = new URL(baseUrl);
    url.searchParams.set("per_page", String(PER_PAGE));
    url.searchParams.set("page", String(page));
    const payload = await githubJson(url);
    if (!Number.isSafeInteger(payload.total_count) || payload.total_count < 0) {
      throw new Error(`GitHub ${itemKey} response has no valid total_count.`);
    }
    if (expectedTotal === undefined) expectedTotal = payload.total_count;
    if (payload.total_count !== expectedTotal) {
      throw new Error(`GitHub ${itemKey} pagination total changed mid-read.`);
    }
    const items = payload[itemKey];
    if (!Array.isArray(items) || items.length > PER_PAGE) {
      throw new Error(`GitHub ${itemKey} response has an invalid page.`);
    }
    for (const item of items) {
      if (!item || !Number.isSafeInteger(item.id) || item.id <= 0) {
        throw new Error(
          `GitHub ${itemKey} response contains an invalid item ID.`,
        );
      }
      if (seenIds.has(item.id)) {
        throw new Error(
          `GitHub ${itemKey} pagination returned a duplicate item.`,
        );
      }
      seenIds.add(item.id);
      collected.push(item);
    }
    if (collected.length === expectedTotal) return collected;
    if (collected.length > expectedTotal || items.length === 0) {
      throw new Error(
        `GitHub ${itemKey} pagination was incomplete or inconsistent.`,
      );
    }
  }
  throw new Error(
    `GitHub ${itemKey} pagination exceeded the fail-closed limit.`,
  );
}

function validateRun(run, targetSha, repository) {
  if (
    !run ||
    run.path !== EXPECTED_WORKFLOW_PATH ||
    run.event !== "push" ||
    run.head_branch !== "staging" ||
    run.head_sha !== targetSha ||
    run.repository?.full_name !== repository
  ) {
    throw new Error(
      "Selected CI run does not match ci-staging.yml, push, staging, repository, and exact SHA.",
    );
  }
  if (!Number.isSafeInteger(run.id) || run.id <= 0) {
    throw new Error("Selected CI run has no valid run ID.");
  }
  if (!Number.isInteger(run.run_attempt) || run.run_attempt < 1) {
    throw new Error("Selected CI run has no valid run attempt.");
  }
}

function successfulJobForRun(job, run, targetSha) {
  return (
    job.run_id === run.id &&
    job.run_attempt === run.run_attempt &&
    job.head_sha === targetSha &&
    job.head_branch === "staging" &&
    job.status === "completed" &&
    job.conclusion === "success"
  );
}

async function main() {
  const repoParts = requiredEnv("GITHUB_REPOSITORY").split("/");
  if (
    repoParts.length !== 2 ||
    repoParts.some((part) => !/^[A-Za-z0-9_.-]+$/.test(part))
  ) {
    throw new Error("GITHUB_REPOSITORY is unsafe.");
  }
  const repository = repoParts.join("/");
  const repositoryPath = repoParts.map(encodeURIComponent).join("/");
  const targetRef = requiredEnv("TARGET_REF");
  const targetSha = requiredEnv("TARGET_SHA");
  const selectedAction = requiredEnv("SELECTED_ACTION");
  if (!new Set(["build", "update"]).has(selectedAction)) {
    throw new Error("Unsupported staging EAS action.");
  }
  if (targetRef !== "refs/heads/staging") {
    throw new Error(
      `Staging EAS dispatch must run from refs/heads/staging, got ${targetRef}.`,
    );
  }
  if (!/^[0-9a-f]{40}$/.test(targetSha)) {
    throw new Error(
      "github.sha must be a full lowercase 40-character commit SHA.",
    );
  }

  const eventName = requiredEnv("GITHUB_EVENT_NAME");
  if (!new Set(["push", "workflow_dispatch"]).has(eventName)) {
    throw new Error(
      "Staging EAS proof accepts only push or workflow_dispatch.",
    );
  }
  const currentRunId = positiveRunId(
    requiredEnv("CURRENT_RUN_ID"),
    "CURRENT_RUN_ID",
  );
  const requestedRaw = (process.env.EXPECTED_CI_RUN_ID || "").trim();
  const requestedRunId = requestedRaw
    ? positiveRunId(requestedRaw, "ci_run_id")
    : undefined;
  if (eventName === "push" && requestedRunId !== currentRunId) {
    throw new Error(
      "Automatic OTA must prove its exact current ci-staging caller run ID.",
    );
  }

  const base = `${apiBaseUrl()}/repos/${repositoryPath}`;
  let run;
  if (requestedRunId) {
    run = await githubJson(`${base}/actions/runs/${requestedRunId}`);
    if (run.id !== requestedRunId) {
      throw new Error("GitHub returned a different CI run than requested.");
    }
  } else {
    const runsUrl = new URL(`${base}/actions/workflows/ci-staging.yml/runs`);
    runsUrl.searchParams.set("branch", "staging");
    runsUrl.searchParams.set("event", "push");
    runsUrl.searchParams.set("head_sha", targetSha);
    runsUrl.searchParams.set("status", "success");
    const candidates = (await collectAllPages(runsUrl, "workflow_runs"))
      .filter(
        (candidate) =>
          candidate.path === EXPECTED_WORKFLOW_PATH &&
          candidate.event === "push" &&
          candidate.head_branch === "staging" &&
          candidate.head_sha === targetSha &&
          candidate.status === "completed" &&
          candidate.conclusion === "success",
      )
      .sort((left, right) => right.id - left.id);
    if (!candidates.length) {
      throw new Error(
        `No successful ci-staging.yml push run exists for ${targetSha}.`,
      );
    }
    const selectedRunId = candidates[0].id;
    run = await githubJson(`${base}/actions/runs/${selectedRunId}`);
    if (run.id !== selectedRunId) {
      throw new Error("GitHub returned a different CI run than discovered.");
    }
  }

  validateRun(run, targetSha, repository);
  const isCurrentPushRun = eventName === "push" && run.id === currentRunId;
  if (isCurrentPushRun) {
    if (run.status !== "in_progress" || run.conclusion !== null) {
      throw new Error(
        "Current ci-staging caller run is not in the expected in-progress state.",
      );
    }
  } else if (run.status !== "completed" || run.conclusion !== "success") {
    throw new Error("Selected ci-staging run is not completed successfully.");
  }

  const jobs = await collectAllPages(
    `${base}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`,
    "jobs",
  );
  const aggregateGates = jobs.filter((job) => job.name === AGGREGATE_GATE_NAME);
  const appGates = jobs.filter((job) => job.name === APP_GATE_NAME);
  const otaSafetyGates = jobs.filter(
    (job) => job.name === OTA_SAFETY_GATE_NAME,
  );
  if (aggregateGates.length !== 1) {
    throw new Error(
      `Expected exactly one successful aggregate CI gate, found ${aggregateGates.length}.`,
    );
  }
  if (appGates.length !== 1) {
    throw new Error(
      `Expected exactly one successful mobile app CI gate, found ${appGates.length}.`,
    );
  }
  if (!successfulJobForRun(aggregateGates[0], run, targetSha)) {
    throw new Error(
      "The exact aggregate CI gate did not succeed for the selected run attempt and SHA.",
    );
  }
  if (!successfulJobForRun(appGates[0], run, targetSha)) {
    throw new Error(
      "The exact mobile app CI gate did not succeed for the selected run attempt and SHA.",
    );
  }
  if (selectedAction === "update") {
    if (otaSafetyGates.length !== 1) {
      throw new Error(
        `Expected exactly one successful OTA safety gate, found ${otaSafetyGates.length}.`,
      );
    }
    if (!successfulJobForRun(otaSafetyGates[0], run, targetSha)) {
      throw new Error(
        "The exact OTA safety gate did not succeed for the selected run attempt and SHA.",
      );
    }
  }

  const stagingRef = await githubJson(`${base}/git/ref/heads/staging`);
  if (
    stagingRef?.ref !== "refs/heads/staging" ||
    stagingRef.object?.type !== "commit" ||
    stagingRef.object?.sha !== targetSha
  ) {
    throw new Error(
      "Selected EAS commit is no longer the current staging branch head; refusing an out-of-order provider write.",
    );
  }

  const serverOrigin = new URL(requiredEnv("GITHUB_SERVER_URL")).origin;
  const runUrl = httpsUrl(run.html_url, "CI run URL", serverOrigin);
  const aggregateUrl = httpsUrl(
    aggregateGates[0].html_url,
    "Aggregate CI gate URL",
    serverOrigin,
  );
  const appUrl = httpsUrl(
    appGates[0].html_url,
    "Mobile app CI gate URL",
    serverOrigin,
  );
  appendLine(
    requiredEnv("GITHUB_STEP_SUMMARY"),
    `CI proof: [ci-staging run ${run.id}](${runUrl}) / [aggregate gate](${aggregateUrl}) / [mobile app gate](${appUrl}) for \`${targetSha}\` attempt \`${run.run_attempt}\`.`,
  );
}

failClosedMain(main);
