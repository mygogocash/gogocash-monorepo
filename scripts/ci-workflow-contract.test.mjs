import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workflowPath = resolve(repoRoot, ".github/workflows/ci.yml");
const workflowSource = readFileSync(workflowPath, "utf8");
const cleanRunnerWorkflowPath = resolve(
  repoRoot,
  ".github/workflows/e2e-clean-runner.yml",
);
const cleanRunnerWorkflowSource = existsSync(cleanRunnerWorkflowPath)
  ? readFileSync(cleanRunnerWorkflowPath, "utf8")
  : "";
const weeklyE2eWorkflowSource = readFileSync(
  resolve(repoRoot, ".github/workflows/e2e-weekly.yml"),
  "utf8",
);
const questTaskE2eSource = readFileSync(
  resolve(repoRoot, "apps/api/test/quest-task-progress.e2e-spec.ts"),
  "utf8",
);
const ciStagingSource = readFileSync(
  resolve(repoRoot, ".github/workflows/ci-staging.yml"),
  "utf8",
);
const obsoleteAutoOtaPath = resolve(
  repoRoot,
  ".github/workflows/app-ota-staging.yml",
);
const legacyGcpOneShotWorkflowPaths = [
  ".github/workflows/deploy-api-staging.yml",
  ".github/workflows/deploy-admin-staging.yml",
  ".github/workflows/deploy-app-web-staging.yml",
].map((path) => resolve(repoRoot, path));
const buildStagingSource = readFileSync(
  resolve(repoRoot, ".github/workflows/build-staging.yml"),
  "utf8",
);
const buildPushSource = readFileSync(
  resolve(repoRoot, ".github/workflows/_build-push.yml"),
  "utf8",
);
const releaseStagingSource = readFileSync(
  resolve(repoRoot, ".github/workflows/release-staging.yml"),
  "utf8",
);
const deployCloudRunSource = readFileSync(
  resolve(repoRoot, ".github/workflows/_deploy-cloudrun.yml"),
  "utf8",
);
const easDeploySource = readFileSync(
  resolve(repoRoot, ".github/workflows/deploy-app-native-eas.yml"),
  "utf8",
);
const easPreviewWorkflowSource = readFileSync(
  resolve(repoRoot, "apps/app/.eas/workflows/build-preview-android.yml"),
  "utf8",
);
const artifactCleanupPolicies = JSON.parse(
  readFileSync(
    resolve(repoRoot, "scripts/gcp/artifact-registry-cleanup-policy.json"),
    "utf8",
  ),
);
const easJson = JSON.parse(
  readFileSync(resolve(repoRoot, "apps/app/eas.json"), "utf8"),
);
const packageJson = JSON.parse(
  readFileSync(resolve(repoRoot, "package.json"), "utf8"),
);
const SETUP_NODE_ACTION =
  "actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e";

function indentation(line) {
  return line.match(/^ */)?.[0].length ?? 0;
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseJobs(source) {
  const lines = source.split(/\r?\n/);
  const jobsLine = lines.findIndex((line) => line === "jobs:");
  assert.notEqual(jobsLine, -1, "workflow must contain a top-level jobs map");

  const jobs = new Map();
  let current = null;
  for (let index = jobsLine + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line && indentation(line) === 0 && !line.startsWith("#")) break;

    const header = /^  ([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (header) {
      current = { id: header[1], lines: [] };
      jobs.set(current.id, current);
      continue;
    }
    current?.lines.push(line);
  }
  return jobs;
}

function readField(lines, fieldIndent, key) {
  const prefix = `${" ".repeat(fieldIndent)}${key}:`;
  const index = lines.findIndex((line) => line.startsWith(prefix));
  if (index === -1) return undefined;

  const first = lines[index].slice(prefix.length).trim();
  if (!first || /^(?:\||>)[+-]?$/.test(first)) {
    const body = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const line = lines[cursor];
      if (line.trim() && indentation(line) <= fieldIndent) break;
      body.push(line);
    }
    const nonEmpty = body.filter((line) => line.trim());
    const bodyIndent = nonEmpty.length
      ? Math.min(...nonEmpty.map(indentation))
      : fieldIndent + 2;
    const dedented = body.map((line) => line.slice(bodyIndent));
    return first.startsWith(">")
      ? dedented
          .map((line) => line.trim())
          .filter(Boolean)
          .join(" ")
      : dedented.join("\n").trimEnd();
  }
  return unquote(first);
}

function parseNeeds(value) {
  assert.ok(value, "job must declare needs");
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => unquote(item))
      .filter(Boolean);
  }
  if (trimmed.includes("\n")) {
    return trimmed
      .split("\n")
      .map((line) => /^-\s+(.+)$/.exec(line.trim())?.[1])
      .filter(Boolean)
      .map(unquote);
  }
  return [unquote(trimmed)];
}

function parseSteps(job) {
  const start = job.lines.findIndex((line) => line === "    steps:");
  if (start === -1) return [];

  const chunks = [];
  let current = null;
  for (let index = start + 1; index < job.lines.length; index += 1) {
    const line = job.lines[index];
    if (line.trim() && indentation(line) <= 4) break;
    if (/^      - /.test(line)) {
      current = [line.replace(/^      - /, "        ")];
      chunks.push(current);
    } else {
      current?.push(line);
    }
  }

  return chunks.map((lines) => ({
    lines,
    name: readField(lines, 8, "name"),
    id: readField(lines, 8, "id"),
    if: readField(lines, 8, "if"),
    uses: readField(lines, 8, "uses"),
    run: readField(lines, 8, "run"),
    continueOnError: readField(lines, 8, "continue-on-error"),
  }));
}

function assertPinnedNode24BeforeRun(job, expectedRun, label) {
  const steps = parseSteps(job);
  const setupSteps = steps
    .map((step, index) => ({ index, step }))
    .filter(({ step }) => step.uses?.startsWith("actions/setup-node@"));
  assert.equal(setupSteps.length, 1, `${label} must setup Node exactly once`);
  assert.equal(
    setupSteps[0].step.uses.split(/\s+#/u, 1)[0],
    SETUP_NODE_ACTION,
    `${label} must pin actions/setup-node by commit`,
  );
  assert.equal(
    parseNestedMapping(setupSteps[0].step.lines, 8, "with").get("node-version"),
    "24",
    `${label} must select Node 24 explicitly`,
  );
  const commandIndex = steps.findIndex((step) => step.run === expectedRun);
  assert.notEqual(commandIndex, -1, `${label} must run ${expectedRun}`);
  assert.ok(
    setupSteps[0].index < commandIndex,
    `${label} must setup Node 24 before its Node command`,
  );
}

function parseOutputs(job) {
  const outputsStart = job.lines.findIndex((line) => line === "    outputs:");
  const outputs = new Map();
  if (outputsStart === -1) return outputs;

  for (let index = outputsStart + 1; index < job.lines.length; index += 1) {
    const line = job.lines[index];
    if (line.trim() && indentation(line) <= 4) break;
    const match = /^      ([A-Za-z0-9_-]+):\s*(.+)$/.exec(line);
    if (match) outputs.set(match[1], unquote(match[2]));
  }
  return outputs;
}

function parseNestedMapping(lines, parentIndent, key) {
  const start = lines.findIndex(
    (line) => line === `${" ".repeat(parentIndent)}${key}:`,
  );
  const values = new Map();
  if (start === -1) return values;

  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && indentation(line) <= parentIndent) break;
    const match = new RegExp(
      `^${" ".repeat(parentIndent + 2)}([A-Za-z0-9_-]+):\\s*(.+)$`,
    ).exec(line);
    if (match) values.set(match[1], unquote(match[2]));
  }
  return values;
}

function parsePathFilters(changesJob) {
  const markerIndex = changesJob.lines.findIndex((line) =>
    /^\s+filters:\s*\|[-+]?\s*$/.test(line),
  );
  assert.notEqual(markerIndex, -1, "changes job must define path filters");
  const markerIndent = indentation(changesJob.lines[markerIndex]);
  const block = [];
  for (
    let index = markerIndex + 1;
    index < changesJob.lines.length;
    index += 1
  ) {
    const line = changesJob.lines[index];
    if (line.trim() && indentation(line) <= markerIndent) break;
    block.push(line);
  }
  const nonEmpty = block.filter((line) => line.trim());
  const blockIndent = Math.min(...nonEmpty.map(indentation));
  const filters = new Map();
  let current = null;
  for (const rawLine of block) {
    const line = rawLine.slice(blockIndent);
    const key = /^([A-Za-z0-9_-]+):(?:\s*&[A-Za-z0-9_-]+)?\s*$/.exec(line);
    if (key) {
      current = [];
      filters.set(key[1], current);
      continue;
    }
    const entry = /^  -\s+(.+)$/.exec(line);
    if (entry && current) current.push(unquote(entry[1]));
  }
  return filters;
}

function runValidator(relativePath, env = {}, args = []) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      process.execPath,
      [resolve(repoRoot, relativePath), ...args],
      {
        cwd: repoRoot,
        env: { ...process.env, ...env },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", rejectPromise);
    child.on("close", (code, signal) => {
      resolvePromise({ code, signal, stderr, stdout });
    });
  });
}

async function withFixtureDirectory(callback) {
  const directory = mkdtempSync(join(tmpdir(), "gogocash-workflow-contract-"));
  try {
    return await callback(directory);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

function validatorOutput(result) {
  return `${result.stdout}${result.stderr}`;
}

function assertValidatorSuccess(result) {
  assert.equal(result.code, 0, validatorOutput(result));
  assert.equal(result.signal, null, validatorOutput(result));
}

function assertValidatorFailure(result) {
  assert.notEqual(result.code, 0, validatorOutput(result));
}

async function withGithubApi(fixture, callback) {
  const requests = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    requests.push(`${url.pathname}${url.search}`);
    response.setHeader("content-type", "application/json");

    const page = Number(url.searchParams.get("page") || "1");
    const perPage = Number(url.searchParams.get("per_page") || "100");
    const paginate = (items) =>
      items.slice((page - 1) * perPage, page * perPage);
    if (fixture.responseOverride) {
      const overridden = fixture.responseOverride(url);
      if (overridden) {
        response.statusCode = overridden.status || 200;
        response.end(JSON.stringify(overridden.body));
        return;
      }
    }
    if (/\/actions\/workflows\/ci-staging\.yml\/runs$/.test(url.pathname)) {
      const runs = fixture.workflowRuns || [];
      response.end(
        JSON.stringify({
          total_count: fixture.workflowRunsTotal ?? runs.length,
          workflow_runs: paginate(runs),
        }),
      );
      return;
    }
    if (/\/actions\/runs\/\d+$/.test(url.pathname)) {
      response.end(JSON.stringify(fixture.run));
      return;
    }
    if (/\/actions\/runs\/\d+\/attempts\/\d+\/jobs$/.test(url.pathname)) {
      const jobs = fixture.jobs || [];
      response.end(
        JSON.stringify({
          total_count: fixture.jobsTotal ?? jobs.length,
          jobs: paginate(jobs),
        }),
      );
      return;
    }
    if (/\/git\/ref\/heads\/staging$/.test(url.pathname)) {
      response.end(
        JSON.stringify({
          object: {
            sha: fixture.refSha || fixture.run?.head_sha,
            type: "commit",
          },
          ref: "refs/heads/staging",
        }),
      );
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ message: "not found" }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    return await callback(`http://127.0.0.1:${address.port}`, requests);
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}

function dispatchInputBlock(source, inputName) {
  const lines = source.split(/\r?\n/);
  const header = `      ${inputName}:`;
  const start = lines.findIndex((line) => line === header);
  assert.notEqual(
    start,
    -1,
    `workflow_dispatch input ${inputName} is required`,
  );

  const block = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && indentation(line) <= 6) break;
    block.push(line);
  }
  return block;
}

function dispatchChoiceOptions(source, inputName) {
  const block = dispatchInputBlock(source, inputName);
  const optionsStart = block.findIndex((line) => line === "        options:");
  assert.notEqual(
    optionsStart,
    -1,
    `workflow_dispatch input ${inputName} must define choices`,
  );
  return block
    .slice(optionsStart + 1)
    .map((line) => /^          -\s+(.+)$/.exec(line)?.[1])
    .filter(Boolean)
    .map(unquote);
}

function dispatchInputField(source, inputName, field) {
  return readField(dispatchInputBlock(source, inputName), 8, field);
}

const requiredGateNeeds = [
  "changes",
  "admin",
  "app",
  "api-lint",
  "api-test",
  "api-build-smoke",
  "e2e-root",
  "gototrack",
  "gototrack-mcp",
  "knip",
  "workflow-contract",
];

const jobs = parseJobs(workflowSource);

test("root exposes the dependency-free workflow contract", () => {
  assert.equal(
    packageJson.scripts?.["test:workflow-contracts"],
    "node --test scripts/ci-workflow-contract.test.mjs scripts/dependency-hygiene.test.mjs",
  );
});

test("required CI calls the exact-SHA clean runner for cross-surface changes", () => {
  const changes = jobs.get("changes");
  assert.ok(changes, "changes job is required");
  assert.equal(
    parseOutputs(changes).get("e2e"),
    "${{ steps.filter.outputs.e2e }}",
  );
  const filters = parsePathFilters(changes);
  assert.deepEqual(
    new Set(filters.get("root")),
    new Set([
      "package.json",
      "package-lock.json",
      "turbo.json",
      ".nvmrc",
      ".npmrc",
      ".github/workflows/ci.yml",
      ".github/workflows/ci-staging.yml",
      ".github/actions/**",
    ]),
  );
  assert.deepEqual(
    new Set(filters.get("e2e")),
    new Set([
      "*root",
      ".github/workflows/e2e-clean-runner.yml",
      ".github/workflows/e2e-weekly.yml",
      "docker-compose.e2e.yml",
      "e2e/**",
      "scripts/e2e-*.sh",
      "apps/api/**",
      "apps/admin/**",
      "apps/app/**",
    ]),
  );
  const e2e = jobs.get("e2e-root");
  assert.ok(e2e, "e2e-root job is required");
  assert.deepEqual(parseNeeds(readField(e2e.lines, 4, "needs")), ["changes"]);
  assert.equal(
    readField(e2e.lines, 4, "if"),
    "${{ needs.changes.outputs.e2e == 'true' }}",
  );
  assert.equal(
    readField(e2e.lines, 4, "uses"),
    "./.github/workflows/e2e-clean-runner.yml",
  );
  assert.equal(
    parseNestedMapping(e2e.lines, 4, "with").get("candidate_sha"),
    "${{ github.event.pull_request.head.sha || github.sha }}",
  );
});

test("clean runner validates and executes the full root E2E harness", () => {
  assert.ok(cleanRunnerWorkflowSource, "clean-runner workflow must exist");
  assert.match(cleanRunnerWorkflowSource, /^name: E2E clean runner$/m);
  assert.match(cleanRunnerWorkflowSource, /^  workflow_call:$/m);
  assert.match(cleanRunnerWorkflowSource, /^  workflow_dispatch:$/m);
  assert.equal(
    dispatchInputField(cleanRunnerWorkflowSource, "candidate_sha", "required"),
    "true",
  );

  const cleanRunnerJobs = parseJobs(cleanRunnerWorkflowSource);
  const rootE2e = cleanRunnerJobs.get("root-e2e");
  assert.ok(rootE2e, "clean runner must define root-e2e");
  assert.equal(readField(rootE2e.lines, 4, "name"), "Root E2E (exact SHA)");
  assert.equal(readField(rootE2e.lines, 4, "runs-on"), "ubuntu-latest");
  assert.equal(readField(rootE2e.lines, 4, "timeout-minutes"), "75");

  const steps = parseSteps(rootE2e);
  const checkout = steps.find((step) =>
    step.uses?.startsWith("actions/checkout@"),
  );
  assert.ok(checkout, "clean runner must checkout the candidate");
  assert.equal(
    checkout.uses.split(/\s+#/u, 1)[0],
    "actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0",
  );
  assert.equal(
    parseNestedMapping(checkout.lines, 8, "with").get("ref"),
    "${{ inputs.candidate_sha }}",
  );
  const verify = steps.find(
    (step) => step.name === "Verify exact candidate SHA",
  );
  assert.match(verify?.run ?? "", /git rev-parse HEAD/);
  assert.match(verify?.run ?? "", /EXPECTED_SHA/);

  const browserInstall = steps.find(
    (step) => step.run === "npx playwright install --with-deps chromium webkit",
  );
  assert.ok(
    browserInstall,
    "clean runner must install both exercised browsers",
  );
  const run = steps.find((step) => step.run === "npm run e2e");
  assert.ok(run, "clean runner must invoke the root E2E harness");
  assert.ok(
    run.continueOnError === undefined || run.continueOnError === "false",
    "root E2E must be blocking",
  );
  assert.doesNotMatch(
    cleanRunnerWorkflowSource,
    /run: npm run test:e2e -w gogocash-api/,
    "API-only E2E is not a substitute for the root harness",
  );

  const cleanup = steps.find((step) => step.name === "Clean E2E resources");
  assert.equal(cleanup?.if, "${{ always() }}");
  assert.match(cleanup?.run ?? "", /e2e:stack:stop/);
  assert.match(
    cleanup?.run ?? "",
    /docker compose .* down -v --remove-orphans/,
  );
  const composeProjectName =
    "gogocash_e2e_${{ github.run_id }}_${{ github.run_attempt }}";
  assert.equal(
    parseNestedMapping(run.lines, 8, "env").get("COMPOSE_PROJECT_NAME"),
    composeProjectName,
    "root E2E must namespace its compose resources",
  );
  assert.equal(
    parseNestedMapping(cleanup?.lines ?? [], 8, "env").get(
      "COMPOSE_PROJECT_NAME",
    ),
    composeProjectName,
    "cleanup must remove the same compose project used by root E2E",
  );
});

test("weekly E2E reuses the exact-SHA clean runner", () => {
  const weeklyJobs = parseJobs(weeklyE2eWorkflowSource);
  const e2e = weeklyJobs.get("e2e");
  assert.ok(e2e, "weekly workflow must define e2e");
  assert.equal(
    readField(e2e.lines, 4, "uses"),
    "./.github/workflows/e2e-clean-runner.yml",
  );
  assert.equal(
    parseNestedMapping(e2e.lines, 4, "with").get("candidate_sha"),
    "${{ github.sha }}",
  );
});

test("admin lint is a blocking lint:ci step", () => {
  const admin = jobs.get("admin");
  assert.ok(admin, "admin job is required");
  const lint = parseSteps(admin).find(
    (step) => step.run === "npm run lint:ci -w gogocash-admin",
  );
  assert.ok(lint, "admin job must run the workspace lint:ci contract");
  assert.ok(
    lint.continueOnError === undefined || lint.continueOnError === "false",
    "admin lint must not continue on error",
  );
});

test("required API gate provisions pinned rs0 and executes quest task-v2 proof", () => {
  const apiBuild = jobs.get("api-build-smoke");
  assert.ok(apiBuild, "api-build-smoke job is required");
  const steps = parseSteps(apiBuild);
  const startIndex = steps.findIndex(
    (step) => step.name === "Start isolated Mongo rs0 for quest task-v2",
  );
  const proofIndex = steps.findIndex(
    (step) => step.name === "Quest task-v2 real Mongo rs0 (required)",
  );
  const cleanupIndex = steps.findIndex(
    (step) => step.name === "Stop isolated Mongo rs0 for quest task-v2",
  );
  assert.ok(startIndex >= 0, "required API gate must start an isolated rs0");
  assert.ok(
    proofIndex > startIndex,
    "quest rs0 proof must follow provisioning",
  );
  assert.ok(
    cleanupIndex > proofIndex,
    "quest rs0 cleanup must follow the required proof",
  );

  const startRun = steps[startIndex].run ?? "";
  assert.match(startRun, /docker run --detach/);
  assert.match(startRun, /--publish 27019:27019/);
  assert.match(startRun, /mongo:8\.0\.4/);
  assert.doesNotMatch(startRun, /mongo:(?:latest|8)(?:\s|\\|$)/);
  assert.match(startRun, /--replSet rs0 --bind_ip_all --port 27019/);
  assert.match(startRun, /rs\.initiate/);
  assert.match(startRun, /seq 1 30/);
  assert.match(startRun, /PRIMARY/);

  const proof = steps[proofIndex];
  assert.equal(
    proof.run,
    "npm run test:e2e -w gogocash-api -- --runInBand test/quest-task-progress.e2e-spec.ts",
  );
  assert.ok(
    proof.continueOnError === undefined || proof.continueOnError === "false",
    "quest rs0 proof must be blocking",
  );
  const proofEnv = parseNestedMapping(proof.lines, 8, "env");
  assert.equal(proofEnv.get("MONGO_REPLICA_SET"), "1");
  assert.equal(
    proofEnv.get("MONGO_URI"),
    "mongodb://localhost:27019/quest-task-ci?replicaSet=rs0",
  );

  const cleanup = steps[cleanupIndex];
  assert.equal(readField(cleanup.lines, 8, "if"), "${{ always() }}");
  assert.match(cleanup.run ?? "", /docker rm --force/);
  assert.match(
    questTaskE2eSource,
    /MONGO_REPLICA_SET=1 requires a loopback[\s\S]*refusing to skip required rs0 proof/,
  );
});

test("workflow-contract changes are path-filtered into their own job", () => {
  const changes = jobs.get("changes");
  assert.ok(changes, "changes job is required");
  assert.equal(
    parseOutputs(changes).get("workflow_contract"),
    "${{ steps.filter.outputs.workflow_contract }}",
  );

  const filters = parsePathFilters(changes);
  assert.deepEqual(
    new Set(filters.get("workflow_contract")),
    new Set([
      ".github/workflows/**",
      "apps/app/.eas/workflows/**",
      "apps/app/eas.json",
      "scripts/ci-workflow-contract.test.mjs",
      "scripts/deployment/**",
      "scripts/gcp/artifact-registry-cleanup-policy.json",
      "package.json",
    ]),
  );

  const contractJob = jobs.get("workflow-contract");
  assert.ok(contractJob, "workflow-contract job is required");
  assert.deepEqual(parseNeeds(readField(contractJob.lines, 4, "needs")), [
    "changes",
  ]);
  assert.equal(
    readField(contractJob.lines, 4, "if"),
    "${{ needs.changes.outputs.workflow_contract == 'true' }}",
  );
  assert.ok(
    parseSteps(contractJob).some(
      (step) => step.run === "npm run test:workflow-contracts",
    ),
    "workflow-contract job must execute the root contract script",
  );
  assertPinnedNode24BeforeRun(
    contractJob,
    "npm run test:workflow-contracts",
    "workflow-contract job",
  );
});

test("Expo EAS workflows are manual-only and validated by the required workflow gate", () => {
  assert.match(
    easPreviewWorkflowSource,
    /^on:\n  workflow_dispatch: \{\}$/m,
    "the preview Android workflow must use Expo's explicit manual-trigger object",
  );
  assert.doesNotMatch(
    easPreviewWorkflowSource,
    /^  (?:push|pull_request|schedule):/m,
    "the preview Android build must not gain an automatic trigger",
  );
  assert.equal(
    packageJson.scripts?.["validate:eas-workflows"],
    "cd apps/app && npx --yes eas-cli@21.0.1 workflow:validate .eas/workflows/build-preview-android.yml --non-interactive",
  );

  const contractJob = jobs.get("workflow-contract");
  assert.ok(contractJob, "workflow-contract job is required");
  const validation = parseSteps(contractJob).find(
    (step) => step.name === "Validate Expo EAS workflow schema",
  );
  assert.ok(
    validation,
    "workflow-contract must validate Expo EAS workflow YAML",
  );
  assert.equal(validation.run, "npm run validate:eas-workflows");
  assert.ok(
    validation.continueOnError === undefined ||
      validation.continueOnError === "false",
    "EAS workflow schema validation must be blocking",
  );
  assertPinnedNode24BeforeRun(
    contractJob,
    "npm run validate:eas-workflows",
    "workflow-contract job",
  );
});

test("workflow-contract permanently lints every workflow with pinned Actionlint", () => {
  const contractJob = jobs.get("workflow-contract");
  assert.ok(contractJob, "workflow-contract job is required");

  const actionlint = parseSteps(contractJob).find(
    (step) => step.name === "Actionlint all workflows (pinned 1.7.12)",
  );
  assert.ok(actionlint, "workflow-contract job must run Actionlint");
  assert.ok(
    actionlint.continueOnError === undefined ||
      actionlint.continueOnError === "false",
    "Actionlint must be blocking",
  );

  const run = actionlint.run ?? "";
  assert.match(
    run,
    /rhysd\/actionlint:1\.7\.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667/,
    "Actionlint must be immutable by version and digest",
  );
  assert.match(run, /find\s+\.github\/workflows\s+-maxdepth\s+1\s+-type\s+f/);
  assert.match(run, /-name\s+['"]\*\.yml['"]/);
  assert.match(run, /-name\s+['"]\*\.yaml['"]/);
  assert.match(run, /-print0\s*\|\s*xargs\s+-0\s+docker\s+run\s+--rm/);
  assert.match(run, /-v\s+"\$PWD:\/repo"/);
  assert.match(run, /-w\s+\/repo/);
});

test("every skippable required job is gated only by its change-filter output", () => {
  const expectedConditions = new Map([
    ["admin", "${{ needs.changes.outputs.admin == 'true' }}"],
    ["app", "${{ needs.changes.outputs.app == 'true' }}"],
    ["api-lint", "${{ needs.changes.outputs.api == 'true' }}"],
    ["api-test", "${{ needs.changes.outputs.api == 'true' }}"],
    ["api-build-smoke", "${{ needs.changes.outputs.api == 'true' }}"],
    ["e2e-root", "${{ needs.changes.outputs.e2e == 'true' }}"],
    [
      "gototrack",
      "${{ needs.changes.outputs.api == 'true' || needs.changes.outputs.app == 'true' }}",
    ],
    ["gototrack-mcp", "${{ needs.changes.outputs.mcp == 'true' }}"],
    ["knip", "${{ needs.changes.outputs.knip == 'true' }}"],
    [
      "workflow-contract",
      "${{ needs.changes.outputs.workflow_contract == 'true' }}",
    ],
  ]);

  for (const [jobId, expectedIf] of expectedConditions) {
    const job = jobs.get(jobId);
    assert.ok(job, `${jobId} job is required`);
    assert.deepEqual(parseNeeds(readField(job.lines, 4, "needs")), ["changes"]);
    assert.equal(readField(job.lines, 4, "if"), expectedIf);
  }
});

test("required CI gate accepts only success or legitimate path-filter skips", async () => {
  const gate = jobs.get("ci-gate");
  assert.ok(gate, "ci-gate job is required");
  assert.equal(readField(gate.lines, 4, "name"), "CI gate (required)");
  assert.deepEqual(
    new Set(parseNeeds(readField(gate.lines, 4, "needs"))),
    new Set(requiredGateNeeds),
  );
  assert.ok(
    !parseNeeds(readField(gate.lines, 4, "needs")).includes("e2e-local"),
    "manual optional E2E must not block the required gate",
  );
  assert.equal(readField(gate.lines, 4, "if"), "${{ always() }}");

  const gateStep = parseSteps(gate).find(
    (step) => step.run === "node scripts/deployment/ci-required-gate.mjs",
  );
  assert.ok(gateStep, "required gate must run the tested needs evaluator");
  assert.equal(
    parseNestedMapping(gateStep.lines, 8, "env").get("NEEDS_JSON"),
    "${{ toJSON(needs) }}",
  );
  assertPinnedNode24BeforeRun(
    gate,
    "node scripts/deployment/ci-required-gate.mjs",
    "aggregate CI gate",
  );
  assert.deepEqual(
    parseSteps(gate)
      .filter((step) => step.run)
      .map((step) => step.run),
    ["node scripts/deployment/ci-required-gate.mjs"],
    "aggregate CI gate must run only the dedicated needs validator",
  );
  assert.doesNotMatch(
    gate.lines.join("\n"),
    /ci-workflow-contract\.test\.mjs|--assert-needs|test:workflow-contracts/,
  );

  const allSuccess = Object.fromEntries(
    requiredGateNeeds.map((job) => [job, { result: "success" }]),
  );
  const execute = (needsJson) =>
    runValidator("scripts/deployment/ci-required-gate.mjs", {
      NEEDS_JSON:
        typeof needsJson === "string" ? needsJson : JSON.stringify(needsJson),
    });
  assertValidatorSuccess(await execute(allSuccess));
  for (const job of requiredGateNeeds.slice(1)) {
    assertValidatorSuccess(
      await execute({ ...allSuccess, [job]: { result: "skipped" } }),
    );
  }
  assertValidatorFailure(
    await execute({ ...allSuccess, changes: { result: "skipped" } }),
  );
  for (const job of requiredGateNeeds) {
    for (const result of ["failure", "cancelled"]) {
      assertValidatorFailure(
        await execute({ ...allSuccess, [job]: { result } }),
      );
    }
  }
  const missing = { ...allSuccess };
  delete missing.knip;
  assertValidatorFailure(await execute(missing));
  assertValidatorFailure(
    await execute({ ...allSuccess, unexpected: { result: "success" } }),
  );
  for (const malformed of ["not-json", "null", "[]"]) {
    assertValidatorFailure(await execute(malformed));
  }
});

test("manual GCP build selection is CI-gated and independent of path filters", () => {
  assert.deepEqual(dispatchChoiceOptions(buildStagingSource, "app"), [
    "api",
    "admin",
    "app-web",
    "all",
  ]);

  const buildJobs = parseJobs(buildStagingSource);
  const preflight = buildJobs.get("preflight");
  assert.ok(preflight, "manual GCP build must reject unreviewed refs first");
  const preflightRun = parseSteps(preflight).find(
    (step) => step.name === "Require reviewed main branch",
  )?.run;
  assert.match(preflightRun ?? "", /TARGET_REF/);
  assert.match(preflightRun ?? "", /refs\/heads\/main/);

  const ci = buildJobs.get("ci");
  assert.ok(ci, "manual GCP build must call the reusable CI workflow");
  assert.equal(readField(ci.lines, 4, "uses"), "./.github/workflows/ci.yml");
  assert.deepEqual(parseNeeds(readField(ci.lines, 4, "needs")), ["preflight"]);

  for (const [jobId, app] of [
    ["build-api", "api"],
    ["build-admin", "admin"],
    ["build-app-web", "app-web"],
  ]) {
    const job = buildJobs.get(jobId);
    assert.ok(job, `${jobId} is required`);
    const condition = readField(job.lines, 4, "if") ?? "";
    assert.match(condition, /needs\.ci\.result == 'success'/);
    assert.match(condition, new RegExp(`inputs\\.app == '${app}'`));
    assert.match(condition, /inputs\.app == 'all'/);
    assert.doesNotMatch(condition, /needs\.ci\.outputs/);
  }

  const summary = buildJobs.get("build-summary");
  assert.ok(summary, "build selection needs a fail-closed summary job");
  assert.equal(readField(summary.lines, 4, "if"), "${{ always() }}");
  const run = parseSteps(summary).find(
    (step) => step.name === "Require every selected image build",
  )?.run;
  assert.equal(run, "node scripts/deployment/gcp-build-summary.mjs");
  assert.equal(
    parseOutputs(summary).get("image_digests"),
    "${{ steps.summary.outputs.image_digests }}",
  );
});

test("GCP builds expose an exact full commit SHA and build-reported digest", () => {
  assert.match(buildPushSource, /environment:\s+staging/);
  assert.match(buildPushSource, /\^\[0-9a-f\]\{40\}\$/);
  assert.match(buildPushSource, /--tag "\$IMAGE:\$IMAGE_SHA"/);
  assert.match(buildPushSource, /docker push "\$IMAGE:\$IMAGE_SHA"/);
  assert.match(buildPushSource, /image_sha:\s+\$\{\{/);
  assert.match(buildPushSource, /image_uri:\s+\$\{\{/);
  assert.match(buildPushSource, /image_digest:\s+\$\{\{/);
  assert.match(buildPushSource, /GITHUB_STEP_SUMMARY/);
});

test("manual GCP release consumes an exact SHA plus selected digest map and cannot skip all", () => {
  assert.deepEqual(dispatchChoiceOptions(releaseStagingSource, "app"), [
    "api",
    "admin",
    "app-web",
    "all",
  ]);
  assert.equal(
    dispatchInputField(releaseStagingSource, "image_sha", "default"),
    undefined,
  );
  assert.equal(
    readField(
      dispatchInputBlock(releaseStagingSource, "image_sha"),
      8,
      "required",
    ),
    "true",
  );
  assert.equal(
    readField(
      dispatchInputBlock(releaseStagingSource, "image_digests"),
      8,
      "required",
    ),
    "true",
  );
  assert.doesNotMatch(releaseStagingSource, /fromJSON\s*\(/);
  assert.doesNotMatch(releaseStagingSource, /staging-candidate/);

  const releaseJobs = parseJobs(releaseStagingSource);
  const preflight = releaseJobs.get("preflight");
  assert.ok(preflight, "manual GCP release must reject unreviewed refs first");
  const preflightRun = parseSteps(preflight).find(
    (step) => step.name === "Require reviewed main branch and exact digest map",
  )?.run;
  assert.equal(preflightRun, "node scripts/deployment/gcp-release-input.mjs");

  for (const [jobId, app, digestOutput] of [
    ["release-api", "api", "api_digest"],
    ["release-admin", "admin", "admin_digest"],
    ["release-app-web", "app-web", "app_web_digest"],
  ]) {
    const job = releaseJobs.get(jobId);
    assert.ok(job, `${jobId} is required`);
    assert.deepEqual(parseNeeds(readField(job.lines, 4, "needs")), [
      "preflight",
    ]);
    const condition = readField(job.lines, 4, "if") ?? "";
    assert.match(condition, /needs\.preflight\.result == 'success'/);
    assert.match(condition, new RegExp(`inputs\\.app == '${app}'`));
    assert.match(condition, /inputs\.app == 'all'/);
    assert.match(
      job.lines.join("\n"),
      /image_sha:\s+\$\{\{ inputs\.image_sha \}\}/,
    );
    assert.match(
      job.lines.join("\n"),
      new RegExp(
        `expected_digest:\\s+\\$\\{\\{ needs\\.preflight\\.outputs\\.${digestOutput} \\}\\}`,
      ),
    );
  }

  const summary = releaseJobs.get("release-summary");
  assert.ok(summary, "release selection needs a fail-closed summary job");
  assert.equal(readField(summary.lines, 4, "if"), "${{ always() }}");
  const run = parseSteps(summary).find(
    (step) => step.name === "Require every selected Cloud Run release",
  )?.run;
  assert.equal(run, "node scripts/deployment/gcp-release-summary.mjs");
});

test("Cloud Run release requires the SHA tag to match the build-reported digest", () => {
  assert.match(deployCloudRunSource, /environment:\s+staging/);
  assert.match(deployCloudRunSource, /node-version:\s+"24"/);
  assert.match(
    deployCloudRunSource,
    /run: node scripts\/deployment\/gcp-image-proof\.mjs/,
  );
  assert.match(deployCloudRunSource, /--image "\$DEPLOY_IMAGE"/);
  assert.doesNotMatch(deployCloudRunSource, /staging-candidate|:latest/);
  assert.match(deployCloudRunSource, /image_sha:\s+\$\{\{/);
  assert.match(deployCloudRunSource, /image_digest:\s+\$\{\{/);
  assert.match(deployCloudRunSource, /service_url:\s+\$\{\{/);
});

test("PR-B retires one-shot GCP staging deploy workflows", () => {
  for (const workflowPath of legacyGcpOneShotWorkflowPaths) {
    assert.equal(
      existsSync(workflowPath),
      false,
      `${workflowPath} must stay deleted after PR-B retirement (#52)`,
    );
  }
});

test("staging app OTA is sequenced behind the exact successful app CI gate", () => {
  assert.equal(
    existsSync(obsoleteAutoOtaPath),
    false,
    "the standalone push-triggered OTA workflow must stay deleted",
  );
  const stagingJobs = parseJobs(ciStagingSource);
  const otaSafety = stagingJobs.get("ota-safety");
  assert.ok(otaSafety, "ci-staging must materialize an exact OTA safety job");
  assert.equal(
    readField(otaSafety.lines, 4, "name"),
    "OTA-safe runtime payload",
  );
  assert.deepEqual(parseNeeds(readField(otaSafety.lines, 4, "needs")), ["ci"]);
  assert.equal(
    readField(otaSafety.lines, 4, "if"),
    "${{ needs.ci.result == 'success' && needs.ci.outputs.app_ota_payload == 'true' && needs.ci.outputs.app_ota_unsafe != 'true' }}",
  );
  const ota = stagingJobs.get("ota");
  assert.ok(ota, "ci-staging must call the hardened EAS workflow");
  assert.deepEqual(parseNeeds(readField(ota.lines, 4, "needs")), [
    "ci",
    "ota-safety",
  ]);
  assert.equal(
    readField(ota.lines, 4, "if"),
    "${{ needs.ci.result == 'success' && needs.ota-safety.result == 'success' }}",
  );
  assert.equal(
    readField(ota.lines, 4, "uses"),
    "./.github/workflows/deploy-app-native-eas.yml",
  );
  assert.equal(readField(ota.lines, 4, "secrets"), "inherit");
  const withInputs = parseNestedMapping(ota.lines, 4, "with");
  assert.equal(withInputs.get("action"), "update");
  assert.equal(withInputs.get("platform"), "all");
  assert.equal(withInputs.get("ci_run_id"), "${{ github.run_id }}");

  const nativeBuildRequired = stagingJobs.get("native-build-required");
  assert.ok(
    nativeBuildRequired,
    "native-sensitive app changes need an explicit non-publishing handoff",
  );
  assert.deepEqual(
    parseNeeds(readField(nativeBuildRequired.lines, 4, "needs")),
    ["ci"],
  );
  assert.equal(
    readField(nativeBuildRequired.lines, 4, "if"),
    "${{ needs.ci.result == 'success' && needs.ci.outputs.app_ota_unsafe == 'true' }}",
  );
  assert.match(nativeBuildRequired.lines.join("\n"), /workflow_dispatch/);

  for (const output of ["app_ota_payload", "app_ota_unsafe"]) {
    assert.match(
      workflowSource,
      new RegExp(
        `${output}:\\n\\s+description:[^\\n]+\\n\\s+value: \\$\\{\\{ jobs\\.changes\\.outputs\\.${output} \\}\\}`,
      ),
    );
    assert.match(
      workflowSource,
      new RegExp(
        `${output}: \\$\\{\\{ steps\\.filter\\.outputs\\.${output} \\}\\}`,
      ),
    );
  }
  const otaPayloadFilter = workflowSource.slice(
    workflowSource.indexOf("            app_ota_payload:"),
    workflowSource.indexOf("            app_ota_unsafe:"),
  );
  for (const otaPayloadPath of [
    "apps/app/app/**",
    "apps/app/src/**",
    "apps/app/assets/**",
  ]) {
    assert.ok(
      otaPayloadFilter.includes(`- '${otaPayloadPath}'`),
      `${otaPayloadPath} must be classified as an OTA payload`,
    );
  }
  const otaUnsafeFilter = workflowSource.slice(
    workflowSource.indexOf("            app_ota_unsafe:"),
    workflowSource.indexOf("            knip:"),
  );
  for (const nativeSensitivePath of [
    "apps/app/app.config.js",
    "apps/app/eas.json",
    "apps/app/package.json",
    "apps/app/.eas/**",
    "apps/app/modules/**",
    "apps/app/plugins/**",
    "apps/app/google-services.json",
    "apps/app/GoogleService-Info.plist",
  ]) {
    assert.ok(
      otaUnsafeFilter.includes(`- '${nativeSensitivePath}'`),
      `${nativeSensitivePath} must block automatic OTA`,
    );
  }
  assert.match(
    ciStagingSource,
    /concurrency:[\s\S]*group: ci-staging-\$\{\{ github\.ref \}\}[\s\S]*cancel-in-progress: false/,
  );
});

test("native EAS scaffold is staging-only and verifies CI for the exact SHA", () => {
  assert.deepEqual(dispatchChoiceOptions(easDeploySource, "action"), [
    "build",
    "update",
  ]);
  assert.equal(
    dispatchInputField(easDeploySource, "action", "default"),
    "build",
  );
  assert.deepEqual(dispatchChoiceOptions(easDeploySource, "platform"), [
    "all",
    "android",
    "ios",
  ]);
  assert.doesNotMatch(easDeploySource, /confirm_ci_green:/);
  assert.doesNotMatch(easDeploySource, /^      (?:profile|channel):/m);
  assert.doesNotMatch(easDeploySource, /^\s*- submit\s*$/m);
  assert.doesNotMatch(
    easDeploySource,
    /api\.gogocash\.co|channel:\s+production|EAS_ENVIRONMENT:\s+production|--environment\s+["']?production/,
  );
  assert.match(easDeploySource, /environment:\s+staging/);
  assert.match(easDeploySource, /EAS_ENVIRONMENT:\s+preview/);
  assert.match(easDeploySource, /EAS_PROFILE:\s+preview/);
  assert.match(easDeploySource, /EAS_CHANNEL:\s+staging/);
  assert.equal(easJson.build?.preview?.environment, "preview");
  assert.match(
    easDeploySource,
    /EXPO_PUBLIC_API_URL:\s+https:\/\/api-staging\.gogocash\.co/,
  );
  assert.match(easDeploySource, /actions:\s+read/);
  assert.match(easDeploySource, /TARGET_SHA:\s+\$\{\{ github\.sha \}\}/);
  assert.match(easDeploySource, /TARGET_REF:\s+\$\{\{ github\.ref \}\}/);
  assert.match(
    easDeploySource,
    /node "\$GITHUB_WORKSPACE\/scripts\/deployment\/eas-ci-proof\.mjs"/,
  );
  assert.doesNotMatch(easDeploySource, /node <<'NODE'/);
  assert.match(easDeploySource, /ref:\s+\$\{\{ github\.sha \}\}/);
  assert.match(easDeploySource, /node-version:\s+"24"/);
  assert.match(easDeploySource, /npm@10\.9\.8/);
  assert.match(easDeploySource, /eas-version:\s+"21\.0\.1"/);
  assert.match(
    easDeploySource,
    /concurrency:[\s\S]*group: gogocash-eas-staging-deployment-queue[\s\S]*cancel-in-progress: false/,
  );
  assert.doesNotMatch(
    easDeploySource,
    /group: ci-staging-\$\{\{ github\.ref \}\}/,
  );
});

test("native EAS build and OTA verify the effective preview environment before mutation", () => {
  const setupIndex = easDeploySource.indexOf("- name: Set up EAS / Expo");
  const previewProofIndex = easDeploySource.indexOf(
    'eas env:exec "$EAS_ENVIRONMENT"',
  );
  const buildIndex = easDeploySource.indexOf("- name: EAS Build");
  const updateIndex = easDeploySource.indexOf("- name: EAS Update (OTA)");
  assert.ok(
    setupIndex >= 0 &&
      setupIndex < previewProofIndex &&
      previewProofIndex < buildIndex &&
      previewProofIndex < updateIndex,
    "the authenticated EAS preview-environment proof must run before build or OTA",
  );
  assert.match(
    easDeploySource,
    /node "\$GITHUB_WORKSPACE\/scripts\/deployment\/eas-preview-expectations\.mjs" "\$expectations_file"/,
  );
  assert.match(
    easDeploySource,
    /eas env:exec "\$EAS_ENVIRONMENT" "node \\"\$GITHUB_WORKSPACE\/scripts\/deployment\/eas-preview-env-proof\.mjs\\" \\"\$expectations_file\\"" --non-interactive/,
  );
  assert.match(easDeploySource, /trap 'rm -f "\$expectations_file"' EXIT/);
  for (const name of [
    "EXPECTED_FIREBASE_API_KEY",
    "EXPECTED_FIREBASE_AUTH_DOMAIN",
    "EXPECTED_FIREBASE_PROJECT_ID",
    "EXPECTED_FIREBASE_APP_ID",
  ]) {
    assert.match(easDeploySource, new RegExp(`-u ${name}`));
  }
  const easJob = parseJobs(easDeploySource).get("eas");
  assert.ok(easJob);
  const previewProofStep = parseSteps(easJob).find(
    (step) => step.name === "Verify EAS preview environment",
  );
  assert.ok(previewProofStep);
  assert.equal(previewProofStep.if, undefined);
});

test("native EAS provider JSON is validated before build or OTA proof is surfaced", () => {
  assert.match(easDeploySource, /eas build[\s\S]*--wait[\s\S]*--json/);
  assert.match(
    easDeploySource,
    /node "\$GITHUB_WORKSPACE\/scripts\/deployment\/eas-build-proof\.mjs"/,
  );

  const channelViewIndex = easDeploySource.indexOf("eas channel:view");
  const channelProofIndex = easDeploySource.indexOf("eas-channel-proof.mjs");
  const updateIndex = easDeploySource.indexOf("eas update");
  assert.ok(
    channelViewIndex >= 0 &&
      channelViewIndex < channelProofIndex &&
      channelProofIndex < updateIndex,
  );
  assert.match(easDeploySource, /eas update[\s\S]*--json/);
  assert.match(
    easDeploySource,
    /eas update[\s\S]*--environment "\$EAS_ENVIRONMENT"/,
  );
  assert.match(easDeploySource, /eas update[\s\S]*--branch "\$EAS_CHANNEL"/);
  assert.match(easDeploySource, /EAS_UPDATE_JSON/);
  assert.match(
    easDeploySource,
    /node "\$GITHUB_WORKSPACE\/scripts\/deployment\/eas-update-proof\.mjs"/,
  );
  const firebaseIndex = easDeploySource.indexOf("eas-staging-env.mjs");
  const firstProviderWrite = Math.min(
    easDeploySource.indexOf("      - name: EAS Build"),
    easDeploySource.indexOf("      - name: EAS Update (OTA)"),
  );
  assert.ok(firebaseIndex >= 0 && firebaseIndex < firstProviderWrite);
});

test("exact EAS CI proof runs on Node 24 and rejects provenance ambiguity", async () => {
  assert.match(process.versions.node, /^24\./);
  const sha = "a".repeat(40);
  const baseRun = {
    conclusion: null,
    event: "push",
    head_branch: "staging",
    head_sha: sha,
    html_url: "https://github.com/mygogocash/gogocash-monorepo/actions/runs/42",
    id: 42,
    path: ".github/workflows/ci-staging.yml",
    repository: { full_name: "mygogocash/gogocash-monorepo" },
    run_attempt: 1,
    status: "in_progress",
  };
  const job = (id, name, overrides = {}) => ({
    conclusion: "success",
    head_branch: "staging",
    head_sha: sha,
    html_url: `https://github.com/mygogocash/gogocash-monorepo/actions/runs/42/job/${id}`,
    id,
    name,
    run_attempt: 1,
    run_id: 42,
    status: "completed",
    ...overrides,
  });
  const aggregate = (overrides = {}) =>
    job(1001, "CI gate / CI gate (required)", overrides);
  const app = (overrides = {}) =>
    job(1002, "CI gate / app (@gogocash/mobile)", overrides);
  const otaSafety = (overrides = {}) =>
    job(1003, "OTA-safe runtime payload", overrides);

  await withFixtureDirectory(async (directory) => {
    let sequence = 0;
    const execute = async (fixtureOverrides = {}, envOverrides = {}) => {
      sequence += 1;
      const summary = join(directory, `summary-${sequence}`);
      const fixture = {
        jobs: [aggregate(), app()],
        run: { ...baseRun },
        workflowRuns: [],
        ...fixtureOverrides,
      };
      return await withGithubApi(fixture, async (apiUrl, requests) => {
        const result = await runValidator(
          "scripts/deployment/eas-ci-proof.mjs",
          {
            CURRENT_RUN_ID: "42",
            DEPLOYMENT_VALIDATOR_ALLOW_LOCAL_HTTP: "1",
            EXPECTED_CI_RUN_ID: "42",
            GH_TOKEN: "fixture-token",
            GITHUB_API_URL: apiUrl,
            GITHUB_EVENT_NAME: "push",
            GITHUB_REPOSITORY: "mygogocash/gogocash-monorepo",
            GITHUB_SERVER_URL: "https://github.com",
            GITHUB_STEP_SUMMARY: summary,
            SELECTED_ACTION: "build",
            TARGET_REF: "refs/heads/staging",
            TARGET_SHA: sha,
            ...envOverrides,
          },
        );
        return { requests: [...requests], result };
      });
    };

    const fillerJobs = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      name: `unrelated-${index + 1}`,
    }));
    const paginated = await execute({
      jobs: [...fillerJobs, aggregate(), app()],
    });
    assertValidatorSuccess(paginated.result);
    assert.ok(
      paginated.requests.some(
        (request) => request.includes("/jobs?") && request.includes("page=2"),
      ),
      "the validator must fetch the second job page",
    );

    const deepFillerJobs = Array.from({ length: 10_000 }, (_, index) => ({
      id: index + 100_000,
      name: `deep-unrelated-${index + 1}`,
    }));
    const deeplyPaginated = await execute({
      jobs: [...deepFillerJobs, aggregate(), app()],
    });
    assertValidatorSuccess(deeplyPaginated.result);
    assert.ok(
      deeplyPaginated.requests.some(
        (request) => request.includes("/jobs?") && request.includes("page=101"),
      ),
      "the validator must continue past 100 complete GitHub API pages",
    );

    const adversarialFixtures = [
      { run: { ...baseRun, path: ".github/workflows/lookalike.yml" } },
      { run: { ...baseRun, event: "workflow_dispatch" } },
      { run: { ...baseRun, head_branch: "main" } },
      { run: { ...baseRun, head_sha: "b".repeat(40) } },
      { run: { ...baseRun, id: 43 } },
      { run: { ...baseRun, run_attempt: 2 } },
      { refSha: "b".repeat(40) },
      { jobs: [aggregate()] },
      {
        jobs: [
          aggregate(),
          app(),
          job(1003, "CI gate / app (@gogocash/mobile)"),
        ],
      },
      {
        jobs: [aggregate(), job(1003, "CI gate / CI gate (required)"), app()],
      },
      {
        jobs: [
          aggregate(),
          job(1002, "prefix CI gate / app (@gogocash/mobile)"),
        ],
      },
      { jobs: [job(1001, "prefix CI gate (required)"), app()] },
      { jobs: [job(1001, "CI gate (required)"), app()] },
      { jobs: [aggregate({ conclusion: "skipped" }), app()] },
      { jobs: [aggregate(), app({ conclusion: "skipped" })] },
      { jobs: [aggregate(), app({ head_sha: "b".repeat(40) })] },
      { jobs: [aggregate(), app({ run_id: 43 })] },
      { jobs: [aggregate(), app({ run_attempt: 2 })] },
      { jobs: [aggregate(), app({ head_branch: "main" })] },
    ];
    for (const fixture of adversarialFixtures) {
      const rejected = await execute(fixture);
      assertValidatorFailure(rejected.result);
    }
    const missingAutomaticRunId = await execute({}, { EXPECTED_CI_RUN_ID: "" });
    assertValidatorFailure(missingAutomaticRunId.result);

    const acceptedUpdate = await execute(
      { jobs: [aggregate(), app(), otaSafety()] },
      { SELECTED_ACTION: "update" },
    );
    assertValidatorSuccess(acceptedUpdate.result);
    for (const jobs of [
      [aggregate(), app()],
      [aggregate(), app(), otaSafety({ conclusion: "skipped" })],
      [aggregate(), app(), otaSafety(), job(1004, "OTA-safe runtime payload")],
      [aggregate(), app(), otaSafety({ head_sha: "b".repeat(40) })],
    ]) {
      const rejectedUpdate = await execute(
        { jobs },
        { SELECTED_ACTION: "update" },
      );
      assertValidatorFailure(rejectedUpdate.result);
    }

    const malformed = await execute({
      responseOverride: (url) =>
        /\/jobs$/.test(url.pathname)
          ? { body: { jobs: [], total_count: "2" } }
          : undefined,
    });
    assertValidatorFailure(malformed.result);

    const incomplete = await execute({
      jobs: [...fillerJobs, aggregate(), app()],
      jobsTotal: 103,
    });
    assertValidatorFailure(incomplete.result);

    const completedRun = {
      ...baseRun,
      conclusion: "success",
      status: "completed",
    };
    const workflowRuns = [
      ...Array.from({ length: 100 }, (_, index) => ({ id: index + 100 })),
      completedRun,
    ];
    const discovered = await execute(
      { jobs: [aggregate(), app()], run: completedRun, workflowRuns },
      {
        CURRENT_RUN_ID: "999",
        EXPECTED_CI_RUN_ID: "",
        GITHUB_EVENT_NAME: "workflow_dispatch",
      },
    );
    assertValidatorSuccess(discovered.result);
    assert.ok(
      discovered.requests.some(
        (request) =>
          request.includes("/workflows/ci-staging.yml/runs?") &&
          request.includes("page=2"),
      ),
      "manual discovery must fetch every workflow-run page",
    );
    const discoveredUpdate = await execute(
      {
        jobs: [aggregate(), app(), otaSafety()],
        run: completedRun,
        workflowRuns,
      },
      {
        CURRENT_RUN_ID: "999",
        EXPECTED_CI_RUN_ID: "",
        GITHUB_EVENT_NAME: "workflow_dispatch",
        SELECTED_ACTION: "update",
      },
    );
    assertValidatorSuccess(discoveredUpdate.result);
  });
});

test("EAS staging preflight fails closed when any required Firebase value is blank", async () => {
  await withFixtureDirectory(async (directory) => {
    const summary = join(directory, "summary");
    const firebase = {
      EXPO_PUBLIC_FIREBASE_API_KEY: "fixture-api-key",
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "fixture-auth-domain",
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: "fixture-project-id",
      EXPO_PUBLIC_FIREBASE_APP_ID: "fixture-app-id",
    };
    const baseEnv = {
      EAS_CHANNEL: "staging",
      EAS_ENVIRONMENT: "preview",
      EAS_PROFILE: "preview",
      GITHUB_EVENT_NAME: "push",
      GITHUB_STEP_SUMMARY: summary,
      SELECTED_ACTION: "update",
      SELECTED_PLATFORM: "all",
      ...firebase,
    };
    const valid = await runValidator(
      "scripts/deployment/eas-staging-env.mjs",
      baseEnv,
    );
    assertValidatorSuccess(valid);
    const validManualBuild = await runValidator(
      "scripts/deployment/eas-staging-env.mjs",
      {
        ...baseEnv,
        GITHUB_EVENT_NAME: "workflow_dispatch",
        SELECTED_ACTION: "build",
        SELECTED_PLATFORM: "android",
      },
    );
    assertValidatorSuccess(validManualBuild);
    const validManualUpdate = await runValidator(
      "scripts/deployment/eas-staging-env.mjs",
      { ...baseEnv, GITHUB_EVENT_NAME: "workflow_dispatch" },
    );
    assertValidatorSuccess(validManualUpdate);
    for (const invalidEntry of [
      {
        GITHUB_EVENT_NAME: "workflow_dispatch",
        SELECTED_PLATFORM: "android",
      },
      { GITHUB_EVENT_NAME: "push", SELECTED_ACTION: "build" },
      { GITHUB_EVENT_NAME: "push", SELECTED_PLATFORM: "android" },
    ]) {
      const rejected = await runValidator(
        "scripts/deployment/eas-staging-env.mjs",
        { ...baseEnv, ...invalidEntry },
      );
      assertValidatorFailure(rejected);
    }
    for (const name of Object.keys(firebase)) {
      const rejected = await runValidator(
        "scripts/deployment/eas-staging-env.mjs",
        { ...baseEnv, [name]: "   " },
      );
      assertValidatorFailure(rejected);
      assert.doesNotMatch(
        validatorOutput(rejected),
        /fixture-(?:api|auth|project|app)/,
      );
    }
  });
});

test("EAS preview environment proof rejects missing or stale Firebase without leaking values", async () => {
  await withFixtureDirectory(async (directory) => {
    const summary = join(directory, "summary");
    const expectationsPath = join(directory, "eas-preview-expectations.json");
    const firebase = {
      EXPO_PUBLIC_FIREBASE_API_KEY: "remote-api-key",
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "remote-auth-domain",
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: "remote-project-id",
      EXPO_PUBLIC_FIREBASE_APP_ID: "remote-app-id",
    };
    const stagingIdentity = {
      EXPO_PUBLIC_EAS_PROJECT_ID: "0039c25f-f88e-491d-8da9-85b8d6e66558",
      EXPO_PUBLIC_API_URL: "https://api-staging.gogocash.co",
      EXPO_PUBLIC_APP_ENV: "staging",
      EXPO_PUBLIC_ACCOUNT_DATA_SOURCE: "backend",
      EXPO_PUBLIC_FRONTEND_URL: "https://app-staging.gogocash.co",
    };
    const canonicalFirebase = {
      EXPECTED_FIREBASE_API_KEY: firebase.EXPO_PUBLIC_FIREBASE_API_KEY,
      EXPECTED_FIREBASE_AUTH_DOMAIN: firebase.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      EXPECTED_FIREBASE_PROJECT_ID: firebase.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      EXPECTED_FIREBASE_APP_ID: firebase.EXPO_PUBLIC_FIREBASE_APP_ID,
    };
    const written = await runValidator(
      "scripts/deployment/eas-preview-expectations.mjs",
      { RUNNER_TEMP: directory, ...canonicalFirebase },
      [expectationsPath],
    );
    assertValidatorSuccess(written);
    assert.equal(statSync(expectationsPath).mode & 0o077, 0);
    const valid = await runValidator(
      "scripts/deployment/eas-preview-env-proof.mjs",
      {
        GITHUB_STEP_SUMMARY: summary,
        ...firebase,
        ...stagingIdentity,
      },
      [expectationsPath],
    );
    assertValidatorSuccess(valid);
    assert.match(
      readFileSync(summary, "utf8"),
      /EAS preview environment proof: Firebase matches the canonical GitHub staging secrets and the release target is fixed to staging\./,
    );

    for (const name of Object.keys(firebase)) {
      for (const value of ["   ", "stale-remote-firebase-value"]) {
        const rejected = await runValidator(
          "scripts/deployment/eas-preview-env-proof.mjs",
          {
            GITHUB_STEP_SUMMARY: summary,
            ...firebase,
            ...stagingIdentity,
            [name]: value,
          },
          [expectationsPath],
        );
        assertValidatorFailure(rejected);
        assert.doesNotMatch(
          validatorOutput(rejected),
          /remote-(?:api|auth|project|app)|stale-remote-firebase-value/,
        );
      }
    }
    for (const name of Object.keys(stagingIdentity)) {
      for (const value of ["   ", "https://production.invalid"]) {
        const rejected = await runValidator(
          "scripts/deployment/eas-preview-env-proof.mjs",
          {
            GITHUB_STEP_SUMMARY: summary,
            ...firebase,
            ...stagingIdentity,
            [name]: value,
          },
          [expectationsPath],
        );
        assertValidatorFailure(rejected);
      }
    }

    const collision = await runValidator(
      "scripts/deployment/eas-preview-env-proof.mjs",
      {
        GITHUB_STEP_SUMMARY: summary,
        ...firebase,
        ...stagingIdentity,
        EXPO_PUBLIC_FIREBASE_API_KEY: "remote-collision-value",
        EXPECTED_FIREBASE_API_KEY: "remote-collision-value",
        EXPECTED_FIREBASE_AUTH_DOMAIN: "remote-auth-domain",
        EXPECTED_FIREBASE_PROJECT_ID: "remote-project-id",
        EXPECTED_FIREBASE_APP_ID: "remote-app-id",
      },
      [expectationsPath],
    );
    assertValidatorFailure(collision);
    assert.doesNotMatch(
      validatorOutput(collision),
      /remote-collision-value|remote-(?:api|auth|project|app)/,
    );

    const duplicateWrite = await runValidator(
      "scripts/deployment/eas-preview-expectations.mjs",
      { RUNNER_TEMP: directory, ...canonicalFirebase },
      [expectationsPath],
    );
    assertValidatorFailure(duplicateWrite);
    assert.doesNotMatch(
      validatorOutput(duplicateWrite),
      /remote-(?:api|auth|project|app)/,
    );
  });
});

test("release digest-map validator accepts only canonical unambiguous input", async () => {
  const sha = "a".repeat(40);
  const digest = `sha256:${"b".repeat(64)}`;

  await withFixtureDirectory(async (directory) => {
    const output = join(directory, "output");
    const baseEnv = {
      GITHUB_OUTPUT: output,
      IMAGE_SHA: sha,
      SELECTED_APP: "api",
      TARGET_REF: "refs/heads/main",
    };
    const canonical = `{"api":"${digest}"}`;
    const valid = await runValidator(
      "scripts/deployment/gcp-release-input.mjs",
      {
        ...baseEnv,
        IMAGE_DIGESTS_JSON: canonical,
      },
    );
    assertValidatorSuccess(valid);
    assert.equal(readFileSync(output, "utf8"), `api_digest=${digest}\n`);

    const rejectedInputs = [
      `{"api":"${digest}","api":"${digest}"}`,
      `{"api":"${digest}","admin":"${digest}"}`,
      `{"\\u0061pi":"${digest}"}`,
      `{ "api":"${digest}"}`,
      `{"api": "${digest}"}`,
      `{"api":"${digest}"}\n`,
      `{"api":"sha256:${"B".repeat(64)}"}`,
      `{"api":"sha256:bad"}`,
      `["${digest}"]`,
      "{}",
    ];
    for (const imageDigests of rejectedInputs) {
      const rejected = await runValidator(
        "scripts/deployment/gcp-release-input.mjs",
        {
          ...baseEnv,
          IMAGE_DIGESTS_JSON: imageDigests,
        },
      );
      assertValidatorFailure(rejected);
    }

    const allOutput = join(directory, "all-output");
    const allCanonical = `{"api":"${digest}","admin":"${digest}","app-web":"${digest}"}`;
    const validAll = await runValidator(
      "scripts/deployment/gcp-release-input.mjs",
      {
        ...baseEnv,
        GITHUB_OUTPUT: allOutput,
        IMAGE_DIGESTS_JSON: allCanonical,
        SELECTED_APP: "all",
      },
    );
    assertValidatorSuccess(validAll);
    assert.deepEqual(readFileSync(allOutput, "utf8").trim().split("\n"), [
      `api_digest=${digest}`,
      `admin_digest=${digest}`,
      `app_web_digest=${digest}`,
    ]);
    for (const nonCanonicalAll of [
      `{"admin":"${digest}","api":"${digest}","app-web":"${digest}"}`,
      `{"api":"${digest}","admin":"${digest}"}`,
      `{"api":"${digest}","admin":"${digest}","app-web":"${digest}","extra":"${digest}"}`,
    ]) {
      const rejectedAll = await runValidator(
        "scripts/deployment/gcp-release-input.mjs",
        {
          ...baseEnv,
          GITHUB_OUTPUT: join(directory, "rejected-all-output"),
          IMAGE_DIGESTS_JSON: nonCanonicalAll,
          SELECTED_APP: "all",
        },
      );
      assertValidatorFailure(rejectedAll);
    }
  });
});

test("EAS build and channel validators reject provider identity drift", async () => {
  const sha = "a".repeat(40);
  const projectId = "0039c25f-f88e-491d-8da9-85b8d6e66558";

  await withFixtureDirectory(async (directory) => {
    const buildJson = join(directory, "build.json");
    const channelJson = join(directory, "channel.json");
    const summary = join(directory, "summary");
    const githubEnv = join(directory, "env");
    const build = {
      artifacts: {
        applicationArchiveUrl: "https://expo.dev/artifacts/eas/preview.apk",
      },
      buildProfile: "preview",
      channel: "staging",
      distribution: "INTERNAL",
      gitCommitHash: sha,
      id: "build-android-1",
      platform: "ANDROID",
      project: {
        id: projectId,
        ownerAccount: { name: "mygogocash" },
        slug: "gogocash",
      },
      runtimeVersion: "0.3.0",
      status: "FINISHED",
    };
    writeFileSync(buildJson, JSON.stringify([build]));
    const buildEnv = {
      COMMIT_SHA: sha,
      EAS_BUILD_JSON: buildJson,
      EAS_CHANNEL: "staging",
      EAS_PLATFORM: "android",
      EAS_PROFILE: "preview",
      EXPO_PUBLIC_EAS_PROJECT_ID: projectId,
      GITHUB_ENV: githubEnv,
      GITHUB_STEP_SUMMARY: summary,
    };
    const validBuild = await runValidator(
      "scripts/deployment/eas-build-proof.mjs",
      buildEnv,
    );
    assertValidatorSuccess(validBuild);
    assert.match(
      readFileSync(githubEnv, "utf8"),
      /EAS_BUILD_ID=build-android-1/,
    );

    writeFileSync(
      buildJson,
      JSON.stringify([{ ...build, gitCommitHash: "c".repeat(40) }]),
    );
    const wrongCommit = await runValidator(
      "scripts/deployment/eas-build-proof.mjs",
      buildEnv,
    );
    assertValidatorFailure(wrongCommit);

    writeFileSync(buildJson, "{not-json");
    const malformedBuild = await runValidator(
      "scripts/deployment/eas-build-proof.mjs",
      buildEnv,
    );
    assertValidatorFailure(malformedBuild);

    writeFileSync(
      buildJson,
      JSON.stringify([
        {
          ...build,
          artifacts: {
            applicationArchiveUrl:
              "https://user:password@expo.dev/artifacts/eas/preview.apk",
          },
        },
      ]),
    );
    const credentialedArtifact = await runValidator(
      "scripts/deployment/eas-build-proof.mjs",
      buildEnv,
    );
    assertValidatorFailure(credentialedArtifact);

    writeFileSync(
      channelJson,
      JSON.stringify({
        currentPage: {
          isPaused: false,
          name: "staging",
          updateBranches: [{ name: "staging" }],
        },
      }),
    );
    const channelEnv = {
      EAS_CHANNEL: "staging",
      EAS_CHANNEL_JSON: channelJson,
      GITHUB_STEP_SUMMARY: summary,
    };
    const validChannel = await runValidator(
      "scripts/deployment/eas-channel-proof.mjs",
      channelEnv,
    );
    assertValidatorSuccess(validChannel);

    writeFileSync(
      channelJson,
      JSON.stringify({
        currentPage: {
          isPaused: false,
          name: "staging",
          updateBranches: [{ name: "production" }],
        },
      }),
    );
    const wrongBranch = await runValidator(
      "scripts/deployment/eas-channel-proof.mjs",
      channelEnv,
    );
    assertValidatorFailure(wrongBranch);

    writeFileSync(
      channelJson,
      JSON.stringify({
        currentPage: {
          isPaused: true,
          name: "staging",
          updateBranches: [{ name: "staging" }],
        },
      }),
    );
    const pausedChannel = await runValidator(
      "scripts/deployment/eas-channel-proof.mjs",
      channelEnv,
    );
    assertValidatorFailure(pausedChannel);

    writeFileSync(channelJson, JSON.stringify({ currentPage: null }));
    const malformedChannel = await runValidator(
      "scripts/deployment/eas-channel-proof.mjs",
      channelEnv,
    );
    assertValidatorFailure(malformedChannel);
  });
});

test("EAS OTA validator requires one Android and one iOS update in one group/runtime", async () => {
  const sha = "a".repeat(40);
  const update = (platform, overrides = {}) => ({
    branch: "staging",
    gitCommitHash: sha,
    group: "group-1",
    id: `update-${platform}`,
    manifestPermalink: `https://u.expo.dev/update-${platform}`,
    platform,
    runtimeVersion: "0.3.0",
    ...overrides,
  });

  await withFixtureDirectory(async (directory) => {
    const updateJson = join(directory, "update.json");
    const summary = join(directory, "summary");
    const baseEnv = {
      COMMIT_SHA: sha,
      EAS_CHANNEL: "staging",
      EAS_UPDATE_JSON: updateJson,
      GITHUB_STEP_SUMMARY: summary,
    };
    writeFileSync(
      updateJson,
      JSON.stringify([update("android"), update("ios")]),
    );
    const valid = await runValidator(
      "scripts/deployment/eas-update-proof.mjs",
      baseEnv,
    );
    assertValidatorSuccess(valid);

    const rejectedFixtures = [
      [update("android"), update("ios"), update("android", { id: "extra" })],
      [update("android"), update("android", { id: "duplicate-platform" })],
      [update("android"), update("ios", { group: "group-2" })],
      [update("android"), update("ios", { runtimeVersion: "0.4.0" })],
      [update("android"), update("ios", { gitCommitHash: "b".repeat(40) })],
      [update("android"), update("ios", { branch: "production" })],
      [update("android"), update("ios", { id: "update-android" })],
      [
        update("android"),
        update("ios", {
          manifestPermalink: "https://user:password@u.expo.dev/update-ios",
        }),
      ],
    ];
    for (const fixture of rejectedFixtures) {
      writeFileSync(updateJson, JSON.stringify(fixture));
      const rejected = await runValidator(
        "scripts/deployment/eas-update-proof.mjs",
        baseEnv,
      );
      assertValidatorFailure(rejected);
    }
    writeFileSync(updateJson, "not-json");
    const malformed = await runValidator(
      "scripts/deployment/eas-update-proof.mjs",
      baseEnv,
    );
    assertValidatorFailure(malformed);
  });
});

test("build and release summaries bind the selected service to SHA and digest", async () => {
  const sha = "a".repeat(40);
  const digest = `sha256:${"b".repeat(64)}`;
  const otherDigest = `sha256:${"c".repeat(64)}`;

  await withFixtureDirectory(async (directory) => {
    const summary = join(directory, "summary");
    const output = join(directory, "output");
    const buildNeeds = {
      preflight: { result: "success" },
      ci: { result: "success" },
      "build-api": {
        outputs: {
          image_digest: digest,
          image_sha: sha,
          image_uri: `example.invalid/gogocash-api-staging:${sha}`,
        },
        result: "success",
      },
    };
    const buildEnv = {
      GITHUB_OUTPUT: output,
      GITHUB_STEP_SUMMARY: summary,
      NEEDS_JSON: JSON.stringify(buildNeeds),
      SELECTED_APP: "api",
      TARGET_SHA: sha,
    };
    const validBuild = await runValidator(
      "scripts/deployment/gcp-build-summary.mjs",
      buildEnv,
    );
    assertValidatorSuccess(validBuild);
    assert.equal(
      readFileSync(output, "utf8"),
      `image_digests={"api":"${digest}"}\n`,
    );

    const adminDigest = `sha256:${"d".repeat(64)}`;
    const appWebDigest = `sha256:${"e".repeat(64)}`;
    const allOutput = join(directory, "all-build-output");
    const allBuild = await runValidator(
      "scripts/deployment/gcp-build-summary.mjs",
      {
        ...buildEnv,
        GITHUB_OUTPUT: allOutput,
        NEEDS_JSON: JSON.stringify({
          ...buildNeeds,
          "build-admin": {
            outputs: {
              image_digest: adminDigest,
              image_sha: sha,
              image_uri: `example.invalid/gogocash-admin:${sha}`,
            },
            result: "success",
          },
          "build-app-web": {
            outputs: {
              image_digest: appWebDigest,
              image_sha: sha,
              image_uri: `example.invalid/gogocash-app-web-staging:${sha}`,
            },
            result: "success",
          },
        }),
        SELECTED_APP: "all",
      },
    );
    assertValidatorSuccess(allBuild);
    assert.equal(
      readFileSync(allOutput, "utf8"),
      `image_digests={"api":"${digest}","admin":"${adminDigest}","app-web":"${appWebDigest}"}\n`,
    );

    const invalidBuild = await runValidator(
      "scripts/deployment/gcp-build-summary.mjs",
      {
        ...buildEnv,
        NEEDS_JSON: JSON.stringify({
          ...buildNeeds,
          "build-api": {
            ...buildNeeds["build-api"],
            outputs: {
              ...buildNeeds["build-api"].outputs,
              image_digest: "bad",
            },
          },
        }),
      },
    );
    assertValidatorFailure(invalidBuild);

    const releaseNeeds = {
      preflight: { result: "success" },
      "release-api": {
        outputs: {
          image_digest: digest,
          image_sha: sha,
          service_url: "https://api-staging.gogocash.co",
        },
        result: "success",
      },
    };
    const releaseEnv = {
      EXPECTED_ADMIN_DIGEST: "",
      EXPECTED_API_DIGEST: digest,
      EXPECTED_APP_WEB_DIGEST: "",
      GITHUB_STEP_SUMMARY: summary,
      IMAGE_SHA: sha,
      SELECTED_APP: "api",
    };
    const validRelease = await runValidator(
      "scripts/deployment/gcp-release-summary.mjs",
      {
        ...releaseEnv,
        NEEDS_JSON: JSON.stringify(releaseNeeds),
      },
    );
    assertValidatorSuccess(validRelease);
    const invalidRelease = await runValidator(
      "scripts/deployment/gcp-release-summary.mjs",
      {
        ...releaseEnv,
        NEEDS_JSON: JSON.stringify({
          ...releaseNeeds,
          "release-api": {
            ...releaseNeeds["release-api"],
            outputs: {
              ...releaseNeeds["release-api"].outputs,
              image_digest: otherDigest,
            },
          },
        }),
      },
    );
    assertValidatorFailure(invalidRelease);
  });
});

test("Cloud Run image proof rejects missing, malformed, and moved SHA tags", async () => {
  const sha = "a".repeat(40);
  const digest = `sha256:${"b".repeat(64)}`;
  const otherDigest = `sha256:${"c".repeat(64)}`;

  await withFixtureDirectory(async (directory) => {
    const fakeGcloud = join(directory, "gcloud");
    const argsFile = join(directory, "gcloud-args");
    writeFileSync(
      fakeGcloud,
      `#!/bin/sh
printf '%s\\n' "$*" > "$MOCK_GCLOUD_ARGS_FILE"
case "$MOCK_GCLOUD_MODE" in
  success) printf '%s\\n' "$MOCK_GCLOUD_DIGEST" ;;
  malformed) printf '%s\\n' 'not-a-digest' ;;
  missing) exit 1 ;;
  *) exit 2 ;;
esac
`,
    );
    chmodSync(fakeGcloud, 0o755);
    const baseEnv = {
      EXPECTED_IMAGE_DIGEST: digest,
      IMAGE_BASE:
        "asia-southeast1-docker.pkg.dev/gogocash-staging/gogocash/gogocash-api-staging",
      IMAGE_SHA: sha,
      MOCK_GCLOUD_ARGS_FILE: argsFile,
      PATH: `${directory}:${process.env.PATH}`,
      PROJECT: "gogocash-staging",
    };

    const output = join(directory, "output");
    const valid = await runValidator("scripts/deployment/gcp-image-proof.mjs", {
      ...baseEnv,
      GITHUB_OUTPUT: output,
      MOCK_GCLOUD_DIGEST: digest,
      MOCK_GCLOUD_MODE: "success",
    });
    assertValidatorSuccess(valid);
    assert.match(
      readFileSync(argsFile, "utf8"),
      new RegExp(`gogocash-api-staging:${sha}.*--project gogocash-staging`),
    );
    assert.deepEqual(readFileSync(output, "utf8").trim().split("\n"), [
      `image_sha=${sha}`,
      `image_digest=${digest}`,
      `deploy_image=${baseEnv.IMAGE_BASE}@${digest}`,
    ]);

    for (const fixture of [
      { MOCK_GCLOUD_DIGEST: otherDigest, MOCK_GCLOUD_MODE: "success" },
      { MOCK_GCLOUD_DIGEST: digest, MOCK_GCLOUD_MODE: "missing" },
      { MOCK_GCLOUD_DIGEST: digest, MOCK_GCLOUD_MODE: "malformed" },
    ]) {
      const rejected = await runValidator(
        "scripts/deployment/gcp-image-proof.mjs",
        {
          ...baseEnv,
          GITHUB_OUTPUT: join(
            directory,
            `rejected-${fixture.MOCK_GCLOUD_MODE}`,
          ),
          ...fixture,
        },
      );
      assertValidatorFailure(rejected);
    }
  });
});

test("Artifact Registry cleanup is bounded and protects moving pointers", () => {
  assert.ok(Array.isArray(artifactCleanupPolicies));
  const byName = new Map(
    artifactCleanupPolicies.map((policy) => [policy.name, policy]),
  );
  assert.deepEqual(byName.get("keep-release-pointers"), {
    name: "keep-release-pointers",
    action: { type: "Keep" },
    condition: {
      tagState: "tagged",
      tagPrefixes: ["staging-candidate", "latest"],
    },
  });
  assert.deepEqual(byName.get("keep-recent-deployable"), {
    name: "keep-recent-deployable",
    action: { type: "Keep" },
    mostRecentVersions: { keepCount: 10 },
  });
  assert.deepEqual(byName.get("delete-old-versions"), {
    name: "delete-old-versions",
    action: { type: "Delete" },
    condition: { tagState: "any", olderThan: "7d" },
  });
});
