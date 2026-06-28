#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

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
let llmScenario = "successful";
let compactionCalls = 0;
let auditCalls = 0;

const compactedBrief = `
### Company Identity
Webflow, Inc. is a privately held Delaware corporation founded in 2013 and headquartered in San Francisco. Public context lists 900+ team members in 25 countries, 3.5M users, and $335M in total funding.

### Positioning And Strategy
Webflow has moved from visual development platform to Website Experience Platform and now an agentic web marketing platform for teams that need to build, manage, personalize, experiment, and connect revenue-driving web experiences.

### Products And Platform
Core products and surfaces include visual design, CMS, hosting, collaboration, Localization, Analyze, Optimize, AEO, Webflow Cloud, DevLink, Figma to Webflow, apps, APIs, webhooks, OAuth, and marketplace extensions.

### Audiences And Buying Motion
Primary audiences are marketers, designers / creative teams, developers / engineering leaders, agencies / freelancers, startups, and enterprise teams. The buyer center is marketing-led but requires engineering guardrails for governance and integration.

### Pricing And Commercial Model
Webflow runs a hybrid self-serve and enterprise model spanning free and paid Site plans, Workspace plans, add-ons such as Analyze, Optimize, and Localization, a Team plan, and custom Enterprise.

### Proof Points
Public proof includes Orangetheory Fitness cost savings, Fivetran speed-to-market gains, Retool demo-booking lift from testing, Wave conversion and traffic improvements, and IONITY active-user growth.

### Compliance And Constraints
Trust context includes SOC 2 Type II, ISO 27001, ISO 27017 and PCI materials, U.S. data storage, DPF/SCC/UK IDTA transfer mechanisms, encryption in transit and at rest, SSO, SCIM, JIT, audit log API, and a clear not HIPAA / no PHI constraint.

### Competitive Landscape
Named competitors and comparison references include WordPress, Framer, Contentful, Sitecore, Wix. Webflow's wedge is visual control, managed infrastructure, integrated CMS, optimization, governance, APIs, and AEO readiness.

### Open Questions And Unknowns
Revenue figures are secondary estimates, public forward growth targets are unspecified, audited financials are unavailable, and education/nonprofit vertical targeting is unspecified in reviewed official sources.

### Downstream Operating Rules
Treat this compacted Guild workspace context as the first source of truth for Webflow-specific facts. Use the retained approved source corpus only when detailed provenance is needed. Do not take live publishing, spend, CRM, credential, trigger, install, or visibility actions without explicit approval.
`.trim();

const sourceCorpusSummary = [
  "Compacted from the approved Webflow Company Profile covering company identity, product, pricing, audiences, channels, funding, technology, compliance, competitors, customers, proof, and knowledge graph design.",
  "Raw citation markers, Mermaid diagrams, pseudo-query examples, code blocks, and long table formatting were stripped before LLM compaction.",
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
        if (auditCalls === 1) {
          return {
            text: JSON.stringify({
              lost_material_facts: ["Webflow is not HIPAA compliant / no PHI."],
              unsupported_new_claims: [],
              overcompressed_nuance: [],
              recommended_fixes: ["Add the HIPAA limitation to Compliance And Constraints."],
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
            workspace_context_brief: compactedBrief,
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
    async workspace_context_publish(input) {
      bridgePublishCalls += 1;
      bridgePublishInput = input;
      if (bridgeScenario === "unavailable") {
        throw new Error("workspace context publish bridge unavailable");
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
      createdContextBody = replaceManagedWorkspaceContextBlock(currentManualContext, input.managed_context);
      return {
        status: "PUBLISHED",
        workspace_id: "workspace_test",
        workspace_full_name: "michaelpreuss/guild-marketing-os",
        previous_context_id: "context_old",
        draft_context_id: "context_draft",
        published_context_id: "context_published",
        summary: input.summary,
        publish_path: "host_bridge",
        rollback_reference: "Re-publish context_old to roll back.",
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

async function runPublishFlow(label, wrapInput) {
  state = undefined;
  createdContextBody = "";
  bridgePublishInput = undefined;
  bridgePublishCalls = 0;
  bridgeScenario = "successful";
  llmScenario = "successful";
  compactionCalls = 0;
  auditCalls = 0;

  const first = await foundationAgent.start({ type: "text", text: wrapInput(fixture) }, task);
  assert.equal(first.type, "output", label);
  assert.match(first.output.text, /Company Context Approval Packet/, label);
  assert.match(first.output.text, /saved_to_workspace_context: false/, label);
  assert.equal(state.lastSourceText, fixture, `${label}: source text should preserve exact fixture`);

  const approval = await foundationAgent.start({ type: "text", text: wrapInput("Context approved save to workspace context") }, task);
  assert.equal(approval.type, "output", label);
  assert.match(approval.output.text, /approved_in_session: true/, label);
  assert.match(approval.output.text, /workspace_context_status: approved_pending_publish/, label);
  assert.match(approval.output.text, /publish approved context to workspace context/, label);
  assert.equal(state.approvedSourceText, fixture, `${label}: approved source text should preserve exact fixture`);

  const publish = await foundationAgent.start({ type: "text", text: wrapInput("publish approved context to workspace context") }, task);
  assert.equal(publish.type, "output", label);
  assert.match(publish.output.text, /saved_to_workspace_context: true/, label);
  assert.match(publish.output.text, /workspace_context_id: context_published/, label);
  assert.match(publish.output.text, /workspace_context_draft_id: context_draft/, label);
  assert.match(publish.output.text, /workspace_context_previous_id: context_old/, label);
  assert.match(publish.output.text, /workspace_context_publish_path: host_bridge/, label);
  assert.equal(state.workspaceContextStatus, "published", label);
  assert.equal(state.workspaceContextId, "context_published", label);
  assert.equal(state.workspaceContextDraftId, "context_draft", label);
  assert.equal(state.workspaceContextPreviousId, "context_old", label);
  assert.equal(state.workspaceContextPublishPath, "host_bridge", label);
  assert.equal(bridgePublishCalls, 1, `${label}: should publish once through bridge`);
  assert.equal(bridgePublishInput.session_id, "session_test", label);
  assert.equal(bridgePublishInput.approval_phrase, "publish approved context to workspace context", label);
  assert.equal(bridgePublishInput.start_marker, "<!-- guild-marketing-os-context:start -->", label);
  assert.equal(bridgePublishInput.end_marker, "<!-- guild-marketing-os-context:end -->", label);
  assert.match(bridgePublishInput.managed_context, /## Workspace Context Brief/, label);
  assert.doesNotMatch(bridgePublishInput.managed_context, /This session was started/, label);
  assert.ok(!bridgePublishInput.managed_context.includes(fixture), `${label}: bridge payload must not include raw fixture`);
  assert.doesNotMatch(bridgePublishInput.managed_context, /cite/, label);
  assert.match(createdContextBody, /Keep this intro\./, label);
  assert.match(createdContextBody, /Keep this outro\./, label);
  assert.doesNotMatch(createdContextBody, /old managed block/, label);
  assert.doesNotMatch(createdContextBody, /This session was started/, label);
  assert.match(createdContextBody, /<!-- guild-marketing-os-context:start -->/, label);
  assert.match(createdContextBody, /<!-- guild-marketing-os-context:end -->/, label);
  assert.equal(state.approvedSourceText, fixture, `${label}: approved source text should remain exact in state after publish`);
  assert.ok(!createdContextBody.includes(fixture), `${label}: published managed block must not include the raw full approved source fixture`);
  assert.doesNotMatch(createdContextBody, /cite/, label);
  assert.match(createdContextBody, /## Workspace Context Brief/, label);
  assert.match(createdContextBody, /## Source Corpus Summary/, label);
  assert.match(createdContextBody, /## Compaction Audit/, label);
  assert.doesNotMatch(createdContextBody, /## Approved Source Corpus/, label);
  for (const materialFact of [
    "Webflow, Inc.",
    "2013",
    "3.5M users",
    "$335M",
    "Website Experience Platform",
    "agentic web marketing platform",
    "Analyze",
    "Optimize",
    "AEO",
    "Webflow Cloud",
    "SOC 2 Type II",
    "ISO 27001",
    "not HIPAA",
    "WordPress",
    "Framer",
    "Contentful",
    "Sitecore",
  ]) {
    assert.ok(createdContextBody.includes(materialFact), `${label}: compacted context should retain ${materialFact}`);
  }
  assert.equal(compactionCalls, 2, `${label}: publish should regenerate once after lost material facts`);
  assert.equal(auditCalls, 2, `${label}: publish should audit initial and regenerated compactions`);
}

await runPublishFlow("direct input", (text) => text);
await runPublishFlow("Guild chat envelope input", guildChatEnvelope);
await runPublishFlow("Guild chat envelope with injected managed context", guildChatEnvelopeWithManagedContext);

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

state = {
  approvedOutput: state.approvedOutput,
  approvedSourceText: fixture,
  workspaceContextStatus: "approved_pending_publish",
};
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

state = undefined;
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
assert.match(bridgeBlocked.output.text, /host-controlled publish bridge/, "bridge unavailable publish");
assert.equal(bridgePublishCalls, 1, "bridge unavailable publish should attempt the host bridge once");
assert.equal(createdContextBody, "", "bridge unavailable publish should not create a context body");
assert.equal(state.approvedSourceText, fixture, "bridge unavailable publish should retain exact approved source for retry");
bridgeScenario = "successful";

console.log("Foundation state/publish test OK.");
