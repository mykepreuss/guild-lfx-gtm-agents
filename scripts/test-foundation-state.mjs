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
  const harness = createTask({
    sessionId: "foundation-url-reference-with-launcher-contract",
    workspaceReadMode: "missing",
  });
  const result = await foundationAgent.start(
    {
      type: "text",
      text: [
        "Set up Marketing OS for Guild. Our website is https://guild.ai/",
        "",
        "Launcher contract:",
        "- Consume published workspace context revision unavailable as the first source of truth.",
        "- Return the complete standard Guild Marketing OS output frame.",
        "- Keep action_mode draft_only and external_mutation_requested false.",
      ].join("\n"),
    },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.equal(harness.llmCallCount(), 0);
  assert.match(result.output.text, /Conversation intent: missing_context/);
  assert.match(result.output.text, /"status": "needs_input"/);
  assert.match(result.output.text, /Company: Guild/);
  assert.match(result.output.text, /supplied URL was recorded as a reference/i);
  assert.match(result.output.text, /built-in LLM has no web access/i);
  assert.match(result.output.text, /I cannot open that URL in this version/i);
  assert.doesNotMatch(result.output.text, /publish approved context to workspace context/i);
  assert.doesNotMatch(result.output.text, /Channels TBD: Website/i);
  assert.doesNotMatch(result.output.text, /Requires approved company description and proof-backed claims/i);
  const openQuestions = result.output.text
    .split("### Open Questions")[1]
    .split("## Approval Gate")[0]
    .split("\n")
    .filter((line) => /^- .*\?$/.test(line.trim()));
  assert.equal(openQuestions.length, 3);
}

{
  const harness = createTask({
    sessionId: "foundation-governance-audience-baseline",
    workspaceReadMode: "missing",
  });
  const result = await foundationAgent.start(
    {
      type: "text",
      text: [
        "Company name: Guild",
        "Approved description: Guild provides a platform for creating and discovering AI agents.",
        "Primary audiences: AI leaders, AI platform leaders, developer relations teams, and governance/security stakeholders.",
        "Current marketing goal: improve agent discovery and keep AI-spend governance clear.",
        "Channels in scope: website, email, organic social, and presentations.",
      ].join("\n"),
    },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.equal(harness.readState().lastOutput.status, "ready_for_review");
  assert.equal(
    harness.readState().lastOutput.claimsNeedingApproval.some(
      (claim) => claim.source === "sensitive_claim_guardrail",
    ),
    false,
    "audience roles and marketing goals must not be mistaken for factual security or spend claims",
  );
  assert.match(result.output.text, /Company: Guild/);
  assert.doesNotMatch(result.output.text, /Evidence-led, precise, and review-oriented/);
}

{
  const harness = createTask({
    sessionId: "foundation-single-paragraph-cmo-baseline",
    workspaceReadMode: "missing",
  });
  const result = await foundationAgent.start(
    {
      type: "text",
      text: "Approved company description: Guild provides a platform for creating and discovering AI agents. Primary audiences: AI leaders, AI platform leaders, developer relations teams, and governance/security stakeholders; treat these as hypotheses for review. Current marketing goal: improve agent discovery and grow agent-driven traffic while keeping AI-spend governance clear. Approved draft channels: website, LinkedIn, and sales enablement.",
    },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.equal(harness.readState().lastOutput.status, "ready_for_review");
  assert.equal(
    harness.readState().lastOutput.claimsNeedingApproval.some(
      (claim) => claim.source === "sensitive_claim_guardrail",
    ),
    false,
    "a natural one-paragraph baseline must not route audience and goal text through the sensitive-claim fallback",
  );
  assert.deepEqual(
    harness.readState().lastOutput.contextArtifacts.companyContext.primaryAudiences,
    [
      "AI leaders",
      "AI platform leaders",
      "developer relations teams",
      "governance/security stakeholders",
    ],
  );
  assert.match(result.output.text, /Company: Guild/);
  assert.match(result.output.text, /website/);
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
  const harness = createTask({ sessionId: "foundation-explicit-source-overrides-managed-context" });
  const result = await foundationAgent.start(
    {
      type: "text",
      text: [
        "<!-- guild-marketing-os-context:start -->",
        "# Guild Marketing OS Managed Company Context",
        "Status: published",
        "Company: Webflow",
        "Approved description: Webflow is a website experience platform.",
        "<!-- guild-marketing-os-context:end -->",
        "",
        "Company name: Acme Cloud",
        "Approved description: Acme Cloud helps platform teams review operational readiness.",
        "Primary audiences: platform leaders and developer relations leads.",
        "Current goals: create company context and prepare messaging.",
        "Proof-backed claims: Acme Cloud is SOC 2 compliant; Acme Cloud improves performance by 300%; Acme Cloud has public pricing approval.",
        "Channels in scope: website and email.",
      ].join("\n"),
    },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.match(result.output.text, /Company: Acme Cloud/);
  assert.doesNotMatch(result.output.text, /Company: Webflow/);
  assert.match(result.output.text, /SOC 2 compliant/);
  assert.match(result.output.text, /performance by 300%/);
  assert.match(result.output.text, /public pricing approval/);
  assert.match(result.output.text, /sensitive_claim_guardrail/);
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
    /Review required — Company Context Owner:/,
    "a complete baseline should require company-context owner review",
  );
  assert.match(
    draft.output.text,
    /Entity clarity: The approved company description can serve as the baseline entity summary\./,
    "a user-supplied approved description should provide draft entity clarity",
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
    "ready_for_review",
  );
  assert.match(draft.output.text, /plus review-ready Company Context artifact/);

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
    sessionId: "foundation-marketer-baseline",
    workspaceReadMode: "missing",
  });
  const source = [
    "Set up Marketing OS for Webflow.",
    "",
    "Company description:",
    "Webflow is a visual website platform that helps marketing, design, and development teams build and manage websites together.",
    "",
    "Primary audiences:",
    "Enterprise marketing leaders, web teams, designers, developers, and digital agencies.",
    "",
    "Current marketing goal:",
    "Help enterprise teams launch and improve web experiences faster while keeping brand and engineering governance.",
    "",
    "Approved claims:",
    "Webflow combines visual site design, CMS, hosting, collaboration, analytics, optimization, AI, and extensibility.",
    "The platform serves marketing teams, designers, developers, agencies, freelancers, and startups.",
    "",
    "Channels in scope:",
    "Website, blog, customer stories, email, organic social, presentations, and campaign planning.",
    "",
    "Important constraints:",
    "Do not invent customer results, pricing, security, compliance, or performance claims. Keep unknown facts as TBD.",
    "",
    "Keep everything draft-only.",
  ].join("\n");
  const result = await foundationAgent.start(
    { type: "text", text: source },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.equal(harness.readState().lastOutput.status, "ready_for_review");
  assert.equal(
    harness.readState().lastOutput.statusPayload.readiness,
    "review_ready",
  );
  assert.equal(
    harness.readState().durableContextArtifactStatus,
    "ready_for_review",
  );
  assert.deepEqual(
    harness.readState().lastOutput.contextArtifacts.companyContext.goals,
    [
      "Help enterprise teams launch and improve web experiences faster while keeping brand and engineering governance",
    ],
    "a marketing goal should remain an intention rather than becoming a blocked performance claim",
  );
  assert.equal(
    harness.readState().lastOutput.contextArtifacts.proofAndConstraints
      .approvedClaims.some((claim) =>
        /combines visual site design, CMS, hosting/i.test(claim.claim)
      ),
    true,
    "explicitly labeled approved claims should be retained for artifact review",
  );
  assert.equal(
    harness.readState().lastOutput.claimsNeedingApproval.length,
    0,
    "unknown-proof constraints should remain constraints rather than blocked claims",
  );
  assert.match(result.output.text, /"status": "ready_for_review"/);
  assert.match(
    result.output.text,
    /Current marketing goal: Help enterprise teams launch and improve web experiences faster/,
  );
  assert.match(
    result.output.text,
    /Important constraints: Do not invent customer results, pricing, security, compliance, or performance claims/,
  );
  assert.match(
    result.output.text,
    /Approve this baseline company description, audiences, goal, reusable claims, channels, and constraints/,
  );
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
    sessionId: "foundation-marketer-sensitive-claim",
    workspaceReadMode: "missing",
  });
  const source = [
    "Set up Marketing OS for Example Co.",
    "Company description: Example Co is a website platform.",
    "Primary audiences: marketing teams and web teams.",
    "Current marketing goal: create a useful launch plan.",
    "Approved claims: Example Co guarantees 99.99% uptime.",
    "Channels in scope: website, email, and presentations.",
    "Important constraints: Keep unknown facts as TBD.",
  ].join("\n");
  await foundationAgent.start(
    { type: "text", text: source },
    harness.task,
  );
  assert.notEqual(
    harness.readState().lastOutput.status,
    "ready_for_review",
    "progressive disclosure must not bypass review for a sensitive unsupported claim",
  );
  assert.equal(
    harness.readState().lastOutput.claimsNeedingApproval.some((claim) =>
      /99\.99% uptime/i.test(claim.claim)
    ),
    true,
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

  const resumeHarness = createTask({
    sessionId: "foundation-focused-resume",
    workspaceReadMode: "missing",
  });
  const resumedDraft = await foundationAgent.start(
    {
      type: "text",
      text: [
        source,
        "## Focused resume input",
        "Resume Company Context artifact revision 1 using the source and draft already retained in this Marketing OS cockpit.",
        "Do not ask me to repaste the original source.",
        "",
        "Approved channels: website, blog, customer stories, email, and organic social.",
        "",
        "Approved company description: Webflow provides a visual website platform combining site design, CMS, hosting, collaboration, analytics, optimization, AI, and extensibility for enterprise marketing teams, designers, developers, agencies, freelancers, and startups.",
        "",
        "Proof-backed claims approved for reusable context after this customer review:",
        "- The platform includes site design, CMS, hosting, collaboration, analytics, optimization, AI, and extensibility.",
        "- The approved primary audiences are enterprise marketing teams, designers, developers, agencies, freelancers, and startups.",
        "",
        "Goals: Help enterprise marketing and creative teams build and optimize web experiences while engineering retains governance and integration control.",
        "",
        "Do not approve any other facts from revision 1. Keep every remaining withheld claim and existing do-not-use qualification unchanged, including the exact qualified HIPAA/PHI wording from the supplied source. Keep evidence mode source_supplied and everything draft-only. Do not publish Workspace Context or perform any external action.",
      ].join("\n\n"),
    },
    resumeHarness.task,
  );
  assert.equal(resumedDraft.type, "output");
  assert.equal(
    resumeHarness.readState().lastOutput.conversationIntent,
    "source_available",
    "focused Company Context resume must take precedence over nearby social/channel language",
  );
  assert.notEqual(
    resumeHarness.readState().lastOutput.status,
    "blocked",
    "focused Company Context resume must remain in the context workflow",
  );
  assert.doesNotMatch(
    resumedDraft.output.text,
    /Requested downstream goal: Social Monitoring And Content/,
  );
  assert.ok(
    resumeHarness.readState().lastOutput.approvedFacts.some((claim) =>
      /Webflow provides a visual website platform combining site design, CMS, hosting, collaboration, analytics, optimization, AI, and extensibility/i.test(
        claim.claim,
      )
    ),
    "focused resume must retain the explicitly approved company description",
  );
  assert.ok(
    resumeHarness.readState().lastOutput.proofBackedClaims.some((claim) =>
      /The platform includes site design, CMS, hosting, collaboration, analytics, optimization, AI, and extensibility/i.test(
        claim.claim,
      )
    ),
    "focused resume must import multiline proof-backed claims",
  );
  assert.match(
    resumedDraft.output.text,
    /Webflow may not be HIPAA compliant/i,
    "focused resume must preserve the exact qualified HIPAA wording from the retained source",
  );
  assert.doesNotMatch(
    resumedDraft.output.text,
    /Webflow (?:is|is not) HIPAA compliant|lack of HIPAA compatibility|non[- ]HIPAA compliance/i,
    "focused resume must not strengthen or invert the qualified HIPAA wording",
  );
  assert.match(
    resumedDraft.output.text,
    /Blocked: .*Webflow may not be HIPAA compliant/i,
    "withheld claims must carry their qualification at the beginning of the rendered line",
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
  const harness = createTask({
    sessionId: "foundation-downstream-named-company",
    workspaceReadMode: "missing",
  });
  const result = await foundationAgent.start(
    {
      type: "text",
      text: "Create a campaign for Webflow.",
    },
    harness.task,
  );
  assert.equal(result.type, "output");
  assert.match(result.output.text, /downstream_request_without_context/);
  assert.match(result.output.text, /Company: Webflow/);
  assert.match(result.output.text, /Campaigns And Paid Media/);
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
