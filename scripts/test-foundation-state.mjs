#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const fixturePath = path.join(
  rootDir,
  "scripts/fixtures/webflow-company-profile.md",
);
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
  isSensitiveClaim,
  normalizeBlockedClaims,
  preservesQualifiedHipaaNuance,
  replaceManagedWorkspaceContextBlock,
  sourceEvidenceLabelsAllowReuse,
} = await import(path.join(foundationDir, "dist/agent.js"));

function createTask({
  sessionId,
  workspaceReadMode = "published",
  llmText = "not json",
}) {
  let state;
  let llmCalls = 0;
  const task = {
    sessionId,
    console,
    llm: {
      async generateText() {
        llmCalls += 1;
        return { text: llmText };
      },
    },
    async save(nextState) {
      state = structuredClone(nextState);
    },
    async restore() {
      return state;
    },
    tools: {
      async guild_get_session() {
        return {
          id: sessionId,
          workspace: {
            id: "workspace_test",
            name: "marketing-os",
            full_name: "example/marketing-os",
            owner: {
              id: "owner_test",
              type: "organization",
              name: "example",
            },
          },
          session_type: "chat",
          context_id:
            workspaceReadMode === "published"
              ? "context_published"
              : null,
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
          owner: {
            id: "owner_test",
            type: "organization",
            name: "example",
          },
          context: {
            id:
              workspaceReadMode === "published"
                ? "context_published"
                : null,
            compiled: managedContext,
            generated: "",
            manual: managedContext,
          },
        };
      },
    },
  };
  return {
    task,
    readState() {
      return structuredClone(state);
    },
    llmCallCount() {
      return llmCalls;
    },
  };
}

function guildChatEnvelope(text) {
  return JSON.stringify({
    type: "text",
    text: [
      "* This session was started at 18:50:27 (24h, UTC) on Sunday, June 28, 2026.",
      "* The current Guild workspace is named `guild-marketing-os`.",
      "",
      text,
    ].join("\n"),
  });
}

{
  const harness = createTask({ sessionId: "foundation-managed-refresh" });
  const result = await foundationAgent.start(
    {
      type: "text",
      text: [
        "<!-- guild-marketing-os-context:start -->",
        "# Guild Marketing OS Managed Company Context",
        "Status: published",
        "Company: Webflow",
        "Approved description: Webflow is a website experience platform.",
        "Primary audiences: Marketers, designers, and developers.",
        "Current goals: Increase marketing velocity.",
        "Anything not approved for reuse: Unsupported performance or legal claims.",
        "## Workspace Context Brief",
        "Use this as approved company context.",
        "<!-- guild-marketing-os-context:end -->",
        "",
        "Refresh company context readiness. Do not approve or publish.",
      ].join("\n"),
    },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.match(result.output.text, /Company Context Approval Packet/);
  assert.match(result.output.text, /Company: Webflow/);
  assert.match(result.output.text, /approved_in_session: false/);
  assert.doesNotMatch(result.output.text, /attachment_unreadable/);
  assert.equal(harness.readState().lastOutput.conversationIntent, "source_available");
  assert.match(
    harness.readState().lastSourceText,
    /Guild Marketing OS Managed Company Context/,
  );
}

{
  const harness = createTask({ sessionId: "foundation-draft-approval" });
  const approvalFixture = [
    "Company name: Webflow.",
    "Approved description: Webflow is a visual website platform for teams that need to design, build, manage, and optimize web experiences.",
    "Primary audiences: marketing teams, web teams, agencies, designers, developers, and enterprise digital teams.",
    "Current goals: create approved company context and route the next Marketing OS agent.",
    "Proof-backed claims: the user-supplied source packet says Webflow combines visual site design, CMS, hosting, collaboration, optimization, AI, and extensibility features.",
    "Approved channels: website, email, social content, pitch materials, and campaign planning.",
  ].join("\n");
  const draft = await foundationAgent.start(
    { type: "text", text: approvalFixture },
    harness.task,
  );
  assert.equal(draft.type, "output");
  assert.match(draft.output.text, /Company Context Approval Packet/);
  assert.match(draft.output.text, /Company: Webflow/);
  assert.match(draft.output.text, /saved_to_workspace_context: false/);
  assert.match(draft.output.text, /saved_to_context_artifacts: true/);
  assert.match(draft.output.text, /retained in this Guild Chat/);
  assert.match(
    draft.output.text,
    /Review required — Legal Reviewer:/,
    "approval-gate lines should be explicitly qualified for the shared safety validator",
  );
  assert.match(
    draft.output.text,
    /Entity clarity: Draft entity clarity pending approved evidence\./,
    "unapproved Builder drafts should not promote model-generated entity-clarity claims",
  );
  assert.match(
    draft.output.text,
    /Recommended web inputs for review:/,
    "recommended research inputs should be visibly review-qualified",
  );
  const evidenceSection = draft.output.text
    .split("## Assumptions And Missing Evidence")[1]
    .split("## Approval Gate")[0];
  assert.equal(
    evidenceSection.match(
      /\b(?:source_supplied|connected_read_only|live_monitoring)\b/g,
    )?.length,
    1,
    "Builder should state exactly one evidence mode in the shared evidence section",
  );
  const statusJson = draft.output.text
    .split("## Status Payload")[1]
    .split("## Downstream Handoff")[0]
    .match(/```json\s*([\s\S]*?)```/i)?.[1];
  assert.ok(statusJson, "Builder should render one shared status JSON block");
  assert.equal(
    JSON.parse(statusJson).status,
    harness.readState().lastOutput.status,
    "Builder should expose its shared artifact status in Status Payload",
  );
  assert.ok(
    draft.output.text.lastIndexOf("## Downstream Handoff") >
      draft.output.text.lastIndexOf("\n## "),
    "Downstream Handoff should be the final top-level artifact section",
  );
  assert.equal(harness.readState().lastSourceText, approvalFixture);
  assert.equal(
    harness.readState().durableContextArtifactStatus,
    "draft",
  );
  assert.match(draft.output.text, /plus a draft Company Context artifact/);

  const readyState = harness.readState();
  readyState.lastOutput.status = "ready_for_review";
  readyState.lastOutput.statusPayload.readiness = "review_ready";
  readyState.lastOutput.statusPayload.blockers = [];
  readyState.durableContextArtifactStatus = "ready_for_review";
  await harness.task.save(readyState);

  const approvalText = "Context approved save to workspace context";
  const approval = await foundationAgent.start(
    { type: "text", text: approvalText },
    harness.task,
  );
  assert.equal(approval.type, "output");
  assert.match(approval.output.text, /approved_in_session: true/);
  assert.match(approval.output.text, /approved in this Guild Chat/);
  assert.match(approval.output.text, new RegExp(approvalText));
  assert.equal(harness.readState().approvedSourceText, approvalFixture);
  assert.equal(
    harness.readState().durableContextArtifactStatus,
    "approved",
  );

  const directPublish = await foundationAgent.start(
    {
      type: "text",
      text: "publish approved context to workspace context",
    },
    harness.task,
  );
  assert.equal(directPublish.type, "output");
  assert.match(
    directPublish.output.text,
    /publication belongs to the canonical Marketing OS Launcher Chat/,
  );
  assert.match(
    directPublish.output.text,
    /saved_to_workspace_context: false/,
  );
  assert.match(
    directPublish.output.text,
    /workspace_context_status: approved_pending_publish/,
  );
  assert.equal(
    harness.readState().workspaceContextStatus,
    "approved_pending_publish",
  );
}

{
  const harness = createTask({ sessionId: "foundation-envelope" });
  const first = await foundationAgent.start(
    { type: "text", text: guildChatEnvelope(fixture) },
    harness.task,
  );
  assert.equal(first.type, "output");
  assert.match(first.output.text, /Company: Webflow/);
  assert.equal(
    harness.readState().lastOutput.statusPayload.companyName,
    "Webflow",
  );
  assert.ok(harness.readState().lastSourceText.includes("# Webflow"));
}

{
  const harness = createTask({
    sessionId: "foundation-rich-prose-source",
    workspaceReadMode: "missing",
  });
  const source = [
    "Start Company Context setup using only the source document below.",
    "Produce a review-ready draft and do not publish Workspace Context.",
    "",
    "Source document: Webflow acceptance fixture",
    "",
    "Webflow, Inc. is a privately held U.S. software company founded in 2013. It provides a visual website platform combining site design, CMS, hosting, collaboration, analytics, optimization, AI, and extensibility.",
    "",
    "The company reports more than 900 team members in 25 countries. These are company-reported figures supplied for this test.",
    "",
    "Primary audiences: enterprise marketing teams, designers, developers, agencies, freelancers, and startups.",
    "Current goals: Maintain engineering governance and integration control.",
    "Proof-backed claims: Webflow provides a visual website platform.",
    "Approved channels: website and customer stories.",
    "",
    "Evidence mode: source_supplied. No live source was inspected.",
  ].join("\n");
  const result = await foundationAgent.start(
    { type: "text", text: source },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.match(result.output.text, /Company: Webflow/);
  assert.doesNotMatch(result.output.text, /Company: this test/i);
  assert.match(
    result.output.text,
    /Overview: Webflow, Inc\. is a privately held U\.S\. software company/,
  );
  assert.doesNotMatch(
    harness.readState().lastOutput.consumedContext.missing.join(", "),
    /Approved description/,
  );
}

{
  const harness = createTask({
    sessionId: "foundation-incomplete-sensitive-source",
    workspaceReadMode: "missing",
  });
  const source = [
    "Start Company Context setup using only the source document below.",
    "Source document: Webflow acceptance fixture",
    "",
    "Webflow, Inc. provides a visual website platform. Its current positioning includes Website Experience Platform and agentic web marketing platform.",
    "Primary audiences include enterprise marketing teams, designers, developers, agencies, freelancers, and startups.",
    "The company reports more than 900 team members in 25 countries and 3.5 million users.",
    "The supplied source states that Webflow is audited for SOC 2 Type II and certified to ISO 27001.",
    "Webflow may not be HIPAA compliant, so protected health information must not be provided through the platform.",
    "Treat scale, trust, compliance, pricing, and performance claims as source-supplied and review-required.",
    "Evidence mode: source_supplied. No live source was inspected.",
  ].join("\n");
  const draft = await foundationAgent.start(
    { type: "text", text: source },
    harness.task,
  );
  assert.equal(draft.type, "output");
  assert.equal(harness.readState().lastOutput.status, "needs_input");
  assert.equal(harness.readState().durableContextArtifactStatus, "draft");
  assert.match(draft.output.text, /plus a draft Company Context artifact/);
  assert.doesNotMatch(
    draft.output.text,
    /plus review-ready Company Context artifact/,
  );
  assert.equal(
    harness.readState().lastOutput.approvedFacts.some((claim) =>
      /agentic web marketing platform/i.test(claim.claim)
    ),
    false,
    "guarded positioning must not remain in reusable facts before approval",
  );
  assert.doesNotMatch(
    draft.output.text,
    /\b(?:lack(?:s|ing)?(?: of)?|without|no) HIPAA compliance\b|\b(?:is|are|remains?|claims? to be|certified as) HIPAA compliant\b|\bnot HIPAA compliant\b|\bHIPAA[- ]noncompliant\b/i,
    "Builder must not strengthen a qualified HIPAA caveat even inside blocked claims",
  );
  const blockedActionKeys =
    harness.readState().lastOutput.contextArtifacts.channelRegistry.blockedActions
      .map((value) =>
        value.toLowerCase().replace(/^no\s+/, "").replace(/[.!?]+$/, "").replace(/\s+/g, " ")
      );
  assert.equal(
    new Set(blockedActionKeys).size,
    blockedActionKeys.length,
    "blocked actions should not repeat because of punctuation, casing, or a leading No variant",
  );

  const unsafeGeneratedOutput = structuredClone(harness.readState().lastOutput);
  unsafeGeneratedOutput.approvalGates.unshift({
    ownerRole: "Marketing Compliance Officer",
    decision:
      "Approve pricing claims and lack of HIPAA compatibility warning before reuse.",
    requiredBefore: "Downstream draft creation.",
    status: "needed",
  });
  unsafeGeneratedOutput.contextArtifacts.channelRegistry.blockedActions.push(
    "live publishing",
    "scheduling",
    "paid media spend",
    "CRM activation",
    "credential setup",
    "External CRM activation",
    "Direct scheduling of social or paid media",
  );
  const hardenedHarness = createTask({
    sessionId: "foundation-hardened-generated-output",
    workspaceReadMode: "missing",
    llmText: JSON.stringify(unsafeGeneratedOutput),
  });
  const hardenedDraft = await foundationAgent.start(
    { type: "text", text: source },
    hardenedHarness.task,
  );
  assert.equal(hardenedDraft.type, "output");
  assert.doesNotMatch(
    hardenedDraft.output.text,
    /lack of HIPAA compatibility/i,
    "Builder must remove over-strengthened HIPAA wording from generated approval gates",
  );
  const hardenedBlockedActionKeys =
    hardenedHarness.readState().lastOutput.contextArtifacts.channelRegistry.blockedActions
      .map((value) =>
        value.toLowerCase().replace(/^no\s+/, "").replace(/[.!?]+$/, "").replace(/\s+/g, " ")
      );
  assert.equal(
    new Set(hardenedBlockedActionKeys).size,
    hardenedBlockedActionKeys.length,
    "Builder must collapse affirmative and leading-No forms of the same blocked action",
  );
  assert.doesNotMatch(
    hardenedDraft.output.text,
    /External CRM activation|Direct scheduling of social or paid media/i,
    "Builder must collapse paraphrases already covered by the canonical blocked-action categories",
  );

  const prematureApproval = await foundationAgent.start(
    { type: "text", text: "Context approved save to workspace context" },
    harness.task,
  );
  assert.equal(prematureApproval.type, "output");
  assert.match(
    prematureApproval.output.text,
    /still a draft and cannot be approved/,
  );
  assert.match(prematureApproval.output.text, /approved_in_session: false/);
  assert.equal(harness.readState().durableContextArtifactStatus, "draft");
}

{
  const harness = createTask({
    sessionId: "foundation-downstream",
    workspaceReadMode: "published",
  });
  const result = await foundationAgent.start(
    {
      type: "text",
      text: "Create a messaging framework from our approved workspace context.",
    },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.match(result.output.text, /Company Context Builder is context-only/);
  assert.match(
    result.output.text,
    /Continue through Marketing OS Launcher or @mention Messaging/,
  );
  assert.match(result.output.text, /context_published/);
  assert.doesNotMatch(result.output.text, /# Company Context Approval Packet/);
  assert.equal(harness.llmCallCount(), 0);
}

{
  const harness = createTask({
    sessionId: "foundation-downstream-missing",
    workspaceReadMode: "missing",
  });
  const result = await foundationAgent.start(
    {
      type: "text",
      text: "Create a messaging framework for the company in this workspace.",
    },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.match(result.output.text, /Company context is not approved yet/);
  assert.match(result.output.text, /Company: TBD/);
  assert.doesNotMatch(
    result.output.text,
    /Company: Create a messaging framework/,
  );
}

{
  const current = [
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
  const replacement = [
    "<!-- guild-marketing-os-context:start -->",
    "new managed block",
    "<!-- guild-marketing-os-context:end -->",
  ].join("\n");
  const merged = replaceManagedWorkspaceContextBlock(current, replacement);
  assert.match(merged, /Keep this intro/);
  assert.match(merged, /Keep this outro/);
  assert.match(merged, /new managed block/);
  assert.doesNotMatch(merged, /old managed block/);
}

assert.equal(
  stripCitationMarkers("A citeturn1 B"),
  "A  B",
  "citation markers should be stripped",
);
assert.equal(
  removeFencedBlocks("Keep\n```mermaid\ngraph TD\n```\nDone"),
  "Keep\n\nDone",
  "fenced diagram blocks should be removed",
);
assert.equal(
  convertMarkdownTablesToBullets(
    "| Name | Evidence |\n|---|---|\n| Webflow | citeturn1 |\n",
  ).trim(),
  "- Name: Webflow",
);
const cleanedFixture = cleanApprovedSourceForWorkspaceContext(fixture);
assert.doesNotMatch(cleanedFixture, /cite/);
assert.doesNotMatch(cleanedFixture, /```mermaid/);
assert.doesNotMatch(cleanedFixture, /```text/);
assert.match(
  cleanedFixture,
  /- Attribute: Legal entity; Current finding: Webflow, Inc\./,
);
const compressedContext = fs.readFileSync(
  path.join(rootDir, "scripts/fixtures/context-benchmark/compressed.md"),
  "utf8",
);
assert.equal(
  sourceEvidenceLabelsAllowReuse("Company name: Webflow", compressedContext),
  true,
);
assert.equal(
  preservesQualifiedHipaaNuance(
    "Webflow may not be HIPAA compliant, so Protected Health Information must not be provided through the platform.",
    "Webflow may not be HIPAA compliant.",
  ),
  true,
);
for (const strengthenedClaim of [
  "Webflow is HIPAA compliant.",
  "Webflow is explicitly not HIPAA compliant.",
  "Key constraints include lack of HIPAA compliance.",
  "Review the lack of HIPAA compatibility warning.",
  "Protected Health Information is prohibited (not HIPAA compliant).",
  "Webflow is HIPAA-noncompliant.",
  "Webflow is HIPAA-incompatible.",
]) {
  assert.equal(
    preservesQualifiedHipaaNuance(
      strengthenedClaim,
      "Webflow may not be HIPAA compliant.",
    ),
    false,
    `qualified HIPAA source wording must reject: ${strengthenedClaim}`,
  );
}
assert.equal(
  sourceEvidenceLabelsAllowReuse(
    "Wave achieved a 3x speed improvement and a 4% to 21% organic traffic increase.",
    compressedContext,
  ),
  false,
);
assert.equal(
  sourceEvidenceLabelsAllowReuse("Current CEO: Linda Tong", compressedContext),
  false,
);
assert.equal(isSensitiveClaim("Wave achieved a 3x improvement."), true);
assert.equal(isSensitiveClaim("Organic traffic increased by 4%."), true);
assert.deepEqual(
  normalizeBlockedClaims([
    {
      claim: "Webflow has $200 million ARR.",
      status: "user_supplied",
    },
  ]),
  [
    {
      claim: "Webflow has $200 million ARR.",
      status: "blocked",
      source: "sensitive_claim_guardrail",
      notes:
        "The claim is in the blocked-claims collection and cannot be reused without separate evidence and owner approval.",
    },
  ],
);

console.log(
  "Foundation Guild Chat state, approval, Launcher publication handoff, context readiness, and routing tests OK.",
);
