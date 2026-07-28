#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import {
  countUnqualifiedSensitiveClaims,
  unqualifiedSensitiveClaimLines,
} from "./lib/context-benchmark-scoring.mjs";

const root = process.cwd();
const runDirectoryOption = option("--run-directory");
if (!runDirectoryOption) {
  throw new Error(
    "Usage: node scripts/reprocess-context-benchmark.mjs --run-directory <_private/context-benchmark/run>",
  );
}
const runDirectory = path.resolve(runDirectoryOption);
const originalManifestPath = path.join(runDirectory, "manifest.json");
const originalManifest = JSON.parse(
  fs.readFileSync(originalManifestPath, "utf8"),
);
const correctionLabel = nextCorrectionLabel(runDirectory);
const correctedArtifactDirectory = path.join(
  runDirectory,
  `artifacts-${correctionLabel}`,
);
fs.mkdirSync(correctedArtifactDirectory, {
  recursive: true,
  mode: 0o700,
});

const { validateSpecialistArtifact } = await import(
  path.join(root, "agents/messaging/dist/specialist-runtime.js")
);

const correctedEvaluations = [];
for (const evaluation of originalManifest.evaluations) {
  const evidencePath = path.join(
    runDirectory,
    "evidence",
    `${evaluation.variant_id}-${evaluation.route}.json`,
  );
  const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  const events = evidence.session_evidence?.events?.items ?? [];
  const artifactText = events
    .filter((event) => event.type === "agent_notification_message")
    .map((event) =>
      typeof event.content === "string"
        ? event.content
        : event.content?.data ?? event.content?.text ?? "",
    )
    .filter((value) => typeof value === "string" && value.trim())
    .at(-1)
    ?.trim();
  const correctedArtifactPath = path.join(
    correctedArtifactDirectory,
    `${evaluation.variant_id}-${evaluation.route}.md`,
  );
  fs.writeFileSync(
    correctedArtifactPath,
    artifactText ||
      "# Missing artifact\n\nThe preserved Guild events contain no final artifact.\n",
    { mode: 0o600 },
  );
  const validation = artifactText
    ? validateSpecialistArtifact(artifactText)
    : {
        valid: false,
        issues: [{ message: "Missing final artifact." }],
      };
  correctedEvaluations.push({
    ...evaluation,
    artifact_path: path.relative(runDirectory, correctedArtifactPath),
    artifact_complete:
      evidence.exit_code === 0 &&
      validation.valid &&
      !/No specialist draft is returned|generated artifact did not pass/i.test(
        artifactText ?? "",
      ),
    unsupported_claims: countUnqualifiedSensitiveClaims(
      artifactText ?? "",
    ),
    unsupported_claim_lines: unqualifiedSensitiveClaimLines(
      artifactText ?? "",
    ),
    validation_errors: validation.issues.map((issue) => issue.message),
  });
}

const correctedManifest = {
  ...originalManifest,
  reprocessed_at: new Date().toISOString(),
  reprocessed_from: "manifest.json",
  correction:
    "Final Guild artifacts are carried in agent_notification_message.content.data for local-bundle test sessions.",
  claim_scorer: "unqualified_sensitive_claims_v2",
  evaluations: correctedEvaluations,
};
const correctedManifestPath = path.join(
  runDirectory,
  `manifest-${correctionLabel}.json`,
);
fs.writeFileSync(
  correctedManifestPath,
  `${JSON.stringify(correctedManifest, null, 2)}\n`,
  { mode: 0o600 },
);
const benchmark = spawnSync(
  process.execPath,
  [
    path.join(root, "scripts/benchmark-context-variants.mjs"),
    "--manifest",
    correctedManifestPath,
  ],
  {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  },
);
const correctedReportPath = path.join(
  runDirectory,
  `report-${correctionLabel}.json`,
);
fs.writeFileSync(
  correctedReportPath,
  benchmark.stdout || "{}\n",
  { mode: 0o600 },
);
const report = JSON.parse(benchmark.stdout || "{}");
console.log(
  JSON.stringify(
    {
      run_directory: runDirectory,
      corrected_manifest: correctedManifestPath,
      corrected_report: correctedReportPath,
      selected_variant: report.selected_variant ?? null,
      release_gate: report.release_gate ?? "blocked",
      results: report.results?.map((result) => ({
        id: result.id,
        approximate_tokens: result.approximate_tokens,
        lost_golden_facts: result.lost_golden_facts,
        complete_routes: result.specialist_evaluations.filter(
          (item) => item.complete,
        ).length,
        unsupported_claims: result.unsupported_claims,
      })),
    },
    null,
    2,
  ),
);
if (benchmark.status !== 0) process.exit(benchmark.status ?? 1);

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function nextCorrectionLabel(directory) {
  let attempt = 1;
  while (true) {
    const label = attempt === 1 ? "corrected" : `corrected-${attempt}`;
    if (
      !fs.existsSync(path.join(directory, `manifest-${label}.json`)) &&
      !fs.existsSync(path.join(directory, `report-${label}.json`)) &&
      !fs.existsSync(path.join(directory, `artifacts-${label}`))
    ) {
      return label;
    }
    attempt += 1;
  }
}
