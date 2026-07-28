#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { MemoryMarketingOsStateAdapter } from "../services/guild-marketing-os-state/memory-adapter.mjs";

const rootDir = process.cwd();
const fixturePath = path.join(rootDir, "scripts/fixtures/webflow-company-profile.md");
const fixture = fs.readFileSync(fixturePath, "utf8");
const foundationDir = path.join(rootDir, "agents/foundation-setup");

const build = spawnSync("npm", ["run", "build"], {
  cwd: foundationDir,
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});

if (build.status !== 0) {
  process.stderr.write(`${build.stdout ?? ""}${build.stderr ?? ""}`);
  process.exit(build.status ?? 1);
}

const {
  default: foundationAgent,
  cleanApprovedSourceForWorkspaceContext,
  stripCitationMarkers,
  removeFencedBlocks,
  convertMarkdownTablesToBullets,
  replaceManagedWorkspaceContextBlock,
} = await import(path.join(foundationDir, "dist/agent.js"));

let state;
let createdContextBody = "";
let bridgePublishInput;
let bridgePublishCalls = 0;
let bridgeScenario = "successful";
let stateServiceScenario = "successful";
let llmScenario = "successful";
let compactionCalls = 0;
let auditCalls = 0;
let workspaceReadMode = "published";
let stateAdapter = new MemoryMarketingOsStateAdapter();
const stateTenant = {
  organization_id: "organization_test",
  workspace_id: "workspace_test",
};

const compactedBrief = `
### Company Identity
Company name: Webflow. Additional legal-entity, scale, funding, and location claims are review-required and withheld from always-on reusable context.

### Positioning And Strategy
Category and positioning remain TBD until the review-required source claims receive separate evidence and owner approval.

### Products And Platform
Named product and platform details from the raw source are review-required and withheld from reusable context.

### Audiences And Buying Motion
Primary audiences remain reviewable hypotheses pending approved segment evidence.

### Pricing And Commercial Model
Pricing and commercial claims are review-required and omitted from always-on reusable context.

### Proof Points
Quantified proof and customer outcome claims are review-required and omitted from always-on reusable context.

### Compliance And Constraints
Legal, privacy, security, and compliance claims are review-required. Do not reuse them as public claims without separate evidence and owner review.

### Competitive Landscape
Competitive claims and differentiation remain TBD until approved comparison evidence is available.

### Open Questions And Unknowns
Approved description, category, proof, pricing, trust claims, and audience validation remain open.

### Downstream Operating Rules
Treat only evidence-labeled approved reusable facts as public-claim inputs. The encrypted raw source remains available through its durable source reference. Do not take live publishing, spend, CRM, credential, trigger, install, or visibility actions.
`.trim();

const sourceCorpusSummary = [
  "Compacted from the durably approved reusable Company Context artifact.",
  "The encrypted raw source and review-required claims were intentionally excluded from always-on workspace context.",
].join("\n");

const task = {
  sessionId: "session_test",
  console,
  llm: {
    async generateText({ prompt }) {
      if (prompt.includes("Workspace Context Compaction Audit")) {
        auditCalls += 1;
        if (llmScenario === "unsupported_claim") {
          return {
            text: JSON.stringify({
              lost_material_facts: [],
              unsupported_new_claims: ["Unsupported claim: Webflow guarantees rankings."],
              overcompressed_nuance: [],
              recommended_fixes: ["Remove the unsupported ranking claim."],
            }),
          };
        }
        if (llmScenario === "repair_addendum" && auditCalls <= 2) {
          return {
            text: JSON.stringify({
              lost_material_facts: ["Webflow headquarters address: 398 11th Street, Floor 2, San Francisco, CA 94103."],
              unsupported_new_claims: [],
              overcompressed_nuance: ["Preserve that additional location details remain review-required rather than approved reusable facts."],
              recommended_fixes: ["Append the missing material fact as review-required, not reusable."],
            }),
          };
        }
        if (auditCalls === 1) {
          return {
            text: JSON.stringify({
              lost_material_facts: ["Review-required source claims are intentionally withheld from reusable context."],
              unsupported_new_claims: [],
              overcompressed_nuance: [],
              recommended_fixes: ["Preserve the withheld-claims rule in Downstream Operating Rules."],
            }),
          };
        }
        return {
          text: JSON.stringify({
            lost_material_facts: [],
            unsupported_new_claims: [],
            overcompressed_nuance: [],
            recommended_fixes: [],
          }),
        };
      }

      if (prompt.includes("Workspace Context Compaction")) {
        compactionCalls += 1;
        return {
          text: JSON.stringify({
            workspace_context_brief:
              llmScenario === "unqualified_sensitive_brief"
                ? compactedBrief.replace(
                    "Pricing and commercial claims are review-required and omitted from always-on reusable context.",
                    "Webflow has $335M in funding and is SOC 2 Type II compliant.",
                  )
                : compactedBrief,
            source_corpus_summary: sourceCorpusSummary,
            estimated_token_reduction: "Reduced from full approved source corpus to concise always-on workspace context brief.",
          }),
        };
      }

      return { text: "not json" };
    },
  },
  async save(nextState) {
    state = nextState;
  },
  async restore() {
    return state;
  },
  tools: {
    async guild_get_session() {
      return {
        id: "session_test",
        workspace: {
          id: "workspace_test",
          name: "marketing-os",
          full_name: "example/marketing-os",
          owner: { id: "owner_test", type: "organization", name: "example" },
        },
        session_type: "chat",
        context_id: workspaceReadMode === "published" ? "context_published" : null,
        created_at: "2026-07-28T00:00:00.000Z",
        updated_at: "2026-07-28T00:00:00.000Z",
      };
    },
    async guild_get_workspace() {
      const managedContext =
        workspaceReadMode === "published"
          ? [
              "<!-- guild-marketing-os-context:start -->",
              "# Guild Marketing OS Managed Company Context",
              "Status: published",
              "Company: Webflow",
              "## Workspace Context Brief",
              "Approved compact context.",
              "<!-- guild-marketing-os-context:end -->",
            ].join("\n")
          : "No approved Marketing OS company context.";
      return {
        id: "workspace_test",
        name: "marketing-os",
        full_name: "example/marketing-os",
        owner: { id: "owner_test", type: "organization", name: "example" },
        context: {
          id: workspaceReadMode === "published" ? "context_published" : null,
          compiled: managedContext,
          generated: "",
          manual: managedContext,
        },
      };
    },
    async marketing_os_source_store(input) {
      if (stateServiceScenario === "source_unavailable") {
        throw new Error("tenant-bound source storage unavailable");
      }
      return {
        data: await stateAdapter.storeSource(stateTenant, {
          ...input,
          uploader: "user_test",
        }),
      };
    },
    async marketing_os_source_get({ sourceId, revision }) {
      if (stateServiceScenario === "source_read_unavailable") {
        throw new Error("encrypted source read unavailable");
      }
      return {
        data: await stateAdapter.getSource(
          stateTenant,
          sourceId,
          revision,
        ),
      };
    },
    async marketing_os_context_artifact_store(input) {
      if (stateServiceScenario === "artifact_unavailable") {
        throw new Error("tenant-bound artifact storage unavailable");
      }
      return {
        data: await stateAdapter.storeArtifact(stateTenant, input),
      };
    },
    async marketing_os_context_artifact_get({ artifactId, revision }) {
      return {
        data: await stateAdapter.getArtifact(
          stateTenant,
          artifactId,
          revision,
        ),
      };
    },
    async marketing_os_context_artifact_approve({
      artifactId,
      ...input
    }) {
      if (stateServiceScenario === "approval_unavailable") {
        throw new Error("tenant-bound artifact approval unavailable");
      }
      return {
        data: await stateAdapter.approveArtifact(stateTenant, {
          ...input,
          artifact_id: artifactId,
          actor: "user_test",
        }),
      };
    },
    async marketing_os_context_read() {
      return {
        data: (await stateAdapter.readContextSnapshot(stateTenant)) ?? null,
      };
    },
    async marketing_os_context_publish(input) {
      bridgePublishCalls += 1;
      bridgePublishInput = input;
      if (bridgeScenario === "unavailable") {
        throw new Error("delegated state-service context publisher unavailable");
      }
      const currentManualContext = [
        "# Existing Workspace Context",
        "",
        "Keep this intro.",
        "",
        "<!-- guild-marketing-os-context:start -->",
        "old managed block",
        "<!-- guild-marketing-os-context:end -->",
        "",
        "Keep this outro.",
      ].join("\n");
      return {
        data: await stateAdapter.publishContextSnapshot(
          stateTenant,
          {
            ...input,
            actor: "user_test",
          },
          {
            publisher: async ({ request }) => {
              createdContextBody = replaceManagedWorkspaceContextBlock(
                currentManualContext,
                request.compiled_brief,
              );
              return {
                guild_context_id: "context_published",
                rollback_context_id: "context_old",
              };
            },
          },
        ),
      };
    },
  },
};

function guildChatEnvelope(text) {
  return JSON.stringify({
    type: "text",
    text: [
      "* This session was started at 18:50:27 (24h, UTC) on Sunday, June 28, 2026.",
      "* The current Guild workspace is named `guild-marketing-os` (Guild workspace_id 019f001c-cb37-3bb9-0000-31e5e134d4c3).",
      "* Guild frontend URL: https://app.guild.ai",
      "* The current user with whom you're interacting has Guild username `michaelpreuss` (Guild user_id 019cbabd-1669-0175-0000-6330e039ebd1).",
      "",
      "```json",
      "{",
      "  \"workspace_capabilities\": {",
      "    \"configured_integrations\": [",
      "      { \"service\": \"github\", \"status\": \"configured\" },",
      "      { \"service\": \"slack\", \"status\": \"configured\" }",
      "    ]",
      "  }",
      "}",
      "```",
      "",
      text,
    ].join("\n"),
  });
}

function guildChatEnvelopeWithManagedContext(text) {
  const injectedManagedContext = [
    "<!-- guild-marketing-os-context:start -->",
    "# Guild Marketing OS Managed Company Context",
    "",
    "Status: published",
    "Company: Webflow",
    "",
    "## Workspace Context Brief",
    "Previously published compacted Webflow context. It mentions published workspace context state and should not be classified as the user's current request.",
    "<!-- guild-marketing-os-context:end -->",
    "",
    text,
  ].join("\n");
  return guildChatEnvelope(injectedManagedContext);
}

function guildChatEnvelopeWithNeutralWorkspaceContext(text) {
  return guildChatEnvelope([
    "Guild Marketing OS validation workspace. No company-specific workspace context is currently approved.",
    "",
    text,
  ].join("\n"));
}

function routedCompanyContextBuilderSource(text) {
  return [
    "Use guild-marketing-os-company-context-builder / Company Context Builder for this request. Treat the following Webflow Company Profile block as the source packet for a Company Context Approval Packet. Do not publish yet.",
    "",
    text,
  ].join("\n");
}

state = undefined;
const injectedManagedRefresh = await foundationAgent.start(
  {
    type: "text",
    text: [
      "<!-- guild-marketing-os-context:start -->",
      "# Guild Marketing OS Managed Company Context",
      "Status: published",
      "Company: Webflow",
      "Approved description: Webflow is a website experience platform for modern marketing, design, and development teams.",
      "Primary audiences: Marketers, designers, developers, agencies, and enterprise digital teams.",
      "Current goals: Increase marketing velocity, protect brand quality, improve conversion, and preserve developer extensibility.",
      "Proof-backed claims: Fivetran improved marketing speed-to-market; Retool increased demo bookings through web testing.",
      "Channels in scope: Website, search, answer engines, social, content, and paid media planning.",
      "Anything not approved for reuse: Unsupported financial, performance, security, compliance, legal, or guarantee claims.",
      "## Workspace Context Brief",
      "Use this published context as the current approved company source. Keep all downstream work draft-only and preserve proof constraints.",
      "<!-- guild-marketing-os-context:end -->",
      "",
      "Refresh the company context readiness check from the approved workspace context. Keep it context-only and draft-only. Do not publish.",
    ].join("\n"),
  },
  task,
);
assert.equal(injectedManagedRefresh.type, "output");
assert.match(injectedManagedRefresh.output.text, /Company Context Approval Packet/);
assert.match(injectedManagedRefresh.output.text, /Company: Webflow/);
assert.match(injectedManagedRefresh.output.text, /approved_in_session: false/);
assert.doesNotMatch(injectedManagedRefresh.output.text, /attachment_unreadable/);
assert.doesNotMatch(injectedManagedRefresh.output.text, /cannot read the attachment/i);
assert.equal(state.lastOutput.conversationIntent, "source_available");
assert.equal(state.lastSourceText, undefined);

async function runPublishFlow(label, wrapInput) {
  state = undefined;
  stateAdapter = new MemoryMarketingOsStateAdapter();
  createdContextBody = "";
  bridgePublishInput = undefined;
  bridgePublishCalls = 0;
  bridgeScenario = "successful";
  stateServiceScenario = "successful";
  llmScenario = "successful";
  compactionCalls = 0;
  auditCalls = 0;

  const first = await foundationAgent.start({ type: "text", text: wrapInput(fixture) }, task);
  assert.equal(first.type, "output", label);
  assert.match(first.output.text, /Company Context Approval Packet/, label);
  assert.match(first.output.text, /Company: Webflow/, label);
  assert.match(first.output.text, /saved_to_workspace_context: false/, label);
  assert.match(first.output.text, /saved_to_context_artifacts: true/, label);
  assert.match(first.output.text, /source_references: [^T]/, label);
  assert.match(first.output.text, /context_artifact_references: [^T]/, label);
  assert.equal(state.lastOutput.statusPayload.companyName, "Webflow", `${label}: company name should resolve from fixture heading`);
  assert.equal(state.lastSourceText, undefined, `${label}: raw source must not remain in session state`);
  const storedSource = await stateAdapter.getSource(
    stateTenant,
    state.durableSourceId,
    state.durableSourceRevision,
  );
  assert.equal(storedSource.raw_source, fixture, `${label}: encrypted source should round-trip only through the tenant-bound adapter`);
  const reviewArtifact = await stateAdapter.getArtifact(
    stateTenant,
    state.durableContextArtifactId,
    state.durableContextArtifactRevision,
  );
  assert.equal(reviewArtifact.status, "ready_for_review", `${label}: initial artifact must be review ready`);
  assert.equal(
    reviewArtifact.consumed_source_revisions[0],
    `${storedSource.source_id}:${storedSource.revision}`,
    `${label}: artifact must retain exact source provenance`,
  );

  const exactArtifactApproval = "Context approved save to workspace context";
  const approval = await foundationAgent.start({ type: "text", text: wrapInput(exactArtifactApproval) }, task);
  assert.equal(approval.type, "output", label);
  assert.match(approval.output.text, /approved_in_session: true/, label);
  assert.match(approval.output.text, /durably approved/, label);
  assert.match(approval.output.text, /workspace_context_status: approved_pending_publish/, label);
  assert.match(approval.output.text, /publish approved context to workspace context/, label);
  assert.equal(state.approvedSourceText, undefined, `${label}: approved raw source must remain only in encrypted storage`);
  const approvedArtifact = await stateAdapter.getArtifact(
    stateTenant,
    state.durableContextArtifactId,
    state.durableContextArtifactRevision,
  );
  assert.equal(approvedArtifact.status, "approved", `${label}: durable artifact should be approved`);
  assert.equal(
    approvedArtifact.approvals[0].exact_approval_text,
    exactArtifactApproval,
    `${label}: exact artifact approval text must be retained`,
  );

  const publish = await foundationAgent.start({ type: "text", text: wrapInput("publish approved context to workspace context") }, task);
  assert.equal(publish.type, "output", label);
  assert.match(publish.output.text, /saved_to_workspace_context: true/, label);
  assert.match(publish.output.text, /workspace_context_id: context_published/, label);
  assert.match(publish.output.text, /workspace_context_draft_id: context_published/, label);
  assert.match(publish.output.text, /workspace_context_previous_id: context_old/, label);
  assert.match(publish.output.text, /workspace_context_publish_path: official_guild_tools/, label);
  assert.equal(state.workspaceContextStatus, "published", label);
  assert.equal(state.workspaceContextId, "context_published", label);
  assert.equal(state.workspaceContextDraftId, "context_published", label);
  assert.equal(state.workspaceContextPreviousId, "context_old", label);
  assert.equal(state.workspaceContextPublishPath, "official_guild_tools", label);
  assert.equal(state.durablePublishedContextRevision, 1, label);
  assert.equal(bridgePublishCalls, 1, `${label}: should publish once through state service`);
  assert.equal(bridgePublishInput.artifact_id, state.durableContextArtifactId, label);
  assert.equal(bridgePublishInput.artifact_revision, 1, label);
  assert.equal(bridgePublishInput.expected_current_revision, null, label);
  assert.equal(bridgePublishInput.approval_text, "publish approved context to workspace context", label);
  assert.match(bridgePublishInput.compiled_brief, /## Workspace Context Brief/, label);
  assert.doesNotMatch(bridgePublishInput.compiled_brief, /This session was started/, label);
  assert.ok(!bridgePublishInput.compiled_brief.includes(fixture), `${label}: publish payload must not include raw fixture`);
  assert.doesNotMatch(bridgePublishInput.compiled_brief, /cite/, label);
  assert.match(createdContextBody, /Keep this intro\./, label);
  assert.match(createdContextBody, /Keep this outro\./, label);
  assert.doesNotMatch(createdContextBody, /old managed block/, label);
  assert.doesNotMatch(createdContextBody, /This session was started/, label);
  assert.match(createdContextBody, /<!-- guild-marketing-os-context:start -->/, label);
  assert.match(createdContextBody, /<!-- guild-marketing-os-context:end -->/, label);
  assert.equal(state.approvedSourceText, undefined, `${label}: published raw source must not be copied into session state`);
  assert.ok(!createdContextBody.includes(fixture), `${label}: published managed block must not include the raw full approved source fixture`);
  assert.doesNotMatch(createdContextBody, /cite/, label);
  assert.match(createdContextBody, /## Workspace Context Brief/, label);
  assert.match(createdContextBody, /## Source Corpus Summary/, label);
  assert.match(createdContextBody, /## Compaction Audit/, label);
  assert.doesNotMatch(createdContextBody, /## Approved Source Corpus/, label);
  const contextSnapshot = await stateAdapter.readContextSnapshot(stateTenant);
  assert.equal(contextSnapshot.published_context_revision, 1, label);
  assert.equal(
    contextSnapshot.approval.exact_approval_text,
    "publish approved context to workspace context",
    `${label}: context publication must retain the exact second approval phrase`,
  );
  assert.deepEqual(
    contextSnapshot.source_references,
    [`${storedSource.source_id}:${storedSource.revision}`],
    `${label}: published context must retain source provenance`,
  );
  assert.match(createdContextBody, /Company name: Webflow/, label);
  assert.match(createdContextBody, /review-required and withheld/, label);
  assert.match(createdContextBody, /encrypted raw source/i, label);
  for (const withheldClaim of [
    "3.5M users",
    "$335M",
    "99.99% uptime",
    "SOC 2 Type II",
    "ISO 27001",
    "not HIPAA",
    "Orangetheory Fitness",
    "Fivetran",
    "Retool",
    "Wave",
    "IONITY",
  ]) {
    assert.ok(
      !createdContextBody.includes(withheldClaim),
      `${label}: always-on context must withhold review-required claim ${withheldClaim}`,
    );
  }
  assert.equal(compactionCalls, 2, `${label}: publish should regenerate once after lost material facts`);
  assert.equal(auditCalls, 2, `${label}: publish should audit initial and regenerated compactions`);
}

await runPublishFlow("direct input", (text) => text);
await runPublishFlow("Guild chat envelope input", guildChatEnvelope);
await runPublishFlow("Guild chat envelope with injected managed context", guildChatEnvelopeWithManagedContext);

state = undefined;
stateAdapter = new MemoryMarketingOsStateAdapter();
stateServiceScenario = "source_unavailable";
const sourcePersistenceBlocked = await foundationAgent.start(
  { type: "text", text: fixture },
  task,
);
assert.equal(sourcePersistenceBlocked.type, "output", "source persistence unavailable");
assert.match(
  sourcePersistenceBlocked.output.text,
  /saved_to_context_artifacts: false/,
  "source persistence unavailable",
);
assert.match(
  sourcePersistenceBlocked.output.text,
  /Durable source and artifact storage failed/,
  "source persistence unavailable",
);
assert.equal(
  state.durableContextArtifactId,
  undefined,
  "source persistence failure must not create an approvable artifact reference",
);

state = undefined;
stateAdapter = new MemoryMarketingOsStateAdapter();
stateServiceScenario = "successful";
await foundationAgent.start({ type: "text", text: fixture }, task);
stateServiceScenario = "approval_unavailable";
const durableApprovalBlocked = await foundationAgent.start(
  {
    type: "text",
    text: "Context approved save to workspace context",
  },
  task,
);
assert.equal(durableApprovalBlocked.type, "output", "artifact approval unavailable");
assert.match(
  durableApprovalBlocked.output.text,
  /approved_in_session: false/,
  "artifact approval unavailable",
);
assert.match(
  durableApprovalBlocked.output.text,
  /Durable artifact approval failed/,
  "artifact approval unavailable",
);
assert.equal(
  state.approvedOutput,
  undefined,
  "failed durable approval must not leave a publishable approved output",
);
assert.equal(
  (
    await stateAdapter.getArtifact(
      stateTenant,
      state.durableContextArtifactId,
      state.durableContextArtifactRevision,
    )
  ).status,
  "ready_for_review",
  "failed approval must leave the durable artifact review ready",
);
stateServiceScenario = "successful";

state = undefined;
stateAdapter = new MemoryMarketingOsStateAdapter();
createdContextBody = "";
bridgePublishInput = undefined;
bridgePublishCalls = 0;
bridgeScenario = "successful";
llmScenario = "successful";
compactionCalls = 0;
auditCalls = 0;

const browserRoutedFirst = await foundationAgent.start({
  type: "text",
  text: guildChatEnvelopeWithNeutralWorkspaceContext(routedCompanyContextBuilderSource(fixture)),
}, task);
assert.equal(browserRoutedFirst.type, "output", "browser routed fixture input");
assert.match(browserRoutedFirst.output.text, /Conversation intent: source_available/, "browser routed fixture input");
assert.match(browserRoutedFirst.output.text, /Company: Webflow/, "browser routed fixture input");
assert.equal(state.lastOutput.statusPayload.companyName, "Webflow", "browser routed fixture should resolve company name");
assert.equal(state.lastSourceText, undefined, "browser routed raw source should remain only in encrypted storage");

const browserRoutedApproval = await foundationAgent.start({
  type: "text",
  text: guildChatEnvelopeWithNeutralWorkspaceContext("Context approved save to workspace context"),
}, task);
assert.equal(browserRoutedApproval.type, "output", "browser routed approval");
assert.match(browserRoutedApproval.output.text, /approved_in_session: true/, "browser routed approval");
assert.equal(state.approvedSourceText, undefined, "browser routed approval should not copy raw source into session state");

const browserRoutedPublish = await foundationAgent.start({
  type: "text",
  text: guildChatEnvelopeWithNeutralWorkspaceContext("publish approved context to workspace context"),
}, task);
assert.equal(browserRoutedPublish.type, "output", "browser routed publish");
assert.match(browserRoutedPublish.output.text, /saved_to_workspace_context: true/, "browser routed publish");
assert.match(browserRoutedPublish.output.text, /workspace_context_publish_path: official_guild_tools/, "browser routed publish");
assert.equal(state.workspaceContextStatus, "published", "browser routed publish should publish");
assert.equal(bridgePublishCalls, 1, "browser routed publish should publish once through bridge");
assert.equal(state.approvedSourceText, undefined, "browser routed publish should retrieve raw source only for compaction");
assert.ok(!createdContextBody.includes(fixture), "browser routed published context must not include raw fixture");
assert.doesNotMatch(createdContextBody, /cite/, "browser routed published context should strip citation artifacts");

state = undefined;
stateAdapter = new MemoryMarketingOsStateAdapter();
createdContextBody = "";
bridgePublishInput = undefined;
bridgePublishCalls = 0;
bridgeScenario = "successful";
llmScenario = "repair_addendum";
compactionCalls = 0;
auditCalls = 0;

const repairFirst = await foundationAgent.start({ type: "text", text: fixture }, task);
assert.equal(repairFirst.type, "output", "audit repair first input");
const repairApproval = await foundationAgent.start({ type: "text", text: "Context approved save to workspace context" }, task);
assert.equal(repairApproval.type, "output", "audit repair approval");
const repairPublish = await foundationAgent.start({ type: "text", text: "publish approved context to workspace context" }, task);
assert.equal(repairPublish.type, "output", "audit repair publish");
assert.match(repairPublish.output.text, /saved_to_workspace_context: true/, "audit repair publish");
assert.equal(state.workspaceContextStatus, "published", "audit repair should publish after deterministic addendum");
assert.equal(compactionCalls, 2, "audit repair should still regenerate once with the LLM");
assert.equal(auditCalls, 3, "audit repair should audit initial, regenerated, and addendum-repaired briefs");
assert.match(createdContextBody, /Audit-Preserved Facts And Nuance/, "audit repair should append an addendum");
assert.match(createdContextBody, /398 11th Street, Floor 2, San Francisco, CA 94103/, "audit repair should include the lost material fact");

const approvedStateForAuditTests = structuredClone(state);

state = undefined;
stateAdapter = new MemoryMarketingOsStateAdapter();
const cliArtifactFirst = await foundationAgent.start({ type: "text", text: guildChatEnvelopeWithManagedContext(`chat ${fixture}`) }, task);
assert.equal(cliArtifactFirst.type, "output", "Guild chat initial command artifact");
assert.match(cliArtifactFirst.output.text, /Conversation intent: source_available/, "Guild chat initial command artifact");
assert.match(cliArtifactFirst.output.text, /Company: Webflow/, "Guild chat initial command artifact");
assert.equal(state.lastOutput.statusPayload.companyName, "Webflow", "CLI artifact should not hide fixture heading company name");
assert.equal(state.lastSourceText, undefined, "CLI raw source should remain only in encrypted storage");

assert.equal(stripCitationMarkers("A citeturn1 B"), "A  B", "citation markers should be stripped");
assert.equal(removeFencedBlocks("Keep\n```mermaid\ngraph TD\n```\nDone"), "Keep\n\nDone", "fenced diagram blocks should be removed");
assert.equal(
  convertMarkdownTablesToBullets("| Name | Evidence |\n|---|---|\n| Webflow | citeturn1 |\n").trim(),
  "- Name: Webflow",
  "markdown tables should convert to bullets before citation stripping when used directly",
);
const cleanedFixture = cleanApprovedSourceForWorkspaceContext(fixture);
assert.doesNotMatch(cleanedFixture, /cite/, "cleaned source should not include citation markers");
assert.doesNotMatch(cleanedFixture, /```mermaid/, "cleaned source should not include Mermaid blocks");
assert.doesNotMatch(cleanedFixture, /```text/, "cleaned source should not include pseudo-query blocks");
assert.match(cleanedFixture, /- Attribute: Legal entity; Current finding: Webflow, Inc\./, "cleaned source should collapse tables into bullets");

state = approvedStateForAuditTests;
createdContextBody = "";
bridgePublishInput = undefined;
bridgePublishCalls = 0;
bridgeScenario = "successful";
llmScenario = "unsupported_claim";
compactionCalls = 0;
auditCalls = 0;
const blockedPublish = await foundationAgent.start({ type: "text", text: "publish approved context to workspace context" }, task);
assert.equal(blockedPublish.type, "output", "unsupported claim audit");
assert.match(blockedPublish.output.text, /workspace_context_status: blocked/, "unsupported claim audit");
assert.match(blockedPublish.output.text, /Workspace context compaction audit did not pass/, "unsupported claim audit");
assert.equal(createdContextBody, "", "unsupported audit should block before workspace write");
assert.equal(bridgePublishCalls, 0, "unsupported audit should block before bridge publish");

state = approvedStateForAuditTests;
createdContextBody = "";
bridgePublishInput = undefined;
bridgePublishCalls = 0;
bridgeScenario = "successful";
llmScenario = "unqualified_sensitive_brief";
compactionCalls = 0;
auditCalls = 0;
const sensitiveBriefBlocked = await foundationAgent.start(
  { type: "text", text: "publish approved context to workspace context" },
  task,
);
assert.equal(
  sensitiveBriefBlocked.type,
  "output",
  "unqualified sensitive compaction",
);
assert.match(
  sensitiveBriefBlocked.output.text,
  /workspace_context_status: blocked/,
  "unqualified sensitive compaction",
);
assert.match(
  sensitiveBriefBlocked.output.text,
  /failed deterministic validation/,
  "unqualified sensitive compaction",
);
assert.equal(
  auditCalls,
  0,
  "unqualified sensitive compaction must block before an LLM audit can bless it",
);
assert.equal(
  bridgePublishCalls,
  0,
  "unqualified sensitive compaction must block before publication",
);

state = undefined;
stateAdapter = new MemoryMarketingOsStateAdapter();
stateServiceScenario = "successful";
bridgeScenario = "successful";
llmScenario = "successful";
compactionCalls = 0;
auditCalls = 0;
bridgePublishCalls = 0;
await foundationAgent.start({ type: "text", text: fixture }, task);
await foundationAgent.start(
  {
    type: "text",
    text: "Context approved save to workspace context",
  },
  task,
);
stateServiceScenario = "source_read_unavailable";
const sourceReadBlocked = await foundationAgent.start(
  {
    type: "text",
    text: "publish approved context to workspace context",
  },
  task,
);
assert.match(
  sourceReadBlocked.output.text,
  /workspace_context_status: blocked/,
  "encrypted source read unavailable",
);
assert.match(
  sourceReadBlocked.output.text,
  /encrypted approved source could not be retrieved/i,
  "encrypted source read unavailable",
);
assert.equal(compactionCalls, 0, "source read failure must block before compaction");
assert.equal(bridgePublishCalls, 0, "source read failure must block before publication");

state = undefined;
stateAdapter = new MemoryMarketingOsStateAdapter();
stateServiceScenario = "successful";
createdContextBody = "";
bridgePublishInput = undefined;
bridgePublishCalls = 0;
bridgeScenario = "unavailable";
llmScenario = "successful";
compactionCalls = 0;
auditCalls = 0;
const bridgeFirst = await foundationAgent.start({ type: "text", text: fixture }, task);
assert.equal(bridgeFirst.type, "output", "bridge unavailable setup");
const bridgeApproval = await foundationAgent.start({ type: "text", text: "Context approved save to workspace context" }, task);
assert.equal(bridgeApproval.type, "output", "bridge unavailable approval");
const bridgeBlocked = await foundationAgent.start({ type: "text", text: "publish approved context to workspace context" }, task);
assert.equal(bridgeBlocked.type, "output", "bridge unavailable publish");
assert.match(bridgeBlocked.output.text, /workspace_context_status: blocked/, "bridge unavailable publish");
assert.match(bridgeBlocked.output.text, /Workspace context publish did not complete/, "bridge unavailable publish");
assert.match(bridgeBlocked.output.text, /tenant-bound Marketing OS state service/, "state publisher unavailable publish");
assert.equal(bridgePublishCalls, 1, "state publisher unavailable publish should attempt delegated publication once");
assert.equal(createdContextBody, "", "bridge unavailable publish should not create a context body");
assert.equal(state.approvedSourceText, undefined, "failed publication should retain only the encrypted durable source for retry");
bridgeScenario = "successful";

state = undefined;
stateAdapter = new MemoryMarketingOsStateAdapter();
workspaceReadMode = "published";
const downstreamWithContext = await foundationAgent.start(
  {
    type: "text",
    text: "Create a messaging framework from our approved workspace context.",
  },
  task,
);
assert.equal(downstreamWithContext.type, "output", "downstream request with published context");
assert.match(downstreamWithContext.output.text, /Company Context Builder is context-only/, "downstream request with published context");
assert.match(downstreamWithContext.output.text, /Continue through Marketing OS Launcher or @mention Messaging/, "downstream request with published context");
assert.match(downstreamWithContext.output.text, /context_published/, "downstream request should report the resolved context revision");
assert.match(downstreamWithContext.output.text, /"conversationIntent": "downstream_request"/, "downstream request should use routing intent");
assert.doesNotMatch(downstreamWithContext.output.text, /# Company Context Approval Packet/, "downstream request must not create a new context packet");

state = undefined;
stateAdapter = new MemoryMarketingOsStateAdapter();
workspaceReadMode = "missing";
const downstreamWithoutContext = await foundationAgent.start(
  {
    type: "text",
    text: "Create a messaging framework for the company in this workspace.",
  },
  task,
);
assert.equal(downstreamWithoutContext.type, "output", "downstream request without published context");
assert.match(downstreamWithoutContext.output.text, /Company context is not approved yet/, "missing context should remain visibly blocked");
assert.match(downstreamWithoutContext.output.text, /Company: TBD/, "instruction text must not be parsed as a company name");
assert.doesNotMatch(downstreamWithoutContext.output.text, /Company: Create a messaging framework/, "instruction must not become company name");

console.log("Foundation state/publish test OK.");
