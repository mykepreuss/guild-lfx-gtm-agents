#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { REQUIRED_OUTPUT_HEADINGS, validateArtifactText } from "./lib/suite-contracts.mjs";

const manifestPath = option("--manifest");
if (!manifestPath) {
  console.error("Usage: node scripts/benchmark-context-variants.mjs --manifest <benchmark-manifest.json>");
  process.exit(2);
}

const absoluteManifest = path.resolve(manifestPath);
const manifestDirectory = path.dirname(absoluteManifest);
const manifest = JSON.parse(fs.readFileSync(absoluteManifest, "utf8"));
const expectedVariantIds = ["current", "compressed", "pointer_minimum"];
const expectedRoutes = [
  "market_signal",
  "icp",
  "audience_segmentation",
  "messaging",
  "branding_pitch_deck",
  "social_monitoring_content",
  "campaigns_paid_media",
];

assertExactSet(
  manifest.variants?.map((variant) => variant.id),
  expectedVariantIds,
  "variants",
);
if (!Array.isArray(manifest.golden_facts) || manifest.golden_facts.length === 0) {
  throw new Error("golden_facts must contain the compliance, pricing, proof, and blocked-action facts.");
}

const evaluations = new Map();
for (const evaluation of manifest.evaluations ?? []) {
  evaluations.set(`${evaluation.variant_id}:${evaluation.route}`, evaluation);
}

const results = manifest.variants.map((variant) => {
  const text = readRelative(variant.path);
  const lostGoldenFacts = manifest.golden_facts
    .filter((fact) => !(fact.patterns ?? []).every((pattern) => new RegExp(pattern, "i").test(text)))
    .map((fact) => fact.id);
  const specialistEvaluations = expectedRoutes.map((route) => {
    const evaluation = evaluations.get(`${variant.id}:${route}`);
    if (!evaluation) {
      return {
        route,
        complete: false,
        unsupported_claims: Number.POSITIVE_INFINITY,
        conflict_recall: 0,
        validation_errors: ["Missing specialist evaluation."],
      };
    }
    const artifactText = readRelative(evaluation.artifact_path);
    const validation = validateArtifactText(artifactText, {
      requireEvidenceMode: true,
      requireSafetyEnvelope: true,
    });
    const expectedConflicts = evaluation.expected_conflicts ?? 0;
    const detectedConflicts = evaluation.detected_conflicts ?? 0;
    return {
      route,
      complete:
        evaluation.artifact_complete === true &&
        REQUIRED_OUTPUT_HEADINGS.every((heading) => artifactText.includes(heading)) &&
        validation.valid,
      unsupported_claims: evaluation.unsupported_claims ?? Number.POSITIVE_INFINITY,
      conflict_recall: expectedConflicts === 0 ? 1 : detectedConflicts / expectedConflicts,
      validation_errors: validation.errors,
    };
  });
  return {
    id: variant.id,
    approximate_tokens: Math.ceil(text.length / 4),
    lost_golden_facts: lostGoldenFacts,
    artifact_complete: specialistEvaluations.every((evaluation) => evaluation.complete),
    unsupported_claims: specialistEvaluations.reduce(
      (total, evaluation) => total + evaluation.unsupported_claims,
      0,
    ),
    minimum_conflict_recall: Math.min(
      ...specialistEvaluations.map((evaluation) => evaluation.conflict_recall),
    ),
    specialist_evaluations: specialistEvaluations,
  };
});

const baseline = results.find((result) => result.id === "current");
if (!baseline) throw new Error("The current baseline variant is required.");
const eligible = results
  .filter(
    (result) =>
      result.lost_golden_facts.length === 0 &&
      result.artifact_complete &&
      result.unsupported_claims <= baseline.unsupported_claims &&
      result.minimum_conflict_recall >= baseline.minimum_conflict_recall,
  )
  .sort((left, right) => left.approximate_tokens - right.approximate_tokens);

const report = {
  schema_version: "1.0",
  generated_at: new Date().toISOString(),
  thresholds: {
    routes: expectedRoutes,
    zero_lost_golden_facts: true,
    artifact_completeness_required: true,
    unsupported_claims_must_not_exceed_current: true,
    conflict_recall_must_not_worsen: true,
  },
  results,
  selected_variant: eligible[0]?.id ?? null,
  release_gate: eligible.length > 0 ? "pass" : "blocked",
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (eligible.length === 0) process.exit(1);

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readRelative(relativePath) {
  if (typeof relativePath !== "string" || !relativePath) {
    throw new Error("Every variant and evaluation requires a path.");
  }
  return fs.readFileSync(path.resolve(manifestDirectory, relativePath), "utf8");
}

function assertExactSet(actual, expected, label) {
  if (
    !Array.isArray(actual) ||
    actual.length !== expected.length ||
    expected.some((value) => !actual.includes(value))
  ) {
    throw new Error(`${label} must contain exactly: ${expected.join(", ")}`);
  }
}
