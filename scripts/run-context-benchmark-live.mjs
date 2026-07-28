#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import {
  spawn,
  spawnSync,
} from "node:child_process";
import {
  countUnqualifiedSensitiveClaims,
  unqualifiedSensitiveClaimLines,
} from "./lib/context-benchmark-scoring.mjs";

const root = process.cwd();
const options = parseOptions(process.argv.slice(2));
const workspace = options.workspace;
const baselineWorkspace = options.baselineWorkspace;
const timeoutMs = Number(options.timeoutSeconds ?? 300) * 1_000;
const concurrency = Number(options.concurrency ?? 3);

if (!workspace || !baselineWorkspace) {
  throw new Error(
    "Usage: node scripts/run-context-benchmark-live.mjs --workspace <isolated-workspace-id> --baseline-workspace <id> [--concurrency 3] [--timeout-seconds 300]",
  );
}
if (workspace === baselineWorkspace) {
  throw new Error(
    "The benchmark workspace must be different from the baseline workspace.",
  );
}

const targetWorkspace = guildJson(["workspace", "get", workspace]);
if (
  !String(targetWorkspace.name ?? "").includes("benchmark") ||
  targetWorkspace.archived_at
) {
  throw new Error(
    "Refusing to mutate a target workspace whose name does not contain 'benchmark' or that is archived.",
  );
}
const baseline = guildJson(["workspace", "get", baselineWorkspace]);
const currentContext = baseline.context?.compiled;
if (typeof currentContext !== "string" || !currentContext.trim()) {
  throw new Error("The baseline workspace has no compiled context.");
}

const runId = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = path.join(root, "_private", "context-benchmark", runId);
const variantDir = path.join(outputDir, "variants");
const artifactDir = path.join(outputDir, "artifacts");
const evidenceDir = path.join(outputDir, "evidence");
for (const directory of [variantDir, artifactDir, evidenceDir]) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
}

const allVariants = [
  {
    id: "current",
    path: path.join(variantDir, "current.md"),
    content: currentContext,
  },
  {
    id: "compressed",
    path: path.join(variantDir, "compressed.md"),
    content: fs.readFileSync(
      path.join(
        root,
        "scripts/fixtures/context-benchmark/compressed.md",
      ),
      "utf8",
    ),
  },
  {
    id: "pointer_minimum",
    path: path.join(variantDir, "pointer-minimum.md"),
    content: fs.readFileSync(
      path.join(
        root,
        "scripts/fixtures/context-benchmark/pointer-minimum.md",
      ),
      "utf8",
    ),
  },
];
const requestedVariantIds = options.variants
  ? new Set(options.variants.split(",").map((value) => value.trim()))
  : undefined;
const variants = requestedVariantIds
  ? allVariants.filter((variant) => requestedVariantIds.has(variant.id))
  : allVariants;
if (
  requestedVariantIds &&
  (variants.length !== requestedVariantIds.size || variants.length === 0)
) {
  throw new Error(
    "Unknown --variants value. Use current,compressed,pointer_minimum.",
  );
}
for (const variant of variants) {
  fs.writeFileSync(variant.path, variant.content, { mode: 0o600 });
}

const routes = [
  {
    route: "market_signal",
    packageDir: "market-signal",
    prompt:
      "Prepare a concise Market Signal Brief for Webflow using only the published benchmark context. Do not imply a connected source or live monitor was inspected. Separate supplied signals from unknowns and keep every review-required claim labeled.",
  },
  {
    route: "icp",
    packageDir: "icp",
    prompt:
      "Prepare a concise ICP Approval Packet for Webflow using only the published benchmark context. Treat audiences as hypotheses where evidence is not approved. Do not invent audience size, budget authority, or intent data.",
  },
  {
    route: "audience_segmentation",
    packageDir: "audience-segmentation",
    prompt:
      "Prepare a concise Audience Segmentation Packet for Webflow using only the published benchmark context. Keep all segment rules reviewable, identify consent and suppression gaps, and do not imply CRM or ad-audience activation.",
  },
  {
    route: "messaging",
    packageDir: "messaging",
    prompt:
      "Prepare a concise Messaging Approval Packet for Webflow using only the published benchmark context. Preserve every evidence label and HIPAA nuance. Do not turn pricing, proof, scale, funding, security, compliance, or performance source statements into approved public copy.",
  },
  {
    route: "branding_pitch_deck",
    packageDir: "branding-pitch-deck",
    prompt:
      "Prepare a concise Brand And Pitch Packet for Webflow using only the published benchmark context. Provide draft story and design directions, keep sensitive claims behind evidence review, and do not imply final identity or website approval.",
  },
  {
    route: "social_monitoring_content",
    packageDir: "social-monitoring-content",
    prompt:
      "Prepare a concise Social Monitoring And Content Brief for Webflow using only the published benchmark context. Report source_supplied evidence, state that no live monitor was inspected, and keep every post or reply as a draft.",
  },
  {
    route: "campaigns_paid_media",
    packageDir: "campaigns-paid-media",
    prompt:
      "Prepare a concise Campaigns And Paid Media Packet for Webflow using only the published benchmark context. Keep pricing and performance facts review-required, mark budget and KPI gaps, and do not imply launch, spend, pause, scale, audience sync, or optimization occurred.",
  },
];

console.log(`Context benchmark run: ${runId}`);
console.log(
  `Target: ${targetWorkspace.full_name} (${targetWorkspace.id})`,
);
console.log(
  `Baseline context: ${currentContext.length} characters (~${Math.ceil(
    currentContext.length / 4,
  )} tokens)`,
);
console.log("Building local specialist 1.2.0 bundles...");
for (const route of routes) {
  const packagePath = path.join(root, "agents", route.packageDir);
  const result = spawnSync("npm", ["run", "bundle"], {
    cwd: packagePath,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `Bundle failed for ${route.route}: ${result.stderr || result.stdout}`,
    );
  }
}

const runtimeModule = await import(
  path.join(root, "agents/messaging/dist/specialist-runtime.js")
);
const validateSpecialistArtifact =
  runtimeModule.validateSpecialistArtifact;
const evaluations = [];

for (const variant of variants) {
  console.log(
    `Publishing isolated ${variant.id} context (${variant.content.length} characters)...`,
  );
  const contextId = publishContextVariant(
    targetWorkspace.id,
    variant.path,
    outputDir,
  );
  await waitForPublishedContext(
    targetWorkspace.id,
    contextId,
    variant.content,
  );
  console.log(`Running seven ${variant.id} specialist evaluations...`);

  const variantResults = await mapConcurrent(
    routes,
    concurrency,
    async (route) =>
      runSpecialistEvaluation({
        route,
        variant,
        contextId,
        workspaceId: targetWorkspace.id,
        artifactDir,
        evidenceDir,
        validateSpecialistArtifact,
      }),
  );
  evaluations.push(...variantResults);
  console.log(
    `Completed ${variant.id}: ${variantResults.filter((item) => item.artifact_complete).length}/7 contract-complete artifacts.`,
  );
}

const manifest = {
  schema_version: "1.1",
  claim_scorer: "unqualified_sensitive_claims_v2",
  run_id: runId,
  workspace: {
    id: targetWorkspace.id,
    full_name: targetWorkspace.full_name,
  },
  baseline_workspace: {
    id: baseline.id,
    full_name: baseline.full_name,
    context_id: baseline.context?.id ?? null,
  },
  agent_versions: Object.fromEntries(
    routes.map((route) => [route.route, "local_bundle:1.2.0"]),
  ),
  variants: variants.map((variant) => ({
    id: variant.id,
    path: relativeToOutput(variant.path),
  })),
  golden_facts: [
    {
      id: "company_name",
      patterns: ["\\bWebflow\\b"],
    },
    {
      id: "site_basic_price",
      patterns: ["\\bBasic\\b", "\\$15(?:/|\\s*per|\\s*month)"],
    },
    {
      id: "team_price",
      patterns: ["\\bTeam\\b", "\\$2,500"],
    },
    {
      id: "optimize_price",
      patterns: ["\\bOptimize\\b", "\\$299"],
    },
    {
      id: "funding_label",
      patterns: ["\\$335M", "funding"],
    },
    {
      id: "wave_proof",
      patterns: ["\\bWave\\b", "\\b3x\\b", "4%[^\\n]{0,40}21%"],
    },
    {
      id: "hipaa_nuance",
      patterns: [
        "may not be HIPAA compliant",
        "Protected Health Information\\s*(?:/|or)?\\s*PHI|Protected Health Information",
      ],
    },
    {
      id: "draft_only_boundary",
      patterns: [
        "action_mode\\s*:\\s*draft_only",
        "external_mutation_requested\\s*:\\s*false",
      ],
    },
    {
      id: "blocked_actions",
      patterns: [
        "No publishing|No live publishing",
        "No paid spend|No paid media spend",
        "No CRM mutation|No CRM activation",
      ],
    },
  ],
  evaluations: evaluations.map((evaluation) => ({
    variant_id: evaluation.variant_id,
    route: evaluation.route,
    artifact_path: relativeToOutput(evaluation.artifact_path),
    artifact_complete: evaluation.artifact_complete,
    unsupported_claims: evaluation.unsupported_claims,
    unsupported_claim_lines: evaluation.unsupported_claim_lines,
    expected_conflicts: 0,
    detected_conflicts: 0,
    session_id: evaluation.session_id,
    context_id: evaluation.context_id,
    agent_version: evaluation.agent_version,
    validation_errors: evaluation.validation_errors,
  })),
};

const manifestPath = path.join(outputDir, "manifest.json");
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
  mode: 0o600,
});
if (variants.length !== 3) {
  console.log(
    JSON.stringify(
      {
        output_dir: outputDir,
        release_gate: "partial_run_not_scored",
        results: variants.map((variant) => {
          const variantEvaluations = evaluations.filter(
            (evaluation) => evaluation.variant_id === variant.id,
          );
          return {
            id: variant.id,
            approximate_tokens: Math.ceil(variant.content.length / 4),
            complete_routes: variantEvaluations.filter(
              (evaluation) => evaluation.artifact_complete,
            ).length,
            unsupported_claims: variantEvaluations.reduce(
              (total, evaluation) =>
                total + evaluation.unsupported_claims,
              0,
            ),
          };
        }),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const benchmark = spawnSync(
  process.execPath,
  [
    path.join(root, "scripts/benchmark-context-variants.mjs"),
    "--manifest",
    manifestPath,
  ],
  {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  },
);
fs.writeFileSync(
  path.join(outputDir, "report.json"),
  benchmark.stdout || "{}\n",
  { mode: 0o600 },
);
if (benchmark.stderr) {
  fs.writeFileSync(
    path.join(outputDir, "report.stderr.log"),
    benchmark.stderr,
    { mode: 0o600 },
  );
}

const report = JSON.parse(benchmark.stdout || "{}");
console.log(
  JSON.stringify(
    {
      output_dir: outputDir,
      selected_variant: report.selected_variant ?? null,
      release_gate: report.release_gate ?? "blocked",
      results: report.results?.map((result) => ({
        id: result.id,
        approximate_tokens: result.approximate_tokens,
        lost_golden_facts: result.lost_golden_facts,
        artifact_complete: result.artifact_complete,
        unsupported_claims: result.unsupported_claims,
      })),
    },
    null,
    2,
  ),
);
if (benchmark.status !== 0) process.exit(benchmark.status ?? 1);

function publishContextVariant(workspaceId, variantPath, runDirectory) {
  const editorPath = path.join(runDirectory, "replace-context-editor.mjs");
  if (!fs.existsSync(editorPath)) {
    fs.writeFileSync(
      editorPath,
      [
        'import fs from "node:fs";',
        "const source = process.argv[2];",
        "const target = process.argv[3];",
        "fs.copyFileSync(source, target);",
        "",
      ].join("\n"),
      { mode: 0o700 },
    );
  }
  const editor = `${JSON.stringify(process.execPath)} ${JSON.stringify(
    editorPath,
  )} ${JSON.stringify(variantPath)}`;
  const draft = spawnSync(
    "guild",
    [
      "--mode",
      "json",
      "workspace",
      "context",
      "edit",
      workspaceId,
    ],
    {
      cwd: root,
      env: { ...process.env, EDITOR: editor },
      encoding: "utf8",
      timeout: timeoutMs,
    },
  );
  if (draft.status !== 0) {
    throw new Error(
      `Failed to create benchmark context draft: ${draft.stderr || draft.stdout}`,
    );
  }
  const contextIds = [
    ...`${draft.stdout}\n${draft.stderr}`.matchAll(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    ),
  ].map((match) => match[0]);
  const contextId = contextIds.at(-1);
  if (!contextId) {
    throw new Error(
      `Guild did not return a context draft ID: ${draft.stdout || draft.stderr}`,
    );
  }
  const published = spawnSync(
    "guild",
    [
      "--mode",
      "json",
      "workspace",
      "context",
      "publish",
      workspaceId,
      contextId,
    ],
    {
      cwd: root,
      encoding: "utf8",
      timeout: timeoutMs,
    },
  );
  if (published.status !== 0) {
    throw new Error(
      `Failed to publish benchmark context ${contextId}: ${
        published.stderr || published.stdout
      }`,
    );
  }
  return contextId;
}

async function waitForPublishedContext(
  workspaceId,
  contextId,
  expectedContent,
) {
  const expectedMarker =
    expectedContent.match(/^# .+$/m)?.[0] ?? expectedContent.slice(0, 80);
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const current = guildJson(["workspace", "get", workspaceId]);
    if (
      current.context?.id === contextId &&
      String(current.context?.compiled ?? "").includes(expectedMarker)
    ) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(
    `Published context ${contextId} did not become active within 60 seconds.`,
  );
}

async function runSpecialistEvaluation({
  route,
  variant,
  contextId,
  workspaceId,
  artifactDir: artifacts,
  evidenceDir: evidence,
  validateSpecialistArtifact,
}) {
  const packagePath = path.join(root, "agents", route.packageDir);
  const bundlePath = path.join(packagePath, "agent.js.gz");
  const input = {
    type: "text",
    text: [
      route.prompt,
      "",
      `Benchmark variant: ${variant.id}.`,
      `Benchmark context revision: ${contextId}.`,
      "Return the complete standard seven-heading Marketing OS artifact.",
    ].join("\n"),
  };
  const command = [
    "agent",
    "test",
    "--workspace",
    workspaceId,
    "--events",
    "none",
    "--mode",
    "json",
    "--bundle",
    bundlePath,
    "--timeout",
    String(Math.ceil(timeoutMs / 1_000)),
  ];
  const result = await spawnWithInput(
    "guild",
    command,
    `${JSON.stringify(input)}\n`,
    packagePath,
    timeoutMs,
  );
  const combined = `${result.stdout}\n${result.stderr}`;
  const sessionId = combined.match(
    /Session:\s*([0-9a-f-]{36})/i,
  )?.[1];
  const evidencePath = path.join(
    evidence,
    `${variant.id}-${route.route}.json`,
  );
  const evidencePayload = {
    variant_id: variant.id,
    route: route.route,
    context_id: contextId,
    input,
    command,
    exit_code: result.status,
    timed_out: result.timedOut,
    stdout: result.stdout,
    stderr: result.stderr,
    session_id: sessionId ?? null,
  };

  let artifactText = "";
  let sessionEvidence;
  if (sessionId) {
    sessionEvidence = {
      session: guildJson(["session", "get", sessionId]),
      tasks: guildJson(["session", "tasks", sessionId]),
      events: guildJson([
        "session",
        "events",
        sessionId,
        "--events",
        "all",
        "--limit",
        "100",
      ]),
    };
    const userEvents = sessionEvidence.events.items ?? [];
    const messages = userEvents
      .filter((event) => event.type === "agent_notification_message")
      .map((event) =>
        typeof event.content === "string"
          ? event.content
          : event.content?.data ?? event.content?.text ?? "",
      )
      .filter((value) => typeof value === "string" && value.trim());
    artifactText = messages.at(-1)?.trim() ?? "";
  }
  evidencePayload.session_evidence = sessionEvidence ?? null;
  fs.writeFileSync(
    evidencePath,
    `${JSON.stringify(evidencePayload, null, 2)}\n`,
    { mode: 0o600 },
  );

  const artifactPath = path.join(
    artifacts,
    `${variant.id}-${route.route}.md`,
  );
  fs.writeFileSync(
    artifactPath,
    artifactText ||
      `# Missing artifact\n\nGuild run failed or returned no final message. Evidence: ${path.basename(
        evidencePath,
      )}\n`,
    { mode: 0o600 },
  );
  const validation = artifactText
    ? validateSpecialistArtifact(artifactText)
    : {
        valid: false,
        issues: [{ message: "Missing final artifact." }],
      };
  const artifactComplete =
    result.status === 0 &&
    validation.valid &&
    !/No specialist draft is returned|generated artifact did not pass/i.test(
      artifactText,
    );
  const unsupportedClaims = countUnqualifiedSensitiveClaims(artifactText);
  const unsupportedClaimLines =
    unqualifiedSensitiveClaimLines(artifactText);

  return {
    variant_id: variant.id,
    route: route.route,
    artifact_path: artifactPath,
    artifact_complete: artifactComplete,
    unsupported_claims: unsupportedClaims,
    unsupported_claim_lines: unsupportedClaimLines,
    session_id: sessionId ?? null,
    context_id: contextId,
    agent_version: "local_bundle:1.2.0",
    validation_errors: validation.issues.map((issue) => issue.message),
  };
}

function guildJson(args) {
  const result = spawnSync("guild", ["--mode", "json", ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `guild ${args.join(" ")} failed: ${result.stderr || result.stdout}`,
    );
  }
  return JSON.parse(result.stdout);
}

function spawnWithInput(command, args, input, cwd, timeout) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeout);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (status) => {
      clearTimeout(timer);
      resolve({
        status: status ?? 1,
        stdout,
        stderr,
        timedOut,
      });
    });
    child.stdin.end(input);
  });
}

async function mapConcurrent(values, limit, fn) {
  const results = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await fn(values[index], index);
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.max(1, Math.min(limit, values.length)) },
      () => worker(),
    ),
  );
  return results;
}

function relativeToOutput(file) {
  return path.relative(outputDir, file);
}

function parseOptions(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--workspace") parsed.workspace = values[++index];
    else if (value === "--baseline-workspace") {
      parsed.baselineWorkspace = values[++index];
    } else if (value === "--timeout-seconds") {
      parsed.timeoutSeconds = values[++index];
    } else if (value === "--concurrency") {
      parsed.concurrency = values[++index];
    } else if (value === "--variants") {
      parsed.variants = values[++index];
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  return parsed;
}
